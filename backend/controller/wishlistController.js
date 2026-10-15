const mongoose = require("mongoose");
const Wishlist = require("../models/wishlistSchema");
const Product = require("../models/productSchema");
const { HTTP_STATUS } = require("../constants/httpStatus");
const { COMMON_MESSAGES, WISHLIST_MESSAGES } = require("../constants/messages");
const {
  isPaginationRequested,
  parsePagination,
  buildPagination,
} = require("../utils/pagination");

const WISHLIST_PAGE_SIZE = 5;

const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, variantId } = req.body;

    // Validate required fields
    if (!productId || !variantId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: WISHLIST_MESSAGES.PRODUCT_AND_VARIANT_REQUIRED,
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(productId) ||
      !mongoose.Types.ObjectId.isValid(variantId)
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: WISHLIST_MESSAGES.INVALID_IDS,
      });
    }

    // Find the product to verify it exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: COMMON_MESSAGES.PRODUCT_NOT_FOUND,
      });
    }

    // The variant must belong to this product
    if (
      !product.variants.some(
        (variant) => variant._id.toString() === String(variantId),
      )
    ) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: WISHLIST_MESSAGES.VARIANT_NOT_FOUND,
      });
    }

    // Find existing wishlist for the user
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      // Create new wishlist if it doesn't exist
      wishlist = new Wishlist({
        userId,
        product: [
          {
            productId,
            variantId,
          },
        ],
      });
    } else {
      // Check if product already exists in wishlist
      const productExists = wishlist.product.some(
        (item) =>
          item.productId.toString() === productId &&
          item.variantId.toString() === variantId,
      );

      if (productExists) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: WISHLIST_MESSAGES.ALREADY_IN_WISHLIST,
        });
      }

      // Add new product to existing wishlist
      wishlist.product.push({
        productId,
        variantId,
      });
    }

    await wishlist.save();

    // Populate product details before sending response
    const populatedWishlist = await Wishlist.findById(wishlist._id)
      .populate("product.productId")
      .populate("userId", "name email");

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: WISHLIST_MESSAGES.ADDED,
      wishlist: populatedWishlist,
    });
  } catch (error) {
    console.error("Error in addToWishlist:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: WISHLIST_MESSAGES.ADD_FAILED,
    });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, variantId } = req.body;

    if (!productId || !variantId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: WISHLIST_MESSAGES.PRODUCT_AND_VARIANT_REQUIRED,
      });
    }

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: WISHLIST_MESSAGES.NOT_FOUND,
      });
    }

    // Remove specific product variant from wishlist
    wishlist.product = wishlist.product.filter(
      (item) =>
        !(
          item.productId.toString() === productId &&
          item.variantId.toString() === variantId
        ),
    );

    await wishlist.save();

    // Populate product details before sending response
    const populatedWishlist = await Wishlist.findById(wishlist._id)
      .populate("product.productId")
      .populate("userId", "name email");

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: WISHLIST_MESSAGES.REMOVED,
      wishlist: populatedWishlist,
    });
  } catch (error) {
    console.error("Error in removeFromWishlist:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: WISHLIST_MESSAGES.REMOVE_FAILED,
    });
  }
};

const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlist = await Wishlist.findOne({ userId })
      .populate("product.productId")
      .populate("userId", "name email");

    if (isPaginationRequested(req.query)) {
      const { page, limit } = parsePagination(req.query, WISHLIST_PAGE_SIZE);
      const wishlistData = wishlist ? wishlist.toObject() : { product: [] };
      const visibleItems = wishlistData.product.filter(
        (item) => item.productId && item.productId.status === "active",
      );
      const pagination = buildPagination(visibleItems.length, page, limit);
      const start = (pagination.currentPage - 1) * limit;

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: wishlist
          ? WISHLIST_MESSAGES.FETCHED
          : WISHLIST_MESSAGES.NO_WISHLIST,
        wishlist: {
          ...wishlistData,
          product: visibleItems.slice(start, start + limit),
        },
        pagination,
      });
    }

    if (!wishlist) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: WISHLIST_MESSAGES.NO_WISHLIST,
        wishlist: { product: [] },
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: WISHLIST_MESSAGES.FETCHED,
      wishlist,
    });
  } catch (error) {
    console.error("Error in getWishlist:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: WISHLIST_MESSAGES.FETCH_FAILED,
    });
  }
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
};
