const Cart = require("../models/CartSchema");
const Product = require("../models/productSchema");
const Category = require("../models/categorySchema");
const Offer = require("../models/offerSchema");
const Coupon = require("../models/CouponSchema");
const { CART_MESSAGES, COUPON_MESSAGES, ORDER_MESSAGES } = require("../constants/messages");

const COD_MAX_ITEM_PRICE = 1000;

const isOfferActive = (offer, now = new Date()) =>
  Boolean(offer) &&
  offer.isActive === true &&
  new Date(offer.startDate) <= now &&
  new Date(offer.endDate) >= now;

const findActiveOfferPercent = async (offerId) => {
  if (!offerId) return 0;
  const offer = await Offer.findById(offerId);
  return isOfferActive(offer) ? offer.discountPercent : 0;
};

// Best active offer for a product: its own offer or its category's offer.
const bestOfferPercent = async (product) => {
  const productPercent = await findActiveOfferPercent(product.offerId);
  const category = product.categoryId ? await Category.findById(product.categoryId) : null;
  const categoryPercent = await findActiveOfferPercent(category?.offerId);
  return Math.max(productPercent, categoryPercent);
};

const priceCartForCheckout = async ({ userId, couponCode }) => {
  const cart = await Cart.findOne({ userId });
  if (!cart || cart.items.length === 0) {
    return { error: ORDER_MESSAGES.CART_EMPTY };
  }

  const items = [];
  let totalAmount = 0;
  let codAllowed = true;

  for (const cartItem of cart.items) {
    const product = await Product.findById(cartItem.productId);
    if (!product || product.status !== "active") {
      return { error: CART_MESSAGES.PRODUCT_UNAVAILABLE };
    }
    const variant = product.variants.find(
      (v) => v._id.toString() === String(cartItem.variantId),
    );
    if (!variant) {
      return { error: CART_MESSAGES.VARIANT_NOT_FOUND };
    }
    const quantity = Number(cartItem.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { error: CART_MESSAGES.INVALID_QUANTITY };
    }
    if ((variant.availableQuantity || 0) < quantity) {
      return { error: ORDER_MESSAGES.insufficientStockForProduct(product.title) };
    }

    const originalPrice = Number(variant.price ?? product.price);
    const percent = await bestOfferPercent(product);
    const unitPrice = originalPrice - originalPrice * (percent / 100);
    totalAmount += unitPrice * quantity;
    if (originalPrice > COD_MAX_ITEM_PRICE) codAllowed = false;

    const attributes = (variant.attributes || []).map((attr) => ({
      name: attr.name,
      value: attr.value,
    }));
    items.push({
      productId: product._id,
      variantId: variant._id.toString(),
      name: product.title,
      quantity,
      // Stored line price keeps its existing meaning: the variant's price.
      price: originalPrice,
      variant: {
        name: `${product.title} - ${attributes.map((attr) => attr.value).join(" ")}`,
        price: originalPrice,
        attributes,
      },
    });
  }

  let coupon = null;
  let discountAmount = 0;
  if (couponCode !== undefined && couponCode !== null && couponCode !== "") {
    if (typeof couponCode !== "string" || !couponCode.trim()) {
      return { error: COUPON_MESSAGES.INVALID_CODE };
    }
    const appliedCoupon = await Coupon.findOne({
      name: couponCode,
      isListed: "active",
      expireOn: { $gt: new Date() },
    });
    if (!appliedCoupon) {
      return { error: COUPON_MESSAGES.INVALID_OR_EXPIRED };
    }
    if (totalAmount < (appliedCoupon.minimumPrice || 0)) {
      return { error: COUPON_MESSAGES.minimumPurchaseRequired(appliedCoupon.minimumPrice) };
    }
    discountAmount =
      appliedCoupon.CouponType === "percentage"
        ? (totalAmount * appliedCoupon.offerPrice) / 100
        : appliedCoupon.offerPrice;
    discountAmount = Math.min(Math.max(discountAmount, 0), totalAmount);
    coupon = {
      couponId: appliedCoupon._id,
      code: appliedCoupon.name,
      discountType: appliedCoupon.CouponType,
      discountAmount,
    };
  }

  return {
    items,
    totalAmount,
    discountAmount,
    coupon,
    finalAmount: Math.max(totalAmount - discountAmount, 0),
    codAllowed,
  };
};

// Razorpay amounts are in paise.
const toPaise = (rupees) => Math.round(Number(rupees) * 100);

module.exports = { priceCartForCheckout, isOfferActive, toPaise, COD_MAX_ITEM_PRICE };
