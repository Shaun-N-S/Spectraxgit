const mongoose = require("mongoose");
const Order = require("../models/orderSchema");
const User = require("../models/userModel");
const Product = require("../models/productSchema");
const Cart = require("../models/CartSchema");
const Coupon = require("../models/CouponSchema");
const razorpay = require("../config/razorpayConfig");
const Razorpay = require("razorpay"); // class itself, for the static validateWebhookSignature utility (B5)
const Wallet = require("../models/walletSchema");
const crypto = require("crypto");
const { HTTP_STATUS } = require("../constants/httpStatus");
const {
  COMMON_MESSAGES,
  COUPON_MESSAGES,
  ORDER_MESSAGES,
  RETURN_MESSAGES,
  PAYMENT_MESSAGES,
  WALLET_MESSAGES,
} = require("../constants/messages");

const validateOrderProducts = (products) => {
  if (!Array.isArray(products) || products.length === 0) {
    return ORDER_MESSAGES.PRODUCTS_REQUIRED;
  }

  for (const item of products) {
    if (!item || typeof item !== "object") {
      return ORDER_MESSAGES.INVALID_PRODUCT_ITEM;
    }
    if (!item.productId) {
      return ORDER_MESSAGES.PRODUCT_ID_REQUIRED;
    }
    if (!item.variantId) {
      return ORDER_MESSAGES.VARIANT_ID_REQUIRED;
    }
    if (
      item.quantity === undefined ||
      item.quantity === null ||
      isNaN(item.quantity) ||
      Number(item.quantity) <= 0
    ) {
      return ORDER_MESSAGES.INVALID_QUANTITY;
    }
    if (!item.variant || typeof item.variant !== "object") {
      return ORDER_MESSAGES.VARIANT_DETAILS_REQUIRED;
    }
    if (
      item.variant.price === undefined ||
      item.variant.price === null ||
      isNaN(item.variant.price) ||
      Number(item.variant.price) < 0
    ) {
      return ORDER_MESSAGES.INVALID_VARIANT_PRICE;
    }

    item.quantity = Number(item.quantity);
    item.variant.price = Number(item.variant.price);
  }

  return null;
};

const reserveStockForItems = async (products, session = null) => {
  const reservedItems = [];

  for (const item of products) {
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: item.productId,
        variants: {
          $elemMatch: {
            _id: item.variantId,
            availableQuantity: { $gte: item.quantity },
          },
        },
      },
      {
        $inc: { "variants.$.availableQuantity": -item.quantity },
      },
      { session },
    );

    if (!updatedProduct) {
      // Roll back any items already reserved before this failure
      await Promise.all(
        reservedItems.map((reserved) =>
          Product.findOneAndUpdate(
            { _id: reserved.productId, "variants._id": reserved.variantId },
            { $inc: { "variants.$.availableQuantity": reserved.quantity } },
            { session },
          ),
        ),
      );
      return ORDER_MESSAGES.insufficientStockForProduct(item.name);
    }

    reservedItems.push(item);
  }

  return null;
};

const releaseStockForItems = async (products, session = null) => {
  await Promise.all(
    products.map((item) =>
      Product.findOneAndUpdate(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.availableQuantity": item.quantity } },
        { session },
      ),
    ),
  );
};

const markRazorpayPaymentCompleted = async (
  razorpayOrderId,
  paymentId,
  signature,
) => {
  const order = await Order.findOne({ "razorpay.orderId": razorpayOrderId });

  if (!order) {
    return null;
  }

  if (
    order.paymentStatus === "Completed" &&
    order.razorpay?.paymentId === paymentId
  ) {
    return order;
  }

  order.razorpay.paymentId = paymentId;
  order.razorpay.signature = signature;
  order.paymentStatus = "Completed";
  await order.save();

  return order;
};

const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body;

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: PAYMENT_MESSAGES.INITIALIZATION_FAILED,
    });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: PAYMENT_MESSAGES.VERIFICATION_FAILED,
      });
    }

    await markRazorpayPaymentCompleted(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: PAYMENT_MESSAGES.VERIFIED,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: PAYMENT_MESSAGES.VERIFICATION_FAILED,
    });
  }
};

