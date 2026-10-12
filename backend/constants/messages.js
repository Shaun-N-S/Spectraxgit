const COMMON_MESSAGES = Object.freeze({
  INTERNAL_SERVER_ERROR: "Internal server error",
  INTERNAL_SERVER_ERROR_WITH_PERIOD: "Internal server error.",
  INTERNAL_SERVER_ERROR_WITH_SPACED_PERIOD: "Internal server error .",
  INTERNAL_SERVER_ERROR_TITLE_CASE: "Internal Server Error",
  INTERNAL_SERVER_ERROR_OCCURRED: "An internal server error occurred",
  SERVER_ERROR: "Server error",
  ALL_FIELDS_REQUIRED: "All fields are required",
  ALL_FIELDS_REQUIRED_WITH_PERIOD: "All fields are required.",
  INVALID_NAME: "Invalid name",
  USER_NOT_FOUND: "User not found",
  USER_NOT_FOUND_WITH_PERIOD: "User not found.",
  PRODUCT_NOT_FOUND: "Product not found",
  PRODUCT_NOT_FOUND_WITH_TRAILING_SPACE: "Product not found ",
  TOO_MANY_REQUESTS: "Too many requests. Please try again later.",
});

const AUTH_MESSAGES = Object.freeze({
  INVALID_EMAIL: "Invalid email",
  INVALID_CREDENTIALS: "Invalid credentials",
  INVALID_PASSWORD: "Invalid password",
  NO_ACCESS: "No access",
  ADMIN_LOGIN_SUCCESS: "Login Successful",
  LOGOUT_SUCCESS: "Logged out successfully",
  LOGOUT_FAILED: "Internal server error during logout",
  PASSWORDS_DO_NOT_MATCH: "Passwords do not match",
  EMAIL_ALREADY_REGISTERED: "User with this email already exists",
  VERIFICATION_EMAIL_FAILED: "Failed to send verification email",
  OTP_SENT: "OTP sent successfully",
  OTP_RESENT: "OTP resent successfully",
  OTP_RESEND_FAILED: "Failed to resend OTP",
  OTP_REQUIRED: "Please enter OTP",
  OTP_EXPIRED: "OTP has expired. Please request a new one.",
  INVALID_OTP: "Invalid OTP",
  OTP_VERIFIED: "OTP verified successfully",
  NO_PENDING_VERIFICATION: "No pending verification found. Please start over.",
  SIGNUP_SESSION_EXPIRED: "Signup session expired. Please sign up again.",
  USER_REGISTERED: "User registered successfully",
  GOOGLE_TOKEN_REQUIRED: "Token is required",
  GOOGLE_LOGIN_SUCCESS: "Google login successful",
  GOOGLE_ACCOUNT_PASSWORD_LOGIN:
    "This account uses Google Sign-In. Please log in with Google.",
  INVALID_EMAIL_OR_PASSWORD: "Invalid email or password",
  ACCOUNT_RESTRICTED:
    "Your account is temporarily restricted. Please contact support.",
  ACCOUNT_NOT_ACTIVE: "Account is not active. Please contact support.",
  CHECK_ROLE: "Check your role",
  USER_LOGGED_IN: "User logged in",
  ACCESS_TOKEN_MISSING: "Access token is missing",
  INVALID_ACCESS_TOKEN: "Invalid or expired access token",
  NO_REFRESH_TOKEN: "No refresh token provided",
  INVALID_REFRESH_TOKEN: "Invalid or expired refresh token",
  TOKEN_REFRESHED: "Token refreshed successfully",
  RESET_SESSION_EXPIRED: "Session expired. Please try again.",
  PASSWORD_RESET_SUCCESS: "Password reset successfully.",
  ADMIN_NOT_FOUND: "Admin not found",
  ACCESS_DENIED: "Access denied",
  NOT_AUTHORIZED_TOKEN_FAILED: "Not authorized token failed",
  NOT_AUTHORIZED_NO_TOKEN: "Not authorized , no token",
});

const USER_MESSAGES = Object.freeze({
  NO_USERS_FOUND: "No users found",
  USERS_FETCHED: "Users fetched successfully",
  USER_FOUND: "User found successfully",
  STATUS_UPDATED: "User status updated successfully",
  STATUS_UPDATE_FAILED: "Error updating user status",
  EMAIL_REQUIRED: "Email is required",
  PROFILE_UPDATED: "Profile updated successfully",
  INVALID_OLD_PASSWORD: "Invalid old password",
  PASSWORD_UPDATED: "Password updated successfully",
});

const PRODUCT_MESSAGES = Object.freeze({
  ADDED: "Product added successfully",
  DUPLICATE_TITLE_OR_SKU: "Duplicate key error: title or SKU must be unique",
  LIST_RETRIEVED: "Products retrieved successfully",
  RETRIEVED: "Product retrieved successfully",
  UPDATED: "Product updated successfully",
  CATEGORY_ID_REQUIRED: "Category ID is required",
  NONE_IN_CATEGORY: "No products found for this category",
  SEARCH_FAILED: "Error searching products",
  INVALID_PRICE: "Price must be a number greater than 0",
  INVALID_QUANTITY: "Available quantity must be a whole number of 0 or more",
  INVALID_VARIANTS: "Variants must be a list",
  variantSkuRequired: (index) => `Variant ${index + 1}: SKU is required`,
  variantInvalidPrice: (index) =>
    `Variant ${index + 1}: price must be a number greater than 0`,
  variantInvalidQuantity: (index) =>
    `Variant ${index + 1}: quantity must be a whole number of 0 or more`,
  statusUpdated: (status) => `Product Status updated to ${status} `,
});

