const express = require("express");
const userRoutes = express.Router();

const { USER_ROUTES } = require("../constants/routes");

const {
  signup,
  login,
  verifyOtp,
  resendOtp,
  googleAuth,
  refreshAccessToken,
  forgotPassword,
  forgotPasswordVerifyOtp,
  logoutUser,
  resetPassword,
  updateProfile,
  userProfile,
  updatePassword,
} = require("../controller/userController");

const { verifyAccessToken } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");

const {
  showProducts,
  showProductById,
  productsByCategory,
  showProductsIsActive,
  filteredProduct,
  searchProducts,
} = require("../controller/productController");

const {
  showBrandbyId,
  getallIsactiveBrands,
} = require("../controller/brandController");

const {
  addAddress,
  fetchAddress,
  updateAddressStatus,
  updateAddress,
  fetchAddressById,
} = require("../controller/addressController");

const {
  AddCart,
  CartDetails,
  UpdateQuantity,
  RemoveItem,
} = require("../controller/cartController");

const {
  getAllCategoriesIsactive,
} = require("../controller/categoryController");

const {
  placeOrder,
  fetchOrders,
  orderById,
  orderStatusUpdate,
  verifyRazorpayPayment,
  createRazorpayOrder,
  refundOrders,
  returnOrderStatusUpdate,
  placeWalletOrder,
} = require("../controller/orderController");

const { validateCoupon } = require("../controller/CouponController");

const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} = require("../controller/wishlistController");

const { getWallet } = require("../controller/walletController");

const {
  fetchOfferById,
  fetchOfferOfCategory,
} = require("../controller/offerController");

// ================= Authentication =================

userRoutes.post(USER_ROUTES.SIGNUP, authLimiter, signup);
userRoutes.post(USER_ROUTES.LOGIN, authLimiter, login);
userRoutes.post(USER_ROUTES.LOGOUT, logoutUser);

userRoutes.post(USER_ROUTES.VERIFY_OTP, authLimiter, verifyOtp);
userRoutes.post(USER_ROUTES.RESEND_OTP, authLimiter, resendOtp);

userRoutes.post(USER_ROUTES.FORGOT_PASSWORD, authLimiter, forgotPassword);
userRoutes.post(
  USER_ROUTES.FORGOT_PASSWORD_VERIFY_OTP,
  authLimiter,
  forgotPasswordVerifyOtp,
);

userRoutes.post(USER_ROUTES.RESET_PASSWORD, authLimiter, resetPassword);

userRoutes.post(USER_ROUTES.GOOGLE_AUTH, authLimiter, googleAuth);

userRoutes.get(USER_ROUTES.REFRESH_TOKEN, authLimiter, refreshAccessToken);

userRoutes.post(USER_ROUTES.VERIFY_TOKEN, verifyAccessToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user,
  });
});

// ================= Products =================

userRoutes.get(USER_ROUTES.PRODUCTS_ACTIVE, showProductsIsActive);

userRoutes.get(USER_ROUTES.PRODUCTS, showProducts);

userRoutes.get(USER_ROUTES.PRODUCT_BY_ID, showProductById);

userRoutes.get(USER_ROUTES.PRODUCTS_BY_CATEGORY, productsByCategory);

userRoutes.get(USER_ROUTES.FILTER_PRODUCTS, filteredProduct);

userRoutes.get(USER_ROUTES.SEARCH_PRODUCTS, searchProducts);

// ================= Brands =================

userRoutes.get(USER_ROUTES.BRAND_BY_ID, showBrandbyId);

userRoutes.get(USER_ROUTES.ACTIVE_BRANDS, getallIsactiveBrands);

// ================= Categories =================

userRoutes.get(USER_ROUTES.ACTIVE_CATEGORIES, getAllCategoriesIsactive);

// ================= User Profile =================

userRoutes.post(USER_ROUTES.UPDATE_PROFILE, verifyAccessToken, updateProfile);

userRoutes.get(USER_ROUTES.PROFILE, verifyAccessToken, userProfile);

userRoutes.put(USER_ROUTES.UPDATE_PASSWORD, verifyAccessToken, updatePassword);

// ================= Address =================

userRoutes.post(USER_ROUTES.ADD_ADDRESS, verifyAccessToken, addAddress);

userRoutes.get(USER_ROUTES.USER_ADDRESS, verifyAccessToken, fetchAddress);

userRoutes.put(
  USER_ROUTES.ADDRESS_STATUS,
  verifyAccessToken,
  updateAddressStatus,
);

userRoutes.put(USER_ROUTES.USER_ADDRESS, verifyAccessToken, updateAddress);

userRoutes.get(USER_ROUTES.FETCH_ADDRESS, verifyAccessToken, fetchAddressById);

// ================= Cart =================

userRoutes.post(USER_ROUTES.CART, verifyAccessToken, AddCart);

userRoutes.post(USER_ROUTES.CART_DETAILS, verifyAccessToken, CartDetails);

userRoutes.patch(
  USER_ROUTES.CART_UPDATE_QUANTITY,
  verifyAccessToken,
  UpdateQuantity,
);

userRoutes.delete(USER_ROUTES.CART_REMOVE_ITEM, verifyAccessToken, RemoveItem);

// ================= Orders =================

userRoutes.post(USER_ROUTES.PLACE_ORDER, verifyAccessToken, placeOrder);

userRoutes.get(USER_ROUTES.FETCH_ORDERS, verifyAccessToken, fetchOrders);

userRoutes.get(USER_ROUTES.ORDER_DETAILS, verifyAccessToken, orderById);

userRoutes.post(USER_ROUTES.ORDER_STATUS, verifyAccessToken, orderStatusUpdate);

userRoutes.post(
  USER_ROUTES.CREATE_RAZORPAY_ORDER,
  verifyAccessToken,
  createRazorpayOrder,
);

userRoutes.post(
  USER_ROUTES.VERIFY_PAYMENT,
  verifyAccessToken,
  verifyRazorpayPayment,
);

userRoutes.post(USER_ROUTES.REFUND_ORDER, verifyAccessToken, refundOrders);

userRoutes.post(
  USER_ROUTES.RETURN_ORDER,
  verifyAccessToken,
  returnOrderStatusUpdate,
);

// ================= Coupons =================

userRoutes.post(USER_ROUTES.VALIDATE_COUPON, verifyAccessToken, validateCoupon);

// ================= Wishlist =================

userRoutes.post(USER_ROUTES.ADD_WISHLIST, verifyAccessToken, addToWishlist);

userRoutes.post(
  USER_ROUTES.REMOVE_WISHLIST,
  verifyAccessToken,
  removeFromWishlist,
);

userRoutes.get(USER_ROUTES.WISHLIST, verifyAccessToken, getWishlist);

// ================= Wallet =================

userRoutes.get(USER_ROUTES.WALLET, verifyAccessToken, getWallet);

userRoutes.post(
  USER_ROUTES.WALLET_PAYMENT,
  verifyAccessToken,
  placeWalletOrder,
);

// ================= Offers =================

userRoutes.get(USER_ROUTES.OFFER_BY_ID, fetchOfferById);

userRoutes.get(USER_ROUTES.OFFER_BY_CATEGORY, fetchOfferOfCategory);

module.exports = userRoutes;
