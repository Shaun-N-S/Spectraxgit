const express = require("express");
const userRoutes = express.Router();
const {signup,login,verifyOtp,resendOtp, googleAuth,refreshAccessToken,forgotPassword,forgotPasswordVerifyOtp, logoutUser, resetPassword, upadateProfile, userProfile, updatePassword} = require('../controller/userController')
const { verifyAccessToken } = require('../middleware/authMiddleware');
const { showProducts, showProductById, productsByCategory, showProductsIsActive, filteredProduct, searchProducts } = require("../controller/productController");
const { showBrandbyId } = require("../controller/brandController");
const { addAddress, fetchAddress , updateAddressStatus, updateAddress, fetchAddressById} = require("../controller/addressController");
const { AddCart, CartDetails, UpdateQuantity, RemoveItem } = require("../controller/cartController");
const { getAllCategoriesIsactive } = require("../controller/categoryController");
const { getallIsactiveBrands } = require("../controller/brandController");
const { placeOrder, fetchOrders, orderById, orderStatusUpdate, verifyRazorpayPayment, createRazorpayOrder, refundOrders, returnOrderStatusUpdate, placeWalletOrder } = require("../controller/orderController");
const { validateCoupon } = require("../controller/CouponController");
const { addToWishlist, getWishlist, removeFromWishlist } = require("../controller/wishlistController");
const { getWallet } = require("../controller/walletController");
const { fetchOfferById , fetchOfferOfCategory} = require("../controller/offerController");
const { verifyUser } = require("../middleware/userAuth");




// ------------------ Authentication Routes ------------------
userRoutes.post("/sign", signup);
userRoutes.post("/login", login);
userRoutes.post('/logout', logoutUser);
userRoutes.post("/verify-otp", verifyOtp);
userRoutes.post("/resend-otp", resendOtp);
userRoutes.post("/forgot-password", forgotPassword);
userRoutes.post("/forgot-password-verifyOtp", forgotPasswordVerifyOtp);
userRoutes.post('/reset-password', resetPassword);
userRoutes.post("/google-auth", googleAuth);
userRoutes.get('/refresh-token', refreshAccessToken);

// Token Verification
userRoutes.post('/verifytoken', verifyAccessToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// ------------------ Product Routes ------------------
userRoutes.get('/showproductsisActive', showProductsIsActive);
userRoutes.get('/showproducts', showProducts);
userRoutes.get('/showProductsById/:id', showProductById);
userRoutes.get('/productsByCategory/:id', productsByCategory);
userRoutes.get('/filterProduct', filteredProduct);

// ------------------ Brand Routes ------------------
userRoutes.get('/showBrandbyId/:id', showBrandbyId);
userRoutes.get('/Brand/active', getallIsactiveBrands);

// ------------------ Category Routes ------------------
userRoutes.get('/category/active', getAllCategoriesIsactive);

// ------------------ User Profile and Account Routes ------------------
userRoutes.post('/updateProfile', upadateProfile);
userRoutes.get('/User/Details/:id', userProfile);
userRoutes.put('/User/Password', updatePassword);

// ------------------ Address Management Routes ------------------
userRoutes.post('/addAddress', addAddress);
userRoutes.get('/User/Address/:id', fetchAddress);
userRoutes.put('/address/:id/status', updateAddressStatus);
userRoutes.put('/User/Address/:id', updateAddress);
userRoutes.get('/fetch/Address/:id', fetchAddressById);

// ------------------ Cart Management Routes ------------------
userRoutes.post('/Cart', AddCart);
userRoutes.post('/cart/details', CartDetails);
userRoutes.patch('/cart/update-quantity', UpdateQuantity);
userRoutes.delete('/cart/remove-item/:id', RemoveItem);

// ------------------ Order Management Routes ------------------
userRoutes.post('/place-order', placeOrder);
userRoutes.get('/fetch/orders/:id', fetchOrders);
userRoutes.get('/fetch/order-details/:id', orderById);
userRoutes.post('/update/order-status/:id', orderStatusUpdate);
userRoutes.post('/create-razorpay-order', createRazorpayOrder);
userRoutes.post('/verify-payment', verifyRazorpayPayment);
userRoutes.post('/refund-order/:orderId',refundOrders)
userRoutes.post('/order/status/:id', orderStatusUpdate);
userRoutes.post('/order/return/:id',returnOrderStatusUpdate)



// ------------------ Coupon Management Routes ------------------
userRoutes.post('/validate-coupon', validateCoupon);


// ------------------Wishlist Management Routes ------------------
userRoutes.post('/add/wishlist',addToWishlist);
userRoutes.post('/remove/wishlist', removeFromWishlist);
userRoutes.get('/wishlist/:userId', getWishlist);

// ------------------Wallet Management Routes ------------------
userRoutes.get('/Wallet/:userId',getWallet);
userRoutes.post('/wallet-payment',placeWalletOrder);

// ------------------Offer Management Routes ------------------
userRoutes.get('/Offer/fetch/:id',fetchOfferById)
userRoutes.get('/Offer/category/:id',fetchOfferOfCategory)

// ------------------Search Management Routes ------------------
userRoutes.get('/search/products',searchProducts)


module.exports = userRoutes;