const CATEGORY_MESSAGES = Object.freeze({
  ALREADY_EXISTS: "Category already exists",
  ADDED: "Category added successfully",
  NOT_FOUND: "Category not found",
  CANNOT_EDIT_INACTIVE: "Cannot edit an inactive category",
  UPDATED: "Category updated successfully",
  statusUpdated: (status) => `Category status updated to ${status}`,
});

const BRAND_MESSAGES = Object.freeze({
  ALREADY_EXISTS: "Brand already exists",
  ADDED: "Brand added successfully",
  NOT_FOUND: "Brand not found",
  FOUND: "Brand found successfully",
  STATUS_UPDATED: "Brand status updated successfully",
  NAME_REQUIRED: "Brand name cannot be empty",
  CANNOT_EDIT_INACTIVE: "Cannot edit an inactive brand",
  NAME_UPDATED: "Brand name updated successfully",
});

const ADDRESS_MESSAGES = Object.freeze({
  ALREADY_EXISTS: "Address already exists",
  ADDED: "Address added successfully",
  FETCHED: "Address fetched successfully",
  FOUND: "Address found successfully",
  NOT_FOUND: "Address not found",
  NOT_FOUND_OR_UNAUTHORIZED: "Address not found or unauthorized.",
  ID_REQUIRED: "Address ID is required",
  ID_REQUIRED_WITH_PERIOD: "Address ID is required.",
  UPDATED: "Address updated successfully",
  UPDATE_FAILED: "Failed to update address",
  STATUS_UPDATE_FAILED: "Failed to update address status",
  FETCH_FAILED: "Error fetching address",
  statusChanged: (status) => `Address status changed to ${status} successfully`,
});

const CART_MESSAGES = Object.freeze({
  VARIANT_NOT_FOUND: "Variant not found in product",
  INSUFFICIENT_STOCK: "Insufficient stock for this variant",
  ITEM_ADDED: "Product added to cart successfully",
  CART_FETCHED: "Cart data retrieved successfully.",
  ITEM_ID_AND_QUANTITY_REQUIRED: "itemId and quantity are required.",
  MIN_QUANTITY: "Quantity must be at least 1.",
  CART_NOT_FOUND: "Cart not found.",
  ITEM_NOT_FOUND: "Item not found in cart.",
  QUANTITY_UPDATED: "Item quantity updated successfully.",
  ITEM_ID_REQUIRED: "itemId is required.",
  ITEM_REMOVED: "Item removed successfully.",
});

const WISHLIST_MESSAGES = Object.freeze({
  PRODUCT_AND_VARIANT_REQUIRED:
    "Missing required fields: productId and variantId are required",
  ALREADY_IN_WISHLIST: "This product variant is already in your wishlist",
  ADDED: "Product added to wishlist successfully!",
  ADD_FAILED: "Internal server error while adding product to wishlist",
  NOT_FOUND: "Wishlist not found",
  REMOVED: "Product removed from wishlist successfully!",
  REMOVE_FAILED: "Internal server error while removing product from wishlist",
  NO_WISHLIST: "No wishlist found for this user",
  FETCHED: "Wishlist fetched successfully",
  FETCH_FAILED: "Internal server error while fetching wishlist",
});

const COUPON_MESSAGES = Object.freeze({
  ALREADY_EXISTS: "This coupon already exists",
  CREATED: "Coupon created successfully",
  CREATE_FAILED: "An error occurred while creating the coupon",
  NOT_FOUND: "Coupon not found.",
  FETCHED: "Coupon fetched successfully !",
  ID_REQUIRED_FOR_UPDATE: "ID is required to update the coupon.",
  UPDATED: "Coupon updated successfully!",
  ID_REQUIRED_FOR_REMOVE: "Coupon ID is required for removing the coupon.",
  BLOCKED: "Coupon status updated to blocked successfully.",
  INVALID_CODE: "Invalid coupon code",
  INVALID_OR_EXPIRED: "Invalid or expired coupon code",
  APPLIED: "Coupon applied successfully",
  VALIDATE_FAILED: "An error occurred while validating the coupon",
  minimumPurchaseRequired: (minimumPrice) =>
    `Minimum purchase amount of ₹${minimumPrice} required for this coupon`,
});

