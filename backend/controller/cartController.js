const Cart = require('../models/CartSchema');
const User = require('../models/userModel');
const Product = require('../models/productSchema')


const AddCart = async (req, res) => {
    console.log("reached addcart...")
    try {
        const userId = req.user.id;
        const { productId, quantity, variantId } = req.body;
        console.log(userId,productId,quantity,variantId)

        // Validate user
        const userData = await User.findById(userId);
        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }

        // Validate product
        const productData = await Product.findById(productId);
        if (!productData) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Validate variant within product
        const variant = productData.variants.find(
            (v) => v._id.toString() === variantId
        );

        if (!variant) {
            return res.status(404).json({ message: "Variant not found in product" });
        }

        // Validate available quantity
        if (variant.availableQuantity < quantity) {
            return res.status(400).json({ message: "Insufficient stock for this variant" });
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

        return res.status(200).json({ message: "Product added to cart successfully", cart });
    } catch (error) {
        console.error("Error in AddCart:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


const CartDetails = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch cart based on userId
        const cartData = await Cart.findOne({ userId });

        

        // Send success response with cart data
        return res.status(200).json({ message: "Cart data retrieved successfully.", data: cartData });
        
    } catch (error) {
        console.error("Error in CartDetails:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

const UpdateQuantity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId, quantity } = req.body;

        // Validate inputs
        if (!itemId || quantity === undefined) {
            return res.status(400).json({ message: "itemId and quantity are required." });
        }

        // Validate quantity (e.g., it should be a positive integer)
        if (quantity < 1) {
            return res.status(400).json({ message: "Quantity must be at least 1." });
        }

        // Find the user's cart
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ message: "Cart not found." });
        }

        // Find the item in the cart and update the quantity
        const item = cart.items.find(item => item._id.toString() === itemId);

        if (!item) {
            return res.status(404).json({ message: "Item not found in cart." });
        }

        item.quantity = quantity; // Update the quantity

        // Save the updated cart
        await cart.save();

        return res.status(200).json({ message: "Item quantity updated successfully.", data: cart });

    } catch (error) {
        console.error("Error in updating quantity:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

const RemoveItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.body;

        // Validate inputs
        if (!itemId) {
            return res.status(400).json({ message: "itemId is required." });
        }

        // Find the user's cart
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ message: "Cart not found." });
        }

        // Check if the item exists in the cart
        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);

        if (itemIndex === -1) {
            return res.status(404).json({ message: "Item not found in cart." });
        }

        // Remove the item from the cart
        cart.items.splice(itemIndex, 1);

        // Save the updated cart
        await cart.save();

        return res.status(200).json({ message: "Item removed successfully.", data: cart });

    } catch (error) {
        console.error("Error in removing item:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};





module.exports = {
    AddCart,
    CartDetails,
    UpdateQuantity,
    RemoveItem

}