const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.body; // Buffer, from express.raw() on this route only

    if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
      // No signature header, or the server isn't configured with a
      // webhook secret — never process, never leak why to the caller.
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ status: "invalid" });
    }

    const isAuthentic = Razorpay.validateWebhookSignature(
      rawBody.toString(),
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET,
    );

    if (!isAuthentic) {
      console.error("Razorpay webhook: signature verification failed");
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ status: "invalid signature" });
    }

    const event = JSON.parse(rawBody.toString());

    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      const razorpayOrderId = payment?.order_id;
      const paymentId = payment?.id;

      if (razorpayOrderId && paymentId) {
        const order = await markRazorpayPaymentCompleted(
          razorpayOrderId,
          paymentId,
          null,
        );

        if (!order) {
          console.error(
            `Razorpay webhook: payment.captured for order ${razorpayOrderId} (payment ${paymentId}) has no matching Order document yet.`,
          );
        }
      }
    }

    return res.status(HTTP_STATUS.OK).json({ status: "ok" });
  } catch (error) {
    console.error("Razorpay webhook processing error:", error.message);
    return res.status(HTTP_STATUS.OK).json({ status: "error acknowledged" });
  }
};

const placeOrder = async (req, res) => {
  let session;
  let newOrder = null;
  let businessError = null;

  try {
    session = await mongoose.startSession();

    const userId = req.user.id;
    const {
      products,
      shippingAddress,
      paymentMethod,
      couponCode,
      totalAmount,
      finalAmount,
      razorpayOrderId,
      status,
    } = req.body;

    if (!products || !products.length || !shippingAddress || !paymentMethod) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: COMMON_MESSAGES.ALL_FIELDS_REQUIRED_WITH_PERIOD });
    }

    const productValidationError = validateOrderProducts(products);
    if (productValidationError) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: productValidationError });
    }

    let appliedCoupon = null;
    let discountAmount = 0;

    if (couponCode) {
      if (typeof couponCode !== "string" || !couponCode.trim()) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json({ message: COUPON_MESSAGES.INVALID_CODE });
      }

      appliedCoupon = await Coupon.findOne({
        name: couponCode,
        isListed: "active",
        expireOn: { $gt: new Date() },
      });

      if (appliedCoupon) {
        if (appliedCoupon.CouponType === "percentage") {
          discountAmount = (totalAmount * appliedCoupon.offerPrice) / 100;
        } else {
          discountAmount = appliedCoupon.offerPrice;
        }
        discountAmount = Math.min(discountAmount, totalAmount);
      }
    }

    const isPaymentFailedOrder = status === "Payment Failed";

    await session.withTransaction(async () => {
      if (!isPaymentFailedOrder) {
        const stockError = await reserveStockForItems(products, session);
        if (stockError) {
          businessError = stockError;
          throw new Error(stockError);
        }
      }

      const orderData = {
        userId,
        products: products.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          quantity: item.quantity,
          price: item.variant.price,
          variant: item.variant,
        })),
        shippingAddress,
        paymentMethod,
        totalAmount,
        coupon: appliedCoupon
          ? {
              couponId: appliedCoupon._id,
              code: appliedCoupon.name,
              discountType: appliedCoupon.CouponType,
              discountAmount: discountAmount,
            }
          : null,
        discountAmount,
        finalAmount: finalAmount || totalAmount - discountAmount,
        orderDate: new Date(),
        orderStatus: isPaymentFailedOrder ? "Payment Failed" : "Processing",
        paymentStatus: isPaymentFailedOrder
          ? "Failed"
          : paymentMethod === "RazorpayX"
            ? "Completed"
            : "Pending",
      };

      if (paymentMethod === "RazorpayX" && razorpayOrderId) {
        orderData.razorpay = {
          orderId: razorpayOrderId,
        };
      }

      newOrder = new Order(orderData);
      await newOrder.save({ session });

      // Clear cart for successful orders (stock was already reserved above)
      if (!isPaymentFailedOrder) {
        await Cart.findOneAndUpdate(
          { userId: userId },
          { $set: { items: [] } },
          { session },
        );
      }
    });

    return res.status(HTTP_STATUS.CREATED).json({
      message: isPaymentFailedOrder
        ? ORDER_MESSAGES.CREATED_WITH_PAYMENT_FAILURE
        : ORDER_MESSAGES.PLACED,
      order: newOrder,
    });
  } catch (error) {
    if (businessError) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: businessError });
    }
    console.error("Error placing order:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ORDER_MESSAGES.PLACE_FAILED,
      error: error.message,
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

const placeWalletOrder = async (req, res) => {
  let session;
  let newOrder = null;
  let businessError = null;

  try {
    session = await mongoose.startSession();

    const userId = req.user.id;
    const { products, shippingAddress, couponCode, totalAmount, finalAmount } =
      req.body;

    if (!products || !products.length || !shippingAddress) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: COMMON_MESSAGES.ALL_FIELDS_REQUIRED_WITH_PERIOD });
    }

    const productValidationError = validateOrderProducts(products);
    if (productValidationError) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: productValidationError });
    }

    let appliedCoupon = null;
    let discountAmount = 0;

    if (couponCode) {
      if (typeof couponCode !== "string" || !couponCode.trim()) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json({ message: COUPON_MESSAGES.INVALID_CODE });
      }

      appliedCoupon = await Coupon.findOne({
        name: couponCode,
        isListed: "active",
        expireOn: { $gt: new Date() },
      });

      if (appliedCoupon) {
        discountAmount =
          appliedCoupon.CouponType === "percentage"
            ? (totalAmount * appliedCoupon.offerPrice) / 100
            : appliedCoupon.offerPrice;
        discountAmount = Math.min(discountAmount, totalAmount);
      }
    }

    await session.withTransaction(async () => {
      const stockError = await reserveStockForItems(products, session);
      if (stockError) {
        businessError = stockError;
        throw new Error(stockError);
      }

      const updatedWallet = await Wallet.findOneAndUpdate(
        { userId, balance: { $gte: finalAmount } },
        {
          $inc: { balance: -finalAmount },
          $push: {
            transactions: {
              transaction_id: new mongoose.Types.ObjectId().toString(),
              type: "wallet",
              amount: finalAmount,
              description: "Order payment using wallet",
              status: "completed",
            },
          },
        },
        { new: true, session },
      );

      if (!updatedWallet) {
        businessError = WALLET_MESSAGES.INSUFFICIENT_BALANCE;
        throw new Error(businessError);
      }

      // Create order
      const orderData = {
        userId,
        products: products.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          quantity: item.quantity,
          price: item.variant.price,
          variant: item.variant,
        })),
        shippingAddress,
        paymentMethod: "Wallet",
        totalAmount,
        coupon: appliedCoupon
          ? {
              couponId: appliedCoupon._id,
              code: appliedCoupon.name,
              discountType: appliedCoupon.CouponType,
              discountAmount: discountAmount,
            }
          : null,
        discountAmount,
        finalAmount: finalAmount || totalAmount - discountAmount,
        orderDate: new Date(),
        orderStatus: "Processing",
        paymentStatus: "Completed",
      };

      newOrder = new Order(orderData);
      await newOrder.save({ session });

      // Clear cart
      await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: [] } },
        { session },
      );
    });

    return res.status(HTTP_STATUS.CREATED).json({
      message: ORDER_MESSAGES.PLACED_WITH_WALLET,
      orderId: newOrder._id,
    });
  } catch (error) {
    if (businessError) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: businessError });
    }
    console.error("Error placing order with wallet payment:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: ORDER_MESSAGES.PLACE_FAILED, error: error.message });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

const fetchOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("User ID:", userId);

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: COMMON_MESSAGES.USER_NOT_FOUND_WITH_PERIOD });
    }

    // Fetch orders for the user
    const orderDetails = await Order.find({ userId }).sort({ orderDate: -1 });

    return res.status(HTTP_STATUS.OK).json({
      message: ORDER_MESSAGES.USER_ORDERS_FETCHED,
      orderDetails,
    });
  } catch (error) {
    console.error("Error in fetching order:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: ORDER_MESSAGES.USER_ORDERS_FETCH_FAILED });
  }
};

const orderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: ORDER_MESSAGES.ID_REQUIRED });
    }

    const orderDetails = await Order.findOne({ _id: id, userId });

    if (!orderDetails) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: ORDER_MESSAGES.NOT_FOUND_WITH_PERIOD });
    }

    return res.status(HTTP_STATUS.OK).json({
      message: ORDER_MESSAGES.DETAILS_FETCHED,
      orderDetails,
    });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ORDER_MESSAGES.DETAILS_FETCH_FAILED,
      error: error.message,
    });
  }
};

const returnOrderStatusUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { status, returnReason, returnDescription } = req.body;

    // Basic validation
    if (!status) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: ORDER_MESSAGES.STATUS_REQUIRED });
    }

    // Find order and verify ownership
    const orderDetails = await Order.findOne({ _id: id, userId });
    if (!orderDetails) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: ORDER_MESSAGES.NOT_FOUND });
    }

    // Validate return request
    if (status !== "Returned") {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: RETURN_MESSAGES.INVALID_STATUS });
    }

    if (!returnReason || !returnDescription) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: RETURN_MESSAGES.REASON_AND_DESCRIPTION_REQUIRED,
      });
    }

    // Validate order status
    if (orderDetails.orderStatus !== "Delivered") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: RETURN_MESSAGES.ONLY_DELIVERED_RETURNABLE,
      });
    }

    // Add return details
    orderDetails.returnDetails = {
      reason: returnReason,
      description: returnDescription,
      returnDate: new Date(),
    };

    // Process refund if payment is completed
    if (orderDetails.paymentStatus === "Completed") {
      try {
        const wallet = await processRefund(orderDetails);

        // Update order status
        orderDetails.orderStatus = status;
        const updatedOrder = await orderDetails.save();

        return res.status(HTTP_STATUS.OK).json({
          message: RETURN_MESSAGES.PROCESSED,
          order: updatedOrder,
          wallet: {
            currentBalance: wallet.balance,
            lastTransaction:
              wallet.transactions[wallet.transactions.length - 1],
          },
        });
      } catch (refundError) {
        console.error("Refund processing failed:", refundError);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          message: RETURN_MESSAGES.REFUND_FAILED,
          error: refundError.message,
        });
      }
    }

    // If no refund was needed, just update the order
    orderDetails.orderStatus = status;
    const updatedOrder = await orderDetails.save();

    return res.status(HTTP_STATUS.OK).json({
      message: RETURN_MESSAGES.PROCESSED,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error processing return:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: RETURN_MESSAGES.PROCESS_FAILED,
      error: error.message,
    });
  }
};

const orderStatusUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: ORDER_MESSAGES.STATUS_REQUIRED });
    }

    const orderDetails = await Order.findById(id);

    if (!orderDetails) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: ORDER_MESSAGES.NOT_FOUND });
    }

    const isAdminCaller = req.user?.isAdmin === true;
    if (!isAdminCaller && orderDetails.userId.toString() !== req.user.id) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: ORDER_MESSAGES.NOT_FOUND });
    }

    if (
      ![
        "Processing",
        "Confirmed",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Returned",
      ].includes(status)
    ) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: ORDER_MESSAGES.INVALID_STATUS });
    }

    // Handle Cancellation
    if (status === "Cancelled") {
      if (
        orderDetails.orderStatus === "Shipped" ||
        orderDetails.orderStatus === "Delivered" ||
        orderDetails.orderStatus === "Cancelled"
      ) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: ORDER_MESSAGES.cannotCancelWithStatus(
            orderDetails.orderStatus,
          ),
        });
      }

      // Restore product quantities back to stock
      const stockUpdatePromises = orderDetails.products.map((item) =>
        Product.findOneAndUpdate(
          {
            _id: item.productId,
            "variants._id": item.variantId,
          },
          {
            $inc: {
              "variants.$.availableQuantity": item.quantity, // Add back the quantity
            },
          },
        ),
      );

      // Wait for all stock updates to complete
      await Promise.all(stockUpdatePromises);

      // Process refund for completed Razorpay payments
      if (
        orderDetails.paymentMethod === "RazorpayX" &&
        orderDetails.paymentStatus === "Completed"
      ) {
        await processRefund(orderDetails);
      }
      // Also handle cancellations for orders that are still in Processing/Confirmed status
      else if (
        orderDetails.paymentMethod === "RazorpayX" &&
        ["Processing", "Confirmed"].includes(orderDetails.orderStatus) &&
        orderDetails.paymentStatus === "Completed"
      ) {
        await processRefund(orderDetails);
      }
    }

    // Handle Returns
    if (status === "Returned") {
      if (orderDetails.orderStatus !== "Delivered") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: RETURN_MESSAGES.ONLY_DELIVERED_RETURNABLE,
        });
      }

      // Restore product quantities for returned items
      const stockUpdatePromises = orderDetails.products.map(async (item) => {
        try {
          console.log(
            `Updating stock for Product ID: ${item.productId}, Variant ID: ${item.variantId}, Quantity: ${item.quantity}`,
          );

          const product = await Product.findOne({ _id: item.productId });

          if (!product) {
            console.error(`Product not found: ${item.productId}`);
            return;
          }

          const variantIndex = product.variants.findIndex(
            (v) => v._id.toString() === item.variantId.toString(),
          );

          if (variantIndex === -1) {
            console.error(
              `Variant not found: ${item.variantId} in Product: ${item.productId}`,
            );
            return;
          }

          // Updating the stock
          product.variants[variantIndex].availableQuantity += item.quantity;
          await product.save();

          console.log(
            `Stock updated successfully for Variant ID: ${item.variantId}`,
          );
        } catch (error) {
          console.error("Stock update error:", error);
        }
      });

      await Promise.all(stockUpdatePromises);

      if (orderDetails.paymentStatus === "Completed") {
        await processRefund(orderDetails);
      }
    }

    if (status === "Processing") {
      orderDetails.paymentStatus = "Completed";
    }

    orderDetails.orderStatus = status;
    if (orderDetails.orderStatus === "Delivered") {
      orderDetails.paymentStatus = "Completed";
    }

    const updateOrder = await orderDetails.save();

    const responseData = {
      message: ORDER_MESSAGES.STATUS_UPDATED,
      updateOrder: updateOrder,
    };

    // Add wallet information to response if refund was processed
    if (status === "Cancelled" || status === "Returned") {
      const wallet = await Wallet.findOne({ userId: orderDetails.userId });
      if (wallet) {
        responseData.wallet = {
          currentBalance: wallet.balance,
          lastTransaction: wallet.transactions[wallet.transactions.length - 1],
        };
      }
    }

    return res.status(HTTP_STATUS.OK).json(responseData);
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: ORDER_MESSAGES.STATUS_UPDATE_FAILED });
  }
};