const OFFER_MESSAGES = Object.freeze({
  DISCOUNT_OUT_OF_RANGE: "Discount percentage must be between 0 and 100.",
  ADDED: "Offer added successfully.",
  ADD_FAILED: "Error in adding offer.",
  NONE_FOUND: "No offer found.",
  LIST_FETCHED: "Offers fetched successfully.",
  LIST_FETCH_FAILED: "Error in fetching offers.",
  ID_REQUIRED: "Offer ID is required.",
  NOT_FOUND: "Offer not found",
  NOT_FOUND_WITH_PERIOD: "Offer not found.",
  DELETED: "Offer deleted successfully.",
  DELETE_FAILED: "Error in deleting offers.",
  UPDATED: "Offer updated successfully.",
  UPDATE_FAILED: "Error in updating offer.",
  FETCHED: "Offer fetched successfully.",
  FETCH_BY_ID_FAILED: "Error in fetching offer by Id.",
  NO_CATEGORY_OFFER: "No offer associated with this category",
  CATEGORY_OFFER_FETCHED: "Category offer fetched successfully",
  targetNotFound: (targetType) => `${targetType} not found.`,
});

const ORDER_MESSAGES = Object.freeze({
  PRODUCTS_REQUIRED: "At least one product is required.",
  INVALID_PRODUCT_ITEM: "Each product item must be a valid object.",
  PRODUCT_ID_REQUIRED: "productId is required for every product item.",
  VARIANT_ID_REQUIRED: "variantId is required for every product item.",
  INVALID_QUANTITY:
    "A valid positive quantity is required for every product item.",
  VARIANT_DETAILS_REQUIRED:
    "Variant details are required for every product item.",
  INVALID_VARIANT_PRICE:
    "A valid variant price is required for every product item.",
  PLACED: "Order placed successfully.",
  PLACED_WITH_WALLET: "Order placed successfully using wallet.",
  CREATED_WITH_PAYMENT_FAILURE: "Order created with payment failure",
  PLACE_FAILED: "Failed to place order",
  ID_REQUIRED: "Order ID is required.",
  NOT_FOUND: "Order not found",
  NOT_FOUND_WITH_PERIOD: "Order not found.",
  LIST_NOT_FOUND: "Orders not found . ",
  LIST_FOUND: "Orders found successfully . ",
  USER_ORDERS_FETCHED: "Order details fetched successfully!",
  USER_ORDERS_FETCH_FAILED: "Error in fetching order.",
  DETAILS_FETCHED: "Order details fetched successfully.",
  DETAILS_FETCH_FAILED: "An error occurred while fetching order details.",
  STATUS_REQUIRED: "Status is required",
  INVALID_STATUS: "Invalid order status",
  STATUS_UPDATED: "Order status updated successfully",
  STATUS_UPDATE_FAILED: "Error updating order status",
  insufficientStockForProduct: (productName) =>
    `Insufficient stock for product ${productName}`,
  cannotCancelWithStatus: (orderStatus) =>
    `Cannot cancel the order with current status ${orderStatus}`,
});

const RETURN_MESSAGES = Object.freeze({
  INVALID_STATUS: "Invalid status for return order",
  REASON_AND_DESCRIPTION_REQUIRED: "Return reason and description are required",
  ONLY_DELIVERED_RETURNABLE: "Only delivered orders can be returned",
  PROCESSED: "Return processed successfully",
  PROCESS_FAILED: "Error processing return order",
  REFUND_FAILED: "Failed to process refund",
  NOT_REFUND_ELIGIBLE:
    "Order is not eligible for refund. Only completed online payments can be refunded.",
  ONLY_CANCELLED_REFUNDABLE: "Only cancelled orders can be refunded",
  ALREADY_REFUNDED: "This order has already been refunded.",
  REFUND_PROCESSED: "Refund processed successfully!",
  REFUND_REQUEST_FAILED: "Error in processing refund, please try again later",
});

const PAYMENT_MESSAGES = Object.freeze({
  INITIALIZATION_FAILED: "Payment initialization failed",
  VERIFICATION_FAILED: "Payment verification failed",
  VERIFIED: "Payment verified successfully",
});

const WALLET_MESSAGES = Object.freeze({
  FETCHED: "Wallet details fetched succesfully !",
  FETCH_FAILED: "Internal Server Error while fetching wallet details.",
  INSUFFICIENT_BALANCE: "Insufficient wallet balance.",
});

const REPORT_MESSAGES = Object.freeze({
  INVALID_DATE_RANGE: "Invalid date range",
  SALES_REPORT_FETCHED: "Sales report fetched successfully",
  SALES_REPORT_FAILED: "Error while fetching sales report",
  ANALYTICS_FETCHED: "Analytics data fetched successfully",
  ANALYTICS_FAILED: "Error while fetching analytics data",
});

module.exports = {
  COMMON_MESSAGES,
  AUTH_MESSAGES,
  USER_MESSAGES,
  PRODUCT_MESSAGES,
  CATEGORY_MESSAGES,
  BRAND_MESSAGES,
  ADDRESS_MESSAGES,
  CART_MESSAGES,
  WISHLIST_MESSAGES,
  COUPON_MESSAGES,
  OFFER_MESSAGES,
  ORDER_MESSAGES,
  RETURN_MESSAGES,
  PAYMENT_MESSAGES,
  WALLET_MESSAGES,
  REPORT_MESSAGES,
};
