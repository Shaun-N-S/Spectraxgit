const Cart = require('../models/CartSchema');
const User = require('../models/userModel');
const Product = require('../models/productSchema')
const { HTTP_STATUS } = require('../constants/httpStatus');
const { COMMON_MESSAGES, CART_MESSAGES } = require('../constants/messages');


const AddCart = async (req, res) => {
    console.log("reached addcart...")
    try {
        const userId = req.user.id;
        const { productId, quantity, variantId } = req.body;
        console.log(userId,productId,quantity,variantId)

        // Validate user
        const userData = await User.findById(userId);
        if (!userData) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: COMMON_MESSAGES.USER_NOT_FOUND });
        }

        // Validate product
        const productData = await Product.findById(productId);
        if (!productData) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: COMMON_MESSAGES.PRODUCT_NOT_FOUND });
        }

        // Validate variant within product
        const variant = productData.variants.find(
            (v) => v._id.toString() === variantId
        );

        if (!variant) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: CART_MESSAGES.VARIANT_NOT_FOUND });
        }

        // Validate available quantity
        if (variant.availableQuantity < quantity) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: CART_MESSAGES.INSUFFICIENT_STOCK });
        }

        // Check if the user already has a cart
        let cart = await Cart.findOne({ userId})

        if (!cart) {
            // If no cart exists, create a new one
            cart = new Cart({
                userId,
                items: [{
                    productId,
                    variantId,
                    quantity: quantity || 1
                }]
            });
        } else {
            // If cart exists, check if the product + variant already exists in the cart
            const existingItem = cart.items.find(item => 
                item.productId.toString() === productId && 
                item.variantId === variantId
            );

            if (existingItem) {
                // Update quantity if product with the same variant already exists in cart
                existingItem.quantity += quantity || 1;
            } else {
                // Add new product + variant to the cart
                cart.items.push({
                    productId,
                    variantId,
                    quantity: quantity || 1
                });
            }
        }

        // Save the cart
        await cart.save();

        return res.status(HTTP_STATUS.OK).json({ message: CART_MESSAGES.ITEM_ADDED, cart });
    } catch (error) {
        console.error("Error in AddCart:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};


const CartDetails = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch cart based on userId
        const cartData = await Cart.findOne({ userId });

        

        // Send success response with cart data
        return res.status(HTTP_STATUS.OK).json({ message: CART_MESSAGES.CART_FETCHED, data: cartData });
        
    } catch (error) {
        console.error("Error in CartDetails:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_WITH_PERIOD });
    }
};

const UpdateQuantity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId, quantity } = req.body;

        // Validate inputs
        if (!itemId || quantity === undefined) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: CART_MESSAGES.ITEM_ID_AND_QUANTITY_REQUIRED });
        }

        // Validate quantity (e.g., it should be a positive integer)
        if (quantity < 1) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: CART_MESSAGES.MIN_QUANTITY });
        }

        // Find the user's cart
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: CART_MESSAGES.CART_NOT_FOUND });
        }

        // Find the item in the cart and update the quantity
        const item = cart.items.find(item => item._id.toString() === itemId);

        if (!item) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: CART_MESSAGES.ITEM_NOT_FOUND });
        }

        item.quantity = quantity; // Update the quantity

        // Save the updated cart
        await cart.save();

        return res.status(HTTP_STATUS.OK).json({ message: CART_MESSAGES.QUANTITY_UPDATED, data: cart });

    } catch (error) {
        console.error("Error in updating quantity:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_WITH_PERIOD });
    }
};

const RemoveItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.body;

        // Validate inputs
        if (!itemId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: CART_MESSAGES.ITEM_ID_REQUIRED });
        }

        // Find the user's cart
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: CART_MESSAGES.CART_NOT_FOUND });
        }

        // Check if the item exists in the cart
        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);

        if (itemIndex === -1) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: CART_MESSAGES.ITEM_NOT_FOUND });
        }

        // Remove the item from the cart
        cart.items.splice(itemIndex, 1);

        // Save the updated cart
        await cart.save();

        return res.status(HTTP_STATUS.OK).json({ message: CART_MESSAGES.ITEM_REMOVED, data: cart });

    } catch (error) {
        console.error("Error in removing item:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_WITH_PERIOD });
    }
};





module.exports = {
    AddCart,
    CartDetails,
    UpdateQuantity,
    RemoveItem

}