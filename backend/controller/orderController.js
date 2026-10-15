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
const { priceCartForCheckout, toPaise } = require("../utils/orderPricing");
const {
  COMMON_MESSAGES,
  COUPON_MESSAGES,
  ORDER_MESSAGES,
  RETURN_MESSAGES,
  PAYMENT_MESSAGES,
  WALLET_MESSAGES,
} = require("../constants/messages");

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

// Payments are always charged in Indian Rupees; the client cannot pick another
// currency for a rupee amount.
const PAYMENT_CURRENCY = "INR";

// The amount is always computed on the server: from the user's cart (with
// the coupon) at checkout, or from the stored total when retrying a failed
// order's payment. A client-sent amount is ignored.
const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId, couponCode } = req.body;
    const notes = { userId: String(userId) };
    let rupees;

    if (orderId !== undefined && orderId !== null) {
      const order = mongoose.Types.ObjectId.isValid(orderId)
        ? await Order.findOne({ _id: orderId, userId, paymentStatus: "Failed" })
        : null;
      if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: ORDER_MESSAGES.NOT_FOUND,
        });
      }
      rupees = order.finalAmount;
      notes.orderId = String(order._id);
    } else {
      const priced = await priceCartForCheckout({ userId, couponCode });
      if (priced.error) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: priced.error,
        });
      }
      rupees = priced.finalAmount;
    }

    if (!Number.isFinite(rupees) || rupees <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: PAYMENT_MESSAGES.INVALID_AMOUNT,
      });
    }

    const options = {
      amount: toPaise(rupees), // Razorpay expects amount in paise
      currency: PAYMENT_CURRENCY,
      receipt: `receipt_${Date.now()}`,
      notes,
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

// Confirms a Razorpay payment on the server before an order is treated as
// paid: the signature proves Razorpay issued the payment for that Razorpay
// order, and the Razorpay order itself (fetched from Razorpay) must be in INR,
// for exactly the expected amount, created for this user (and this order when
// retrying), and not already attached to another paid order.
// Returns null when the payment is confirmed, otherwise an error message.
const confirmRazorpayPayment = async ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  expectedPaise,
  userId,
  orderId = null,
}) => {
  const ids = [razorpayOrderId, razorpayPaymentId, razorpaySignature];
  if (!ids.every((value) => typeof value === "string" && value.length > 0)) {
    return PAYMENT_MESSAGES.NOT_VERIFIED;
  }
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  if (
    expectedSignature.length !== razorpaySignature.length ||
    !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpaySignature))
  ) {
    return PAYMENT_MESSAGES.NOT_VERIFIED;
  }

  const razorpayOrder = await razorpay.orders.fetch(razorpayOrderId);
  if (
    !razorpayOrder ||
    razorpayOrder.currency !== PAYMENT_CURRENCY ||
    Number(razorpayOrder.amount) !== expectedPaise
  ) {
    return PAYMENT_MESSAGES.AMOUNT_MISMATCH;
  }
  if (String(razorpayOrder.notes?.userId) !== String(userId)) {
    return PAYMENT_MESSAGES.NOT_VERIFIED;
  }
  if (orderId && String(razorpayOrder.notes?.orderId) !== String(orderId)) {
    return PAYMENT_MESSAGES.NOT_VERIFIED;
  }

  const alreadyUsed = await Order.findOne({
    "razorpay.orderId": razorpayOrderId,
    paymentStatus: "Completed",
    ...(orderId ? { _id: { $ne: orderId } } : {}),
  });
  if (alreadyUsed) {
    return PAYMENT_MESSAGES.ALREADY_USED;
  }
  return null;
};

// Checks a Razorpay payment signature for the client. It never changes an
// order: orders are only marked paid by place-order and by the failed-payment
// retry, which also confirm the amount, user and order with Razorpay.
const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    const fields = [razorpay_order_id, razorpay_payment_id, razorpay_signature];
    if (!fields.every((value) => typeof value === "string" && value.length > 0)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: PAYMENT_MESSAGES.VERIFICATION_FAILED,
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const isAuthentic =
      expectedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));

    if (!isAuthentic) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: PAYMENT_MESSAGES.VERIFICATION_FAILED,
      });
    }

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

