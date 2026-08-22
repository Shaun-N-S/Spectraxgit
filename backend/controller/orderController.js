const mongoose = require('mongoose')
const Order = require('../models/orderSchema');
const User = require('../models/userModel');
const Product = require('../models/productSchema');
const Cart = require('../models/CartSchema');
const Coupon = require('../models/CouponSchema');
const razorpay = require('../config/razorpayConfig');
const Razorpay = require('razorpay'); // class itself, for the static validateWebhookSignature utility (B5)
const Wallet = require('../models/walletSchema');
const crypto = require('crypto');

// Validates the shape of every product line-item in an order payload, and
// normalizes quantity/price to real numbers in place (a numeric-looking
// string like "2" is accepted but coerced, so downstream $gte/$inc queries
// against Number-typed schema fields behave correctly).
// Returns an error message string if invalid, or null if the payload is valid.
// Prevents malformed items from reaching stock, wallet, or order-creation logic.
const validateOrderProducts = (products) => {
    if (!Array.isArray(products) || products.length === 0) {
        return "At least one product is required.";
    }

    for (const item of products) {
        if (!item || typeof item !== 'object') {
            return "Each product item must be a valid object.";
        }
        if (!item.productId) {
            return "productId is required for every product item.";
        }
        if (!item.variantId) {
            return "variantId is required for every product item.";
        }
        if (item.quantity === undefined || item.quantity === null || isNaN(item.quantity) || Number(item.quantity) <= 0) {
            return "A valid positive quantity is required for every product item.";
        }
        if (!item.variant || typeof item.variant !== 'object') {
            return "Variant details are required for every product item.";
        }
        if (item.variant.price === undefined || item.variant.price === null || isNaN(item.variant.price) || Number(item.variant.price) < 0) {
            return "A valid variant price is required for every product item.";
        }

        item.quantity = Number(item.quantity);
        item.variant.price = Number(item.variant.price);
    }

    return null;
};

// Atomically reserves stock for every product item, one at a time, rolling back
// any items already reserved if a later item fails. Returns null on success, or
// an error message string if any item was out of stock (in which case nothing
// is left decremented). Accepts an optional mongoose session so its writes can
// participate in a caller's transaction (PR-6); unchanged core algorithm.
const reserveStockForItems = async (products, session = null) => {
    const reservedItems = [];

    for (const item of products) {
        const updatedProduct = await Product.findOneAndUpdate(
            {
                _id: item.productId,
                variants: {
                    $elemMatch: {
                        _id: item.variantId,
                        availableQuantity: { $gte: item.quantity }
                    }
                }
            },
            {
                $inc: { 'variants.$.availableQuantity': -item.quantity }
            },
            { session }
        );

        if (!updatedProduct) {
            // Roll back any items already reserved before this failure
            await Promise.all(
                reservedItems.map(reserved =>
                    Product.findOneAndUpdate(
                        { _id: reserved.productId, 'variants._id': reserved.variantId },
                        { $inc: { 'variants.$.availableQuantity': reserved.quantity } },
                        { session }
                    )
                )
            );
            return `Insufficient stock for product ${item.name}`;
        }

        reservedItems.push(item);
    }

    return null;
};

// Reverses a successful stock reservation (used when a later step, e.g. wallet
// debit or order save, fails after stock was already reserved). Kept available
// and unmodified in behavior for any non-transactional caller; the transactional
// placeOrder/placeWalletOrder flows below no longer call this directly, since a
// transaction abort now performs the same reversal atomically at the database
// level instead of via application code.
const releaseStockForItems = async (products, session = null) => {
    await Promise.all(
        products.map(item =>
            Product.findOneAndUpdate(
                { _id: item.productId, 'variants._id': item.variantId },
                { $inc: { 'variants.$.availableQuantity': item.quantity } },
                { session }
            )
        )
    );
};


