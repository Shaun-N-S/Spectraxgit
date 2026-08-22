const USER_ROUTES = {
  // Authentication
  SIGNUP: "/sign",
  LOGIN: "/login",
  LOGOUT: "/logout",
  VERIFY_OTP: "/verify-otp",
  RESEND_OTP: "/resend-otp",
  FORGOT_PASSWORD: "/forgot-password",
  FORGOT_PASSWORD_VERIFY_OTP: "/forgot-password-verifyOtp",
  RESET_PASSWORD: "/reset-password",
  GOOGLE_AUTH: "/google-auth",
  REFRESH_TOKEN: "/refresh-token",
  VERIFY_TOKEN: "/verifytoken",

  // User Profile
  UPDATE_PROFILE: "/updateProfile",
  PROFILE: "/profile",
  UPDATE_PASSWORD: "/User/Password",

  // Address
  ADD_ADDRESS: "/addAddress",
  USER_ADDRESS: "/User/Address/:id",
  ADDRESS_STATUS: "/address/:id/status",
  FETCH_ADDRESS: "/fetch/Address/:id",

  // Cart
  CART: "/Cart",
  CART_DETAILS: "/cart/details",
  CART_UPDATE_QUANTITY: "/cart/update-quantity",
  CART_REMOVE_ITEM: "/cart/remove-item/:id",

  // Orders
  PLACE_ORDER: "/place-order",
  FETCH_ORDERS: "/fetch/orders/:id",
  ORDER_DETAILS: "/fetch/order-details/:id",
  ORDER_STATUS: "/order/status/:id",
  CREATE_RAZORPAY_ORDER: "/create-razorpay-order",
  VERIFY_PAYMENT: "/verify-payment",
  REFUND_ORDER: "/refund-order/:orderId",
  RETURN_ORDER: "/order/return/:id",

  // Coupon
  VALIDATE_COUPON: "/validate-coupon",

  // Wishlist
  ADD_WISHLIST: "/add/wishlist",
  REMOVE_WISHLIST: "/remove/wishlist",
  WISHLIST: "/wishlist/:userId",

  // Wallet
  WALLET: "/Wallet/:userId",
  WALLET_PAYMENT: "/wallet-payment",

  // Products
  PRODUCTS_ACTIVE: "/showproductsisActive",
  PRODUCTS: "/showproducts",
  PRODUCT_BY_ID: "/showProductsById/:id",
  PRODUCTS_BY_CATEGORY: "/productsByCategory/:id",
  FILTER_PRODUCTS: "/filterProduct",
  SEARCH_PRODUCTS: "/search/products",

  // Brands
  BRAND_BY_ID: "/showBrandbyId/:id",
  ACTIVE_BRANDS: "/Brand/active",

  // Categories
  ACTIVE_CATEGORIES: "/category/active",

  // Offers
  OFFER_BY_ID: "/Offer/fetch/:id",
  OFFER_BY_CATEGORY: "/Offer/category/:id",
};

const ADMIN_ROUTES = {
  // Authentication
  LOGIN: "/login",
  LOGOUT: "/logout",

  // Users
  FETCH_ALL_USERS: "/fetchallusers",
  UPDATE_USER_STATUS: "/updateuserstatus/:id",

  // Products
  ADD_PRODUCT: "/product",
  SHOW_PRODUCTS: "/showproducts",
  SHOW_PRODUCT_BY_ID: "/showProductById/:id",
  SHOW_PRODUCTS_ACTIVE: "/showproductsIsActive",
  SHOW_PRODUCTS_ACTIVE_OFFER: "/showproductsIsActiveOffer",
  EDIT_PRODUCT: "/product/:id",
  TOGGLE_PRODUCT_STATUS: "/toggleProductStatus/:id",

  // Categories
  ADD_CATEGORY: "/category",
  GET_ALL_CATEGORIES: "/getallcategory",
  GET_ALL_CATEGORIES_ACTIVE: "/getallcategoryIsactive",
  EDIT_CATEGORY: "/editcategory/:id",
  TOGGLE_CATEGORY_STATUS: "/toggleCategoryStatus/:id",

  // Brands
  ADD_BRAND: "/addbrand",
  GET_ALL_BRANDS: "/getallbrands",
  GET_ALL_BRANDS_ACTIVE: "/getallIsactiveBrands",
  TOGGLE_BRAND_STATUS: "/toggleBrandStatus/:id",
  UPDATE_BRAND_NAME: "/updateBrandName/:id",

  // Orders
  GET_ALL_ORDERS: "/orders",
  ORDER_STATUS: "/order/status/:id",

  // Coupons
  ADD_COUPON: "/Coupon/Add",
  FETCH_COUPONS: "/Coupon/fetch",
  UPDATE_COUPON: "/Coupon/update",
  REMOVE_COUPON: "/Coupon/remove",

  // Offers
  ADD_OFFER: "/Offer/Add",
  FETCH_OFFERS: "/Offer/fetch",
  REMOVE_OFFER: "/Offer/remove/:id",
  UPDATE_OFFER: "/Offer/update/:id",

  
  // Sales Reports
  SALES_REPORT: "/sales-report",
  SALES_ANALYTICS: "/sales-analytics",
};

module.exports = {
  USER_ROUTES,
  ADMIN_ROUTES,
};