// Razorpay webhook. A payment.captured event only completes a payment-failed
// order's retry payment: the Razorpay order must name that order and its
// user, and the captured amount must equal the order total. Checkout payments
// are completed by place-order itself. Completion is guarded, so replays and
// races with the retry endpoint complete an order at most once.
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
      if (payment?.order_id && payment?.id) {
        const razorpayOrder = await razorpay.orders.fetch(payment.order_id);
        const orderId = razorpayOrder?.notes?.orderId;
        const order =
          orderId && mongoose.Types.ObjectId.isValid(orderId)
            ? await Order.findById(orderId)
            : null;
        const expectedPaise = order ? toPaise(order.finalAmount) : null;

        if (
          order &&
          String(razorpayOrder.notes?.userId) === String(order.userId) &&
          payment.currency === PAYMENT_CURRENCY &&
          Number(payment.amount) === expectedPaise &&
          Number(razorpayOrder.amount) === expectedPaise
        ) {
          await completeFailedOrderPayment(order, {
            orderId: payment.order_id,
            paymentId: payment.id,
          });
        } else {
          // Checkout payments are completed by place-order itself. A capture
          // with no paid order (e.g. the browser failed after paying) is only
          // logged for manual follow-up in the Razorpay dashboard.
          console.log(
            `Razorpay webhook: payment ${payment.id} (order ${payment.order_id}) is not a retry for an order; nothing updated.`,
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
    // Products, prices and totals come from the user's cart and the database;
    // any products/prices/totals in the request body are ignored.
    const {
      shippingAddress,
      paymentMethod,
      couponCode,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      status,
    } = req.body;

    if (!shippingAddress || !paymentMethod) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: COMMON_MESSAGES.ALL_FIELDS_REQUIRED_WITH_PERIOD });
    }
    if (!["Cash on Delivery", "RazorpayX"].includes(paymentMethod)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: ORDER_MESSAGES.INVALID_PAYMENT_METHOD });
    }

    const isPaymentFailedOrder = status === "Payment Failed";
    if (isPaymentFailedOrder && paymentMethod !== "RazorpayX") {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: ORDER_MESSAGES.INVALID_PAYMENT_METHOD });
    }

    const priced = await priceCartForCheckout({ userId, couponCode });
    if (priced.error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: priced.error });
    }

    if (paymentMethod === "Cash on Delivery" && !priced.codAllowed) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: ORDER_MESSAGES.COD_NOT_AVAILABLE });
    }

    // An online order is only marked paid after the payment is confirmed here.
    if (paymentMethod === "RazorpayX" && !isPaymentFailedOrder) {
      const paymentError = await confirmRazorpayPayment({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        expectedPaise: toPaise(priced.finalAmount),
        userId,
      });
      if (paymentError) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: paymentError });
      }
    }

    await session.withTransaction(async () => {
      if (!isPaymentFailedOrder) {
        const stockError = await reserveStockForItems(priced.items, session);
        if (stockError) {
          businessError = stockError;
          throw new Error(stockError);
        }
      }

      const orderData = {
        userId,
        products: priced.items,
        shippingAddress,
        paymentMethod,
        totalAmount: priced.totalAmount,
        coupon: priced.coupon,
        discountAmount: priced.discountAmount,
        finalAmount: priced.finalAmount,
        orderDate: new Date(),
        orderStatus: isPaymentFailedOrder ? "Payment Failed" : "Processing",
        paymentStatus: isPaymentFailedOrder
          ? "Failed"
          : paymentMethod === "RazorpayX"
            ? "Completed"
            : "Pending",
      };

      if (paymentMethod === "RazorpayX" && razorpayOrderId) {
        orderData.razorpay = isPaymentFailedOrder
          ? { orderId: razorpayOrderId }
          : {
              orderId: razorpayOrderId,
              paymentId: razorpayPaymentId,
              signature: razorpaySignature,
            };
      }

      newOrder = new Order(orderData);
      await newOrder.save({ session });

      // Clear the cart for successful orders (stock was reserved above). Only
      // a non-empty cart can be checked out, so a repeated or concurrent
      // submission of the same cart cannot create a second order.
      if (!isPaymentFailedOrder) {
        const clearedCart = await Cart.findOneAndUpdate(
          { userId: userId, "items.0": { $exists: true } },
          { $set: { items: [] } },
          { session },
        );
        if (!clearedCart) {
          businessError = ORDER_MESSAGES.CART_ALREADY_CHECKED_OUT;
          throw new Error(businessError);
        }
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
    // Priced from the cart on the server; body products/totals are ignored.
    const { shippingAddress, couponCode } = req.body;

    if (!shippingAddress) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: COMMON_MESSAGES.ALL_FIELDS_REQUIRED_WITH_PERIOD });
    }

    const priced = await priceCartForCheckout({ userId, couponCode });
    if (priced.error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: priced.error });
    }
    const { finalAmount } = priced;

    await session.withTransaction(async () => {
      const stockError = await reserveStockForItems(priced.items, session);
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
        products: priced.items,
        shippingAddress,
        paymentMethod: "Wallet",
        totalAmount: priced.totalAmount,
        coupon: priced.coupon,
        discountAmount: priced.discountAmount,
        finalAmount,
        orderDate: new Date(),
        orderStatus: "Processing",
        paymentStatus: "Completed",
      };

      newOrder = new Order(orderData);
      await newOrder.save({ session });

      // Clear cart; a cart that was already checked out cannot be paid twice
      const clearedCart = await Cart.findOneAndUpdate(
        { userId, "items.0": { $exists: true } },
        { $set: { items: [] } },
        { session },
      );
      if (!clearedCart) {
        businessError = ORDER_MESSAGES.CART_ALREADY_CHECKED_OUT;
        throw new Error(businessError);
      }
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

const RETURN_REASONS = [
  "Wrong Item",
  "Defective Product",
  "Size/Fit Issue",
  "Not as Described",
  "Other",
];

// Status moves an admin may make. Cancelled and Returned are final, so the
// stock restore and refund tied to them cannot be repeated by reopening an
// order; a payment-failed order (no stock reserved, nothing paid) can only
// be cancelled.
const ADMIN_TRANSITIONS = {
  Processing: ["Confirmed", "Shipped", "Delivered", "Cancelled"],
  Confirmed: ["Shipped", "Delivered", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: ["Returned"],
  "Payment Failed": ["Cancelled"],
  Cancelled: [],
  Returned: [],
};

// Orders a customer (or admin) may still cancel.
const CANCELLABLE_STATUSES = ["Processing", "Confirmed", "Payment Failed"];

const walletSummary = (wallet) =>
  wallet
    ? {
        currentBalance: wallet.balance,
        lastTransaction: wallet.transactions[wallet.transactions.length - 1],
      }
    : undefined;

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
    const orderDetails = mongoose.Types.ObjectId.isValid(id)
      ? await Order.findOne({ _id: id, userId })
      : null;
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

    if (
      !RETURN_REASONS.includes(returnReason) ||
      typeof returnDescription !== "string"
    ) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: RETURN_MESSAGES.INVALID_REASON });
    }

    // Validate order status
    if (orderDetails.orderStatus !== "Delivered") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: RETURN_MESSAGES.ONLY_DELIVERED_RETURNABLE,
      });
    }

    // Only one request can move the order from Delivered to Returned, and the
    // refund follows that move, so it cannot be paid twice.
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderDetails._id, userId, orderStatus: "Delivered" },
      {
        $set: {
          orderStatus: "Returned",
          returnDetails: {
            reason: returnReason,
            description: returnDescription,
            returnDate: new Date(),
          },
        },
      },
      { new: true, runValidators: true },
    );
    if (!updatedOrder) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: RETURN_MESSAGES.ONLY_DELIVERED_RETURNABLE,
      });
    }

    // Process refund if payment is completed
    if (updatedOrder.paymentStatus === "Completed") {
      try {
        const { wallet } = await processRefund(updatedOrder);
        return res.status(HTTP_STATUS.OK).json({
          message: RETURN_MESSAGES.PROCESSED,
          order: updatedOrder,
          wallet: walletSummary(wallet),
        });
      } catch (refundError) {
        console.error("Refund processing failed:", refundError);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          message: RETURN_MESSAGES.REFUND_FAILED,
          error: refundError.message,
        });
      }
    }

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

    const orderDetails = mongoose.Types.ObjectId.isValid(id)
      ? await Order.findById(id)
      : null;

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

    // Customers can only cancel their order, or complete a failed payment
    // (which is verified with Razorpay). Every other transition - including
    // marking an order delivered, returned or paid - is for admins only.
    if (!isAdminCaller) {
      if (status === "Processing") {
        return retryOrderPayment(req, res, orderDetails);
      }
      if (status !== "Cancelled") {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json({ message: ORDER_MESSAGES.STATUS_CHANGE_NOT_ALLOWED });
      }
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

    if (
      isAdminCaller &&
      !(ADMIN_TRANSITIONS[orderDetails.orderStatus] || []).includes(status)
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: ORDER_MESSAGES.invalidTransition(orderDetails.orderStatus, status),
      });
    }

    // Handle Cancellation: one atomic move to Cancelled; the stock restore and
    // refund follow that move, so concurrent or repeated requests cannot
    // repeat them. `before` is the order as it was just before cancelling.
    if (status === "Cancelled") {
      const before = await Order.findOneAndUpdate(
        { _id: orderDetails._id, orderStatus: { $in: CANCELLABLE_STATUSES } },
        { $set: { orderStatus: "Cancelled" } },
        { new: false },
      );
      if (!before) {
        const current = await Order.findById(orderDetails._id);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: ORDER_MESSAGES.cannotCancelWithStatus(current?.orderStatus),
        });
      }

      // Restore stock only if it was taken: a payment-failed order never
      // reserved any.
      if (before.orderStatus !== "Payment Failed") {
        await releaseStockForItems(before.products);
      }

      // Refund anything already paid (online or wallet) to the wallet
      let wallet = null;
      if (
        ["RazorpayX", "Wallet"].includes(before.paymentMethod) &&
        before.paymentStatus === "Completed"
      ) {
        ({ wallet } = await processRefund(before));
      }

      return res.status(HTTP_STATUS.OK).json({
        message: ORDER_MESSAGES.STATUS_UPDATED,
        updateOrder: await Order.findById(orderDetails._id),
        ...(wallet ? { wallet: walletSummary(wallet) } : {}),
      });
    }

    // Handle Returns (admin): one atomic move from Delivered to Returned,
    // then restore stock and refund once. Return details are required by the
    // order schema, so they are filled in if the customer did not give any.
    if (status === "Returned") {
      const before = await Order.findOneAndUpdate(
        { _id: orderDetails._id, orderStatus: "Delivered" },
        {
          $set: {
            orderStatus: "Returned",
            returnDetails: {
              reason: orderDetails.returnDetails?.reason || "Other",
              description:
                orderDetails.returnDetails?.description ||
                "Marked as returned by admin",
              returnDate: orderDetails.returnDetails?.returnDate || new Date(),
            },
          },
        },
        { new: false },
      );
      if (!before) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: RETURN_MESSAGES.ONLY_DELIVERED_RETURNABLE,
        });
      }

      await releaseStockForItems(before.products);

      let wallet = null;
      if (before.paymentStatus === "Completed") {
        ({ wallet } = await processRefund(before));
      }

      return res.status(HTTP_STATUS.OK).json({
        message: ORDER_MESSAGES.STATUS_UPDATED,
        updateOrder: await Order.findById(orderDetails._id),
        ...(wallet ? { wallet: walletSummary(wallet) } : {}),
      });
    }

    // Other admin moves apply only if the order is still in the status that
    // was checked, so concurrent updates cannot skip or repeat a step.
    const updates = { orderStatus: status };
    if (status === "Delivered") {
      updates.paymentStatus = "Completed";
    }
    const updateOrder = await Order.findOneAndUpdate(
      { _id: orderDetails._id, orderStatus: orderDetails.orderStatus },
      { $set: updates },
      { new: true },
    );
    if (!updateOrder) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        message: ORDER_MESSAGES.invalidTransition(orderDetails.orderStatus, status),
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      message: ORDER_MESSAGES.STATUS_UPDATED,
      updateOrder: updateOrder,
    });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: ORDER_MESSAGES.STATUS_UPDATE_FAILED });
  }
};

