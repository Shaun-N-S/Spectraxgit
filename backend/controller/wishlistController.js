const Wishlist = require('../models/wishlistSchema');
const Product = require('../models/productSchema');

const addToWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, variantId } = req.body;

        // Validate required fields
        if (!productId || !variantId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: productId and variantId are required"
            });
        }

        // Find the product to verify it exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ 
                success: false,
                message: "Product not found" 
            });
        }

        // Find existing wishlist for the user
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            // Create new wishlist if it doesn't exist
            wishlist = new Wishlist({
                userId,
                product: [{
                    productId,
                    variantId
                }]
            });
        } else {
            // Check if product already exists in wishlist
            const productExists = wishlist.product.some(item => 
                item.productId.toString() === productId &&
                item.variantId.toString() === variantId
            );

            if (productExists) {
                return res.status(400).json({ 
                    success: false,
                    message: "This product variant is already in your wishlist"
                });
            }

            // Add new product to existing wishlist
            wishlist.product.push({
                productId,
                variantId
            });
        }

        await wishlist.save();

        // Populate product details before sending response
        const populatedWishlist = await Wishlist.findById(wishlist._id)
            .populate('product.productId')
            .populate('userId', 'name email');

        return res.status(200).json({
            success: true,
            message: "Product added to wishlist successfully!",
            wishlist: populatedWishlist
        });

    } catch (error) {
        console.error("Error in addToWishlist:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while adding product to wishlist"
        });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, variantId } = req.body;

        if (!productId || !variantId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: productId and variantId are required"
            });
        }

        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({ 
                success: false,
                message: "Wishlist not found" 
            });
        }

        // Remove specific product variant from wishlist
        wishlist.product = wishlist.product.filter(item => 
            !(item.productId.toString() === productId && 
              item.variantId.toString() === variantId)
        );

        await wishlist.save();

        // Populate product details before sending response
        const populatedWishlist = await Wishlist.findById(wishlist._id)
            .populate('product.productId')
            .populate('userId', 'name email');

        return res.status(200).json({
            success: true,
            message: "Product removed from wishlist successfully!",
            wishlist: populatedWishlist
        });

    } catch (error) {
        console.error("Error in removeFromWishlist:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while removing product from wishlist"
        });
    }
};

const getWishlist = async (req, res) => {
    try {
        const userId = req.user.id;

        const wishlist = await Wishlist.findOne({ userId })
            .populate('product.productId')
            .populate('userId', 'name email');

        if (!wishlist) {
            return res.status(200).json({
                success: true,
                message: "No wishlist found for this user",
                wishlist: { product: [] }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Wishlist fetched successfully",
            wishlist
        });

    } catch (error) {
        console.error("Error in getWishlist:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching wishlist"
        });
    }
};



module.exports = {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
}