// Idempotently marks an order's Razorpay payment as completed. Shared by both
// the client-triggered verify-payment flow and the webhook reconciliation
// flow (B5), so the two paths can never diverge or double-process the same
// order. Returns the updated order, or null if no order with this
// razorpay.orderId exists yet (the webhook can arrive before the order has
// been created by placeOrder — see handleRazorpayWebhook below).
const markRazorpayPaymentCompleted = async (razorpayOrderId, paymentId, signature) => {
    const order = await Order.findOne({ "razorpay.orderId": razorpayOrderId });

    if (!order) {
        return null;
    }

    // Idempotency guard: if this exact payment was already recorded (either by
    // an earlier webhook delivery, or by the client-triggered verify-payment
    // call already having run), do nothing further.
    if (order.paymentStatus === "Completed" && order.razorpay?.paymentId === paymentId) {
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
            receipt: `receipt_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        
        res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        console.error("Razorpay order creation error:", error);
        res.status(500).json({
            success: false,
            error: "Payment initialization failed"
        });
    }
};


const verifyRazorpayPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (!isAuthentic) {
            return res.status(400).json({
                success: false,
                error: "Payment verification failed"
            });
        }

        // Update the order with payment details (shared with the webhook path,
        // idempotent either way).
        await markRazorpayPaymentCompleted(razorpay_order_id, razorpay_payment_id, razorpay_signature);

        res.status(200).json({
            success: true,
            message: "Payment verified successfully"
        });
    } catch (error) {
        console.error("Payment verification error:", error);
        res.status(500).json({
            success: false,
            error: "Payment verification failed"
        });
    }
};

// Razorpay webhook (B5) — server-to-server reconciliation, independent of
// whether the client ever calls verify-payment/place-order. Configured
// separately in the Razorpay dashboard with its own webhook secret (distinct
// from RAZORPAY_KEY_SECRET). Mounted directly in index.js ahead of the global
// JSON parser, with express.raw() scoped to only this route, because
// signature verification needs the exact raw request bytes Razorpay signed —
// req.body here is a Buffer, not a parsed object.
const handleRazorpayWebhook = async (req, res) => {
    try {
        const signature = req.headers["x-razorpay-signature"];
        const rawBody = req.body; // Buffer, from express.raw() on this route only

        if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
            // No signature header, or the server isn't configured with a
            // webhook secret — never process, never leak why to the caller.
            return res.status(400).json({ status: "invalid" });
        }

        const isAuthentic = Razorpay.validateWebhookSignature(
            rawBody.toString(),
            signature,
            process.env.RAZORPAY_WEBHOOK_SECRET,
        );

        if (!isAuthentic) {
            console.error("Razorpay webhook: signature verification failed");
            return res.status(400).json({ status: "invalid signature" });
        }

        const event = JSON.parse(rawBody.toString());

        // Only "payment.captured" indicates money has actually been captured —
        // the precise, officially-recommended event for payment reconciliation.
        // Any other event type is acknowledged and ignored.
        if (event.event === "payment.captured") {
            const payment = event.payload?.payment?.entity;
            const razorpayOrderId = payment?.order_id;
            const paymentId = payment?.id;

            if (razorpayOrderId && paymentId) {
                const order = await markRazorpayPaymentCompleted(razorpayOrderId, paymentId, null);

                if (!order) {
                    // Payment succeeded on Razorpay's side, but no matching
                    // order exists yet in this app (e.g. the browser closed
                    // before placeOrder ran). Nothing more this handler can
                    // safely do without the original checkout payload (address,
                    // cart contents, etc.), which the webhook body doesn't
                    // carry. Logged distinctly so it can be searched for and
                    // reconciled manually against the Razorpay dashboard.
                    console.error(
                        `Razorpay webhook: payment.captured for order ${razorpayOrderId} (payment ${paymentId}) has no matching Order document yet.`,
                    );
                }
            }
        }

        // Always acknowledge receipt with 200 once the signature is valid, so
        // Razorpay doesn't keep retrying an event we've already handled (or
        // deliberately ignored because it isn't payment.captured).
        return res.status(200).json({ status: "ok" });
    } catch (error) {
        console.error("Razorpay webhook processing error:", error.message);
        // Still acknowledge — a malformed-but-authentically-signed payload
        // retrying indefinitely helps no one; the error above is what an
        // operator would search logs for.
        return res.status(200).json({ status: "error acknowledged" });
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
            status
        } = req.body;

        if (!products || !products.length || !shippingAddress || !paymentMethod) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const productValidationError = validateOrderProducts(products);
        if (productValidationError) {
            return res.status(400).json({ message: productValidationError });
        }

        let appliedCoupon = null;
        let discountAmount = 0;

        if (couponCode) {
            if (typeof couponCode !== "string" || !couponCode.trim()) {
                return res.status(400).json({ message: "Invalid coupon code" });
            }

            appliedCoupon = await Coupon.findOne({
                name: couponCode,
                isListed: "active",
                expireOn: { $gt: new Date() }
            });

            if (appliedCoupon) {
                if (appliedCoupon.CouponType === 'percentage') {
                    discountAmount = (totalAmount * appliedCoupon.offerPrice) / 100;
                } else {
                    discountAmount = appliedCoupon.offerPrice;
                }
                discountAmount = Math.min(discountAmount, totalAmount);
            }
        }

        const isPaymentFailedOrder = status === 'Payment Failed';

        // Everything below either fully commits together or fully rolls back
        // together: stock reservation, order creation, and cart clearing all
        // happen inside one mongoose transaction (H2). If any step throws, the
        // whole transaction is aborted by the database itself, so a failure
        // after the order has already been saved (e.g. the cart-clear step)
        // correctly undoes the order and the stock reservation too.
        await session.withTransaction(async () => {
            // Atomically reserve stock before creating the order (check +
            // decrement combined into one conditional update per item), unless
            // this call is only recording a failed payment attempt, which never
            // touches stock.
            if (!isPaymentFailedOrder) {
                const stockError = await reserveStockForItems(products, session);
                if (stockError) {
                    businessError = stockError;
                    throw new Error(stockError);
                }
            }

            const orderData = {
                userId,
                products: products.map(item => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.variant.price,
                    variant: item.variant
                })),
                shippingAddress,
                paymentMethod,
                totalAmount,
                coupon: appliedCoupon ? {
                    couponId: appliedCoupon._id,
                    code: appliedCoupon.name,
                    discountType: appliedCoupon.CouponType,
                    discountAmount: discountAmount
                } : null,
                discountAmount,
                finalAmount: finalAmount || (totalAmount - discountAmount),
                orderDate: new Date(),
                orderStatus: isPaymentFailedOrder ? 'Payment Failed' : 'Processing',
                paymentStatus: isPaymentFailedOrder ? 'Failed' :
                    (paymentMethod === 'RazorpayX' ? 'Completed' : 'Pending')
            };

            if (paymentMethod === 'RazorpayX' && razorpayOrderId) {
                orderData.razorpay = {
                    orderId: razorpayOrderId
                };
            }

            newOrder = new Order(orderData);
            await newOrder.save({ session });

            // Clear cart for successful orders (stock was already reserved above)
            if (!isPaymentFailedOrder) {
                await Cart.findOneAndUpdate(
                    { userId: userId },
                    { $set: { items: [] } },
                    { session }
                );
            }
        });

        return res.status(201).json({
            message: isPaymentFailedOrder
                ? "Order created with payment failure"
                : "Order placed successfully.",
            order: newOrder
        });

    } catch (error) {
        if (businessError) {
            return res.status(400).json({ message: businessError });
        }
        console.error("Error placing order:", error);
        return res.status(500).json({
            message: "Failed to place order",
            error: error.message
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
        const { products, shippingAddress, couponCode, totalAmount, finalAmount } = req.body;

        if (!products || !products.length || !shippingAddress) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const productValidationError = validateOrderProducts(products);
        if (productValidationError) {
            return res.status(400).json({ message: productValidationError });
        }

        let appliedCoupon = null;
        let discountAmount = 0;

        if (couponCode) {
            if (typeof couponCode !== "string" || !couponCode.trim()) {
                return res.status(400).json({ message: "Invalid coupon code" });
            }

            appliedCoupon = await Coupon.findOne({
                name: couponCode,
                isListed: "active",
                expireOn: { $gt: new Date() }
            });

            if (appliedCoupon) {
                discountAmount = appliedCoupon.CouponType === 'percentage'
                    ? (totalAmount * appliedCoupon.offerPrice) / 100
                    : appliedCoupon.offerPrice;
                discountAmount = Math.min(discountAmount, totalAmount);
            }
        }

        // Everything below either fully commits together or fully rolls back
        // together: stock reservation, wallet debit, order creation, and cart
        // clearing all happen inside one mongoose transaction (H2). If any step
        // throws, the whole transaction is aborted by the database itself.
        await session.withTransaction(async () => {
            // Atomically reserve stock before touching the wallet (check +
            // decrement combined into one conditional update per item).
            const stockError = await reserveStockForItems(products, session);
            if (stockError) {
                businessError = stockError;
                throw new Error(stockError);
            }

            // Atomically debit the wallet only if balance >= finalAmount (check
            // and decrement combined into one conditional update). If this
            // fails, throwing aborts the whole transaction, which undoes the
            // stock reservation above automatically — no manual release needed.
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
                            status: "completed"
                        }
                    }
                },
                { new: true, session }
            );

            if (!updatedWallet) {
                businessError = "Insufficient wallet balance.";
                throw new Error(businessError);
            }

            // Create order
            const orderData = {
                userId,
                products: products.map(item => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.variant.price,
                    variant: item.variant
                })),
                shippingAddress,
                paymentMethod: "Wallet",
                totalAmount,
                coupon: appliedCoupon ? {
                    couponId: appliedCoupon._id,
                    code: appliedCoupon.name,
                    discountType: appliedCoupon.CouponType,
                    discountAmount: discountAmount
                } : null,
                discountAmount,
                finalAmount: finalAmount || (totalAmount - discountAmount),
                orderDate: new Date(),
                orderStatus: "Processing",
                paymentStatus: "Completed"
            };

            newOrder = new Order(orderData);
            await newOrder.save({ session });

            // Clear cart
            await Cart.findOneAndUpdate(
                { userId },
                { $set: { items: [] } },
                { session }
            );
        });

        return res.status(201).json({
            message: "Order placed successfully using wallet.",
            orderId: newOrder._id
        });

    } catch (error) {
        if (businessError) {
            return res.status(400).json({ message: businessError });
        }
        console.error("Error placing order with wallet payment:", error);
        return res.status(500).json({ message: "Failed to place order", error: error.message });
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
            return res.status(404).json({ message: "User not found." });
        }

        // Fetch orders for the user
        const orderDetails = await Order.find({ userId }).sort({ orderDate: -1 });

        return res.status(200).json({
            message: "Order details fetched successfully!",
            orderDetails,
        });

    } catch (error) {
        console.error("Error in fetching order:", error);
        return res.status(500).json({ message: "Error in fetching order." });
    }
};


const orderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        if (!id) {
            return res.status(400).json({ message: "Order ID is required." });
        }

        const orderDetails = await Order.findOne({ _id: id, userId });

        if (!orderDetails) {
            return res.status(404).json({ message: "Order not found." });
        }

        return res.status(200).json({
            message: "Order details fetched successfully.",
            orderDetails,
        });

    } catch (error) {
        console.error("Error fetching order by ID:", error);
        return res.status(500).json({
            message: "An error occurred while fetching order details.",
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
            return res.status(400).json({ message: "Status is required" });
        }

        // Find order and verify ownership
        const orderDetails = await Order.findOne({ _id: id, userId });
        if (!orderDetails) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Validate return request
        if (status !== 'Returned') {
            return res.status(400).json({ message: "Invalid status for return order" });
        }

        if (!returnReason || !returnDescription) {
            return res.status(400).json({
                message: "Return reason and description are required"
            });
        }

        // Validate order status
        if (orderDetails.orderStatus !== 'Delivered') {
            return res.status(400).json({
                message: "Only delivered orders can be returned"
            });
        }

        // Add return details
        orderDetails.returnDetails = {
            reason: returnReason,
            description: returnDescription,
            returnDate: new Date()
        };

        // Process refund if payment is completed
        if (orderDetails.paymentStatus === 'Completed') {
            try {
                const wallet = await processRefund(orderDetails);
                
                // Update order status
                orderDetails.orderStatus = status;
                const updatedOrder = await orderDetails.save();

                return res.status(200).json({
                    message: "Return processed successfully",
                    order: updatedOrder,
                    wallet: {
                        currentBalance: wallet.balance,
                        lastTransaction: wallet.transactions[wallet.transactions.length - 1]
                    }
                });
            } catch (refundError) {
                console.error("Refund processing failed:", refundError);
                return res.status(500).json({
                    message: "Failed to process refund",
                    error: refundError.message
                });
            }
        }

        // If no refund was needed, just update the order
        orderDetails.orderStatus = status;
        const updatedOrder = await orderDetails.save();

        return res.status(200).json({
            message: "Return processed successfully",
            order: updatedOrder
        });

    } catch (error) {
        console.error("Error processing return:", error);
        return res.status(500).json({
            message: "Error processing return order",
            error: error.message
        });
    }
};


const orderStatusUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        const orderDetails = await Order.findById(id);

        if (!orderDetails) {
            return res.status(404).json({ message: "Order not found" });
        }

        // This route is shared by the admin panel (verifyAdmin -> req.user = full admin doc)
        // and the user-facing order-status route (verifyAccessToken -> req.user = { id }).
        // Only enforce ownership for non-admin callers so admin behavior is unchanged.
        const isAdminCaller = req.user?.isAdmin === true;
        if (!isAdminCaller && orderDetails.userId.toString() !== req.user.id) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (!['Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'].includes(status)) {
            return res.status(400).json({ message: "Invalid order status" });
        }

        // Handle Cancellation
        if (status === 'Cancelled') {
            // Check if order can be cancelled (also blocks re-cancelling an
            // already-cancelled order, which would otherwise re-run stock
            // restoration and the refund below on every repeated call).
            if (orderDetails.orderStatus === 'Shipped' || orderDetails.orderStatus === 'Delivered' || orderDetails.orderStatus === 'Cancelled') {
                return res.status(400).json({
                    message: `Cannot cancel the order with current status ${orderDetails.orderStatus}`,
                });
            }

            // Restore product quantities back to stock
            const stockUpdatePromises = orderDetails.products.map(item => 
                Product.findOneAndUpdate(
                    {
                        _id: item.productId,
                        'variants._id': item.variantId
                    },
                    {
                        $inc: {
                            'variants.$.availableQuantity': item.quantity // Add back the quantity
                        }
                    }
                )
            );

            // Wait for all stock updates to complete
            await Promise.all(stockUpdatePromises);

            // Process refund for completed Razorpay payments
            if (orderDetails.paymentMethod === 'RazorpayX' && orderDetails.paymentStatus === 'Completed') {
                await processRefund(orderDetails);
            }
            // Also handle cancellations for orders that are still in Processing/Confirmed status
            else if (orderDetails.paymentMethod === 'RazorpayX' && 
                     ['Processing', 'Confirmed'].includes(orderDetails.orderStatus) && 
                     orderDetails.paymentStatus === 'Completed') {
                await processRefund(orderDetails);
            }
        }

        // Handle Returns
        if (status === 'Returned') {
            if (orderDetails.orderStatus !== 'Delivered') {
                return res.status(400).json({
                    message: "Only delivered orders can be returned",
                });
            }

            // Restore product quantities for returned items
            const stockUpdatePromises = orderDetails.products.map(async (item) => {
                try {
                    console.log(`Updating stock for Product ID: ${item.productId}, Variant ID: ${item.variantId}, Quantity: ${item.quantity}`);
            
                    const product = await Product.findOne({ _id: item.productId });
            
                    if (!product) {
                        console.error(`Product not found: ${item.productId}`);
                        return;
                    }
            
                    const variantIndex = product.variants.findIndex(v => v._id.toString() === item.variantId.toString());
            
                    if (variantIndex === -1) {
                        console.error(`Variant not found: ${item.variantId} in Product: ${item.productId}`);
                        return;
                    }
            
                    // Updating the stock
                    product.variants[variantIndex].availableQuantity += item.quantity;
                    await product.save();
            
                    console.log(`Stock updated successfully for Variant ID: ${item.variantId}`);
                } catch (error) {
                    console.error("Stock update error:", error);
                }
            });
            
            await Promise.all(stockUpdatePromises);
            
            

            if (orderDetails.paymentStatus === 'Completed') {
                await processRefund(orderDetails);
            }
        }

        if (status === 'Processing') {
            orderDetails.paymentStatus = 'Completed';
        }

        orderDetails.orderStatus = status;
        if (orderDetails.orderStatus === 'Delivered') {
            orderDetails.paymentStatus = 'Completed';
        }

        const updateOrder = await orderDetails.save();

        const responseData = {
            message: "Order status updated successfully",
            updateOrder: updateOrder,
        };

        // Add wallet information to response if refund was processed
        if ((status === 'Cancelled' || status === 'Returned')) {
            const wallet = await Wallet.findOne({ userId: orderDetails.userId });
            if (wallet) {
                responseData.wallet = {
                    currentBalance: wallet.balance,
                    lastTransaction: wallet.transactions[wallet.transactions.length - 1],
                };
            }
        }

        return res.status(200).json(responseData);
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "Error updating order status" });
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
            transactions: [{
                transaction_id: new mongoose.Types.ObjectId().toString(),
                type: 'refund',
                amount: refundAmount,
                description: `Refund for order ${order._id}`,
                status: 'completed',
                date: new Date()
            }]
        });
    } else {
        wallet.balance += refundAmount;
        wallet.transactions.push({
            transaction_id: new mongoose.Types.ObjectId().toString(),
            type: 'refund',
            amount: refundAmount,
            description: `Refund for order ${order._id}`,
            status: 'completed',
            date: new Date()
        });
    }

    await wallet.save();
    return wallet;
};




const getallorders = async (req,res) =>{
    try {

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            Order.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
            Order.countDocuments()
        ]);

        if(!orders){
            return res.status(404).json({message:"Orders not found . "});
        };

        return res.status(200).json({
            message:"Orders found successfully . ",
            orders,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
        

        
    } catch (error) {
        console.log("Error in getting all orders . ",error);
        return res.status(500).json({message:"Internal server error ."})
    }
}



const refundOrders = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Check if order is eligible for refund
        if (order.paymentMethod !== 'RazorpayX' || order.paymentStatus !== 'Completed') {
            return res.status(400).json({ 
                message: "Order is not eligible for refund. Only completed online payments can be refunded."
            });
        }

        // Check if order status is cancelled
        if (order.orderStatus !== 'Cancelled') {
            return res.status(400).json({ 
                message: "Only cancelled orders can be refunded" 
            });
        }

        const refundAmount = order.finalAmount;

        let wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) {
            wallet = new Wallet({
                userId: order.userId
            });
        }

        // Idempotency guard: reuse the existing transaction history instead of
        // adding a new field. If a refund for this exact order was already
        // recorded — by this endpoint on an earlier call, or by the
        // cancellation flow's own refund step (processRefund), which writes
        // the identical description string — do not credit the wallet again.
        const alreadyRefunded = wallet.transactions.some(
            (transaction) => transaction.type === 'refund' && transaction.description === `Refund for order ${orderId}`
        );

        if (alreadyRefunded) {
            return res.status(400).json({ message: "This order has already been refunded." });
        }

        wallet.balance += refundAmount;
        wallet.transactions.push({
            transaction_id: new mongoose.Types.ObjectId().toString(),
            type: 'refund',
            amount: refundAmount,
            description: `Refund for order ${orderId}`,
            status: 'completed',
            date: new Date()
        });

        await wallet.save();

        return res.status(200).json({
            message: "Refund processed successfully!",
            wallet: {
                balance: wallet.balance,
                lastTransaction: wallet.transactions[wallet.transactions.length - 1]
            }
        });

    } catch (error) {
        console.error("Error in refunding order:", error);
        return res.status(500).json({
            message: "Error in processing refund, please try again later"
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
}