// Completes a payment-failed order whose retry payment has been confirmed.
// Marking it paid and reserving its stock happen in one transaction that only
// applies while the order is still unpaid, so a payment confirmed twice
// (concurrent requests, webhook replays, webhook + retry endpoint) completes
// it once. If the stock is gone, the order is cancelled and the payment
// refunded to the wallet - also at most once.
// Returns "completed", "refunded" or "already".
const completeFailedOrderPayment = async (order, payment) => {
  const unpaid = {
    _id: order._id,
    paymentStatus: "Failed",
    orderStatus: "Payment Failed",
  };
  let session;
  let stockError = null;
  let completed = false;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      stockError = null;
      completed = false;
      const paid = await Order.findOneAndUpdate(
        unpaid,
        {
          $set: {
            paymentStatus: "Completed",
            orderStatus: "Processing",
            razorpay: payment,
          },
        },
        { session, new: true },
      );
      if (!paid) return; // already completed or cancelled
      stockError = await reserveStockForItems(paid.products, session);
      if (stockError) throw new Error(stockError);
      completed = true;
    });
  } catch (error) {
    if (!stockError) throw error;
  } finally {
    if (session) await session.endSession();
  }

  if (completed) return "completed";
  if (!stockError) return "already";

  // Paid, but the items are gone: cancel and refund to the wallet, once.
  const cancelled = await Order.findOneAndUpdate(
    unpaid,
    {
      $set: {
        paymentStatus: "Completed",
        orderStatus: "Cancelled",
        razorpay: payment,
      },
    },
    { new: true },
  );
  if (!cancelled) return "already";
  await processRefund(cancelled);
  return "refunded";
};

