const express = require("express");
const adminRoutes = express.Router();

const { ADMIN_ROUTES } = require("../constants/routes");

// Controllers
const {
  adminLogin,
  logoutAdmin,
  fetchAllUsers,
} = require("../controller/adminController");
const { verifyAdmin } = require("../middleware/verifyAdmin");
const { adminAuthLimiter } = require("../middleware/rateLimiter");
const {
  addProduct,
  showProducts,
  editProduct,
  showProductById,
  toggleProductStatus,
  showProductsIsActive,
  showProductsIsActiveOffer,
} = require("../controller/productController");
const {
  addCategory,
  getAllCategories,
  editCategory,
  toggleCategoryStatus,
  getAllCategoriesIsactive,
} = require("../controller/categoryController");
const { updateUserStatus } = require("../controller/userController");
const {
  addBrand,
  getAllBrand,
  toggleBrandStatus,
  updateBrandName,
  getallIsactiveBrands,
} = require("../controller/brandController");
const {
  getallorders,
  orderStatusUpdate,
} = require("../controller/orderController");
const {
  addCoupon,
  allCoupons,
  updateCoupon,
  removeCoupon,
} = require("../controller/CouponController");
const {
  addOffer,
  allOffers,
  deleteOffers,
  updateOffer,
} = require("../controller/offerController");
const {
  salesReport,
  getSalesAnalytics,
} = require("../controller/salesController");

// ------------------ Authentication Routes ------------------
adminRoutes.post(ADMIN_ROUTES.LOGIN, adminAuthLimiter, adminLogin);
adminRoutes.post(ADMIN_ROUTES.LOGOUT, verifyAdmin, logoutAdmin);

// ------------------ User Management Routes ------------------
adminRoutes.get(ADMIN_ROUTES.FETCH_ALL_USERS, verifyAdmin, fetchAllUsers);
adminRoutes.patch(
  ADMIN_ROUTES.UPDATE_USER_STATUS,
  verifyAdmin,
  updateUserStatus,
);

// ------------------ Product Management Routes ------------------
adminRoutes.post(ADMIN_ROUTES.ADD_PRODUCT, verifyAdmin, addProduct);
adminRoutes.get(ADMIN_ROUTES.SHOW_PRODUCTS, verifyAdmin, showProducts);
adminRoutes.get(
  ADMIN_ROUTES.SHOW_PRODUCT_BY_ID,
  verifyAdmin,
  showProductById,
);
adminRoutes.get(
  ADMIN_ROUTES.SHOW_PRODUCTS_ACTIVE,
  verifyAdmin,
  showProductsIsActive,
);
adminRoutes.get(
  ADMIN_ROUTES.SHOW_PRODUCTS_ACTIVE_OFFER,
  verifyAdmin,
  showProductsIsActiveOffer,
);
adminRoutes.put(ADMIN_ROUTES.EDIT_PRODUCT, verifyAdmin, editProduct);
adminRoutes.patch(
  ADMIN_ROUTES.TOGGLE_PRODUCT_STATUS,
  verifyAdmin,
  toggleProductStatus,
);

// ------------------ Category Management Routes ------------------
adminRoutes.post(ADMIN_ROUTES.ADD_CATEGORY, verifyAdmin, addCategory);
adminRoutes.get(
  ADMIN_ROUTES.GET_ALL_CATEGORIES,
  verifyAdmin,
  getAllCategories,
);
adminRoutes.get(
  ADMIN_ROUTES.GET_ALL_CATEGORIES_ACTIVE,
  verifyAdmin,
  getAllCategoriesIsactive,
);
adminRoutes.put(ADMIN_ROUTES.EDIT_CATEGORY, verifyAdmin, editCategory);
adminRoutes.patch(
  ADMIN_ROUTES.TOGGLE_CATEGORY_STATUS,
  verifyAdmin,
  toggleCategoryStatus,
);

// ------------------ Brand Management Routes ------------------
adminRoutes.post(ADMIN_ROUTES.ADD_BRAND, verifyAdmin, addBrand);
adminRoutes.get(ADMIN_ROUTES.GET_ALL_BRANDS, verifyAdmin, getAllBrand);
adminRoutes.get(
  ADMIN_ROUTES.GET_ALL_BRANDS_ACTIVE,
  verifyAdmin,
  getallIsactiveBrands,
);
adminRoutes.patch(
  ADMIN_ROUTES.TOGGLE_BRAND_STATUS,
  verifyAdmin,
  toggleBrandStatus,
);
adminRoutes.patch(
  ADMIN_ROUTES.UPDATE_BRAND_NAME,
  verifyAdmin,
  updateBrandName,
);

// ------------------ Order Management Routes ------------------
adminRoutes.get(ADMIN_ROUTES.GET_ALL_ORDERS, verifyAdmin, getallorders);
adminRoutes.post(ADMIN_ROUTES.ORDER_STATUS, verifyAdmin, orderStatusUpdate);

// ------------------ Coupon Management Routes ------------------
adminRoutes.post(ADMIN_ROUTES.ADD_COUPON, verifyAdmin, addCoupon);
adminRoutes.get(ADMIN_ROUTES.FETCH_COUPONS, verifyAdmin, allCoupons);
adminRoutes.post(ADMIN_ROUTES.UPDATE_COUPON, verifyAdmin, updateCoupon);
adminRoutes.patch(ADMIN_ROUTES.REMOVE_COUPON, verifyAdmin, removeCoupon);

// ------------------ Offer Management Routes ------------------
adminRoutes.post(ADMIN_ROUTES.ADD_OFFER, verifyAdmin, addOffer);
adminRoutes.get(ADMIN_ROUTES.FETCH_OFFERS, verifyAdmin, allOffers);
adminRoutes.delete(ADMIN_ROUTES.REMOVE_OFFER, verifyAdmin, deleteOffers);
adminRoutes.put(ADMIN_ROUTES.UPDATE_OFFER, verifyAdmin, updateOffer);

// ------------------ Sales Report Management Routes ------------------
adminRoutes.get(ADMIN_ROUTES.SALES_REPORT, verifyAdmin, salesReport);
adminRoutes.get(
  ADMIN_ROUTES.SALES_ANALYTICS,
  verifyAdmin,
  getSalesAnalytics,
);

module.exports = adminRoutes;
