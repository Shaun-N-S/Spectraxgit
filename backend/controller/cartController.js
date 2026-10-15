const mongoose = require("mongoose");
const Cart = require("../models/CartSchema");
const User = require("../models/userModel");
const Product = require("../models/productSchema");
const { HTTP_STATUS } = require("../constants/httpStatus");
const { COMMON_MESSAGES, CART_MESSAGES } = require("../constants/messages");

// Quantity must be a whole number >= 1 (numeric strings are accepted;
// booleans, arrays and objects are not, though Number() would convert them).
const parseQuantity = (value) => {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) {
    return null;
  }
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity >= 1 ? quantity : null;
};

const AddCart = async (req, res) => {
  console.log("reached addcart...");
  try {
    const userId = req.user.id;
    const { productId, variantId } = req.body;
    console.log(userId, productId, req.body.quantity, variantId);

    if (
      !mongoose.Types.ObjectId.isValid(productId) ||
      !mongoose.Types.ObjectId.isValid(variantId)
    ) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: CART_MESSAGES.INVALID_IDS });
    }

    // Quantity defaults to 1 when not sent
    const quantity =
      req.body.quantity === undefined ? 1 : parseQuantity(req.body.quantity);
    if (quantity === null) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: CART_MESSAGES.INVALID_QUANTITY });
    }

    // Validate user
    const userData = await User.findById(userId);
    if (!userData) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: COMMON_MESSAGES.USER_NOT_FOUND });
    }

    // Validate product
    const productData = await Product.findById(productId);
    if (!productData) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: COMMON_MESSAGES.PRODUCT_NOT_FOUND });
    }
    if (productData.status !== "active") {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: CART_MESSAGES.PRODUCT_UNAVAILABLE });
    }

    // Validate variant within product
    const variant = productData.variants.find(
      (v) => v._id.toString() === variantId,
    );

    if (!variant) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: CART_MESSAGES.VARIANT_NOT_FOUND });
    }

    // Add atomically, so concurrent requests cannot push the line above stock:
    // an existing line is only incremented while the result stays within
    // stock, and a new line is only pushed if no line for this variant exists.
    const stock = variant.availableQuantity || 0;
    if (quantity > stock) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: CART_MESSAGES.INSUFFICIENT_STOCK });
    }
    await Cart.updateOne(
      { userId },
      { $setOnInsert: { items: [] } },
      { upsert: true },
    );
    const line = { productId: productData._id, variantId: String(variant._id) };
    let added = false;
    for (let attempt = 0; attempt < 3 && !added; attempt++) {
      const incremented = await Cart.updateOne(
        {
          userId,
          items: {
            $elemMatch: { ...line, quantity: { $lte: stock - quantity } },
          },
        },
        { $inc: { "items.$.quantity": quantity } },
      );
      if (incremented.modifiedCount === 1) {
        added = true;
        break;
      }
      const hasLine = await Cart.exists({ userId, items: { $elemMatch: line } });
      if (hasLine) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json({ message: CART_MESSAGES.INSUFFICIENT_STOCK });
      }
      const pushed = await Cart.updateOne(
        { userId, items: { $not: { $elemMatch: line } } },
        { $push: { items: { ...line, quantity } } },
      );
      added = pushed.modifiedCount === 1; // else another request added the line first
    }
    if (!added) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: CART_MESSAGES.INSUFFICIENT_STOCK });
    }

    const cart = await Cart.findOne({ userId });

    return res
      .status(HTTP_STATUS.OK)
      .json({ message: CART_MESSAGES.ITEM_ADDED, cart });
  } catch (error) {
    console.error("Error in AddCart:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const CartDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch cart based on userId
    const cartData = await Cart.findOne({ userId });

    // Send success response with cart data
    return res
      .status(HTTP_STATUS.OK)
      .json({ message: CART_MESSAGES.CART_FETCHED, data: cartData });
  } catch (error) {
    console.error("Error in CartDetails:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_WITH_PERIOD });
  }
};

const UpdateQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.body;

    // Validate inputs
    if (!itemId || req.body.quantity === undefined) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: CART_MESSAGES.ITEM_ID_AND_QUANTITY_REQUIRED });
    }

    // Validate quantity (e.g., it should be a positive integer)
    if (Number(req.body.quantity) < 1) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: CART_MESSAGES.MIN_QUANTITY });
    }
    const quantity = parseQuantity(req.body.quantity);
    if (quantity === null) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: CART_MESSAGES.INVALID_QUANTITY });
    }

    // Find the user's cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: CART_MESSAGES.CART_NOT_FOUND });
    }

    // Find the item in the cart and update the quantity
    const item = cart.items.find((item) => item._id.toString() === itemId);

    if (!item) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: CART_MESSAGES.ITEM_NOT_FOUND });
    }

    // The new quantity must still be in stock for this variant
    const productData = await Product.findById(item.productId);
    if (productData && productData.status !== "active") {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: CART_MESSAGES.PRODUCT_UNAVAILABLE });
    }
    const variant = productData?.variants.find(
      (v) => v._id.toString() === item.variantId,
    );
    if (!variant) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: CART_MESSAGES.VARIANT_NOT_FOUND });
    }
    if ((variant.availableQuantity || 0) < quantity) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: CART_MESSAGES.INSUFFICIENT_STOCK });
    }

    item.quantity = quantity; // Update the quantity

    // Save the updated cart
    await cart.save();

    return res
      .status(HTTP_STATUS.OK)
      .json({ message: CART_MESSAGES.QUANTITY_UPDATED, data: cart });
  } catch (error) {
    console.error("Error in updating quantity:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_WITH_PERIOD });
  }
};

const RemoveItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.body;

    // Validate inputs
    if (!itemId) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: CART_MESSAGES.ITEM_ID_REQUIRED });
    }

    // Find the user's cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: CART_MESSAGES.CART_NOT_FOUND });
    }

    // Check if the item exists in the cart
    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId,
    );

    if (itemIndex === -1) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: CART_MESSAGES.ITEM_NOT_FOUND });
    }

    // Remove the item from the cart
    cart.items.splice(itemIndex, 1);

    // Save the updated cart
    await cart.save();

    return res
      .status(HTTP_STATUS.OK)
      .json({ message: CART_MESSAGES.ITEM_REMOVED, data: cart });
  } catch (error) {
    console.error("Error in removing item:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_WITH_PERIOD });
  }
};

module.exports = {
  AddCart,
  CartDetails,
  UpdateQuantity,
  RemoveItem,
};