// Customer completing a failed order's payment: the payment is confirmed with
// Razorpay for this order's stored total, then the order is completed once.
const retryOrderPayment = async (req, res, order) => {
  if (order.orderStatus !== "Payment Failed" || order.paymentStatus !== "Failed") {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ message: ORDER_MESSAGES.RETRY_NOT_ALLOWED });
  }
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const paymentError = await confirmRazorpayPayment({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    expectedPaise: toPaise(order.finalAmount),
    userId: order.userId,
    orderId: order._id,
  });
  if (paymentError) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: paymentError });
  }

  const outcome = await completeFailedOrderPayment(order, {
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (outcome === "already") {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ message: ORDER_MESSAGES.RETRY_NOT_ALLOWED });
  }
  if (outcome === "refunded") {
    return res
      .status(HTTP_STATUS.CONFLICT)
      .json({ message: PAYMENT_MESSAGES.RETRY_OUT_OF_STOCK_REFUNDED });
  }

  return res.status(HTTP_STATUS.OK).json({
    message: ORDER_MESSAGES.STATUS_UPDATED,
    updateOrder: await Order.findById(order._id),
  });
};

// Makes sure the user has a wallet. A wallet created here takes the user id
// as its _id, so concurrent first-time refunds cannot create two wallets: the
// second insert fails on the unique _id and the existing wallet is used.
const ensureWallet = async (userId) => {
  try {
    await Wallet.updateOne(
      { userId },
      { $setOnInsert: { _id: userId, balance: 0, transactions: [] } },
      { upsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
};

// Credits an order's refund to the user's wallet at most once: the credit and
// its "Refund for order <id>" record are written in one update that only
// applies while that record does not exist yet. Returns { wallet, refunded }.
const processRefund = async (order) => {
  const refundAmount = order.finalAmount;
  const description = `Refund for order ${order._id}`;

  await ensureWallet(order.userId);

  const credited = await Wallet.findOneAndUpdate(
    {
      userId: order.userId,
      transactions: { $not: { $elemMatch: { description } } },
    },
    {
      $inc: { balance: refundAmount },
      $push: {
        transactions: {
          transaction_id: new mongoose.Types.ObjectId().toString(),
          type: "refund",
          amount: refundAmount,
          description,
          status: "completed",
          date: new Date(),
        },
      },
    },
    { new: true },
  );

  return {
    wallet: credited || (await Wallet.findOne({ userId: order.userId })),
    refunded: Boolean(credited),
  };
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

    const order = mongoose.Types.ObjectId.isValid(orderId)
      ? await Order.findOne({ _id: orderId, userId })
      : null;
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

    const { wallet, refunded } = await processRefund(order);
    if (!refunded) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: RETURN_MESSAGES.ALREADY_REFUNDED });
    }

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