// Helper function to process refunds
const processRefund = async (order) => {
  const refundAmount = order.finalAmount;
  let wallet = await Wallet.findOne({ userId: order.userId });

  if (!wallet) {
    wallet = new Wallet({
      userId: order.userId,
      balance: refundAmount,
      transactions: [
        {
          transaction_id: new mongoose.Types.ObjectId().toString(),
          type: "refund",
          amount: refundAmount,
          description: `Refund for order ${order._id}`,
          status: "completed",
          date: new Date(),
        },
      ],
    });
  } else {
    wallet.balance += refundAmount;
    wallet.transactions.push({
      transaction_id: new mongoose.Types.ObjectId().toString(),
      type: "refund",
      amount: refundAmount,
      description: `Refund for order ${order._id}`,
      status: "completed",
      date: new Date(),
    });
  }

  await wallet.save();
  return wallet;
};

const getallorders = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find()
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "firstName lastName email phone"),
      Order.countDocuments(),
    ]);

    if (!orders) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: ORDER_MESSAGES.LIST_NOT_FOUND });
    }

    return res.status(HTTP_STATUS.OK).json({
      message: ORDER_MESSAGES.LIST_FOUND,
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.log("Error in getting all orders . ", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_WITH_SPACED_PERIOD,
    });
  }
};

const refundOrders = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: ORDER_MESSAGES.NOT_FOUND });
    }

    // Check if order is eligible for refund
    if (
      order.paymentMethod !== "RazorpayX" ||
      order.paymentStatus !== "Completed"
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: RETURN_MESSAGES.NOT_REFUND_ELIGIBLE,
      });
    }

    // Check if order status is cancelled
    if (order.orderStatus !== "Cancelled") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: RETURN_MESSAGES.ONLY_CANCELLED_REFUNDABLE,
      });
    }

    const refundAmount = order.finalAmount;

    let wallet = await Wallet.findOne({ userId: order.userId });
    if (!wallet) {
      wallet = new Wallet({
        userId: order.userId,
      });
    }

    const alreadyRefunded = wallet.transactions.some(
      (transaction) =>
        transaction.type === "refund" &&
        transaction.description === `Refund for order ${orderId}`,
    );

    if (alreadyRefunded) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: RETURN_MESSAGES.ALREADY_REFUNDED });
    }

    wallet.balance += refundAmount;
    wallet.transactions.push({
      transaction_id: new mongoose.Types.ObjectId().toString(),
      type: "refund",
      amount: refundAmount,
      description: `Refund for order ${orderId}`,
      status: "completed",
      date: new Date(),
    });

    await wallet.save();

    return res.status(HTTP_STATUS.OK).json({
      message: RETURN_MESSAGES.REFUND_PROCESSED,
      wallet: {
        balance: wallet.balance,
        lastTransaction: wallet.transactions[wallet.transactions.length - 1],
      },
    });
  } catch (error) {
    console.error("Error in refunding order:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: RETURN_MESSAGES.REFUND_REQUEST_FAILED,
    });
  }
};

module.exports = {
  placeOrder,
  fetchOrders,
  orderById,
  orderStatusUpdate,
  getallorders,
  createRazorpayOrder,
  verifyRazorpayPayment,
  refundOrders,
  returnOrderStatusUpdate,
  placeWalletOrder,
  handleRazorpayWebhook,
};
