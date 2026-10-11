const Coupon = require('../models/CouponSchema');
const User = require('../models/userModel');
const { HTTP_STATUS } = require('../constants/httpStatus');
const { COMMON_MESSAGES, COUPON_MESSAGES } = require('../constants/messages');

const addCoupon = async (req, res) => {
    try {
        const { couponCode, couponType, description, discountValue, minimumPrice, expireDate } = req.body;

        // Check if the coupon already exists
        const existingCoupon = await Coupon.findOne({ name: couponCode });
        if (existingCoupon) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: COUPON_MESSAGES.ALREADY_EXISTS });
        }

        // Create a new coupon
        const newCoupon = new Coupon({
            name: couponCode,
            CouponType: couponType,
            description: description,
            offerPrice: discountValue,
            minimumPrice: minimumPrice,
            expireOn: expireDate,
        });

        // Save the coupon to the database
        await newCoupon.save();

        return res.status(HTTP_STATUS.CREATED).json({
            message: COUPON_MESSAGES.CREATED,
            coupon: newCoupon,
        });
    } catch (error) {
        console.error('Error while creating coupon:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: COUPON_MESSAGES.CREATE_FAILED,
            error: error.message,
        });
    }
};


const allCoupons = async (req,res)=>{
    try {
        
        const couponData = await Coupon.find({isListed:"active"});

        if(!couponData){
            return res.status(HTTP_STATUS.NOT_FOUND).json({message:COUPON_MESSAGES.NOT_FOUND})
        }

        return res.status(HTTP_STATUS.OK).json({message:COUPON_MESSAGES.FETCHED,couponData})

    } catch (error) {
       console.error("Error in fetching all coupons .",error);
       return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message:COMMON_MESSAGES.INTERNAL_SERVER_ERROR,error}) 
    }
}



const updateCoupon = async (req, res) => {
    try {
        const { id, ...updates } = req.body;

        console.log("Received Update Request Body:", req.body);

        if (!id) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: COUPON_MESSAGES.ID_REQUIRED_FOR_UPDATE });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            updates,
            { new: true } 
        );

        if (!updatedCoupon) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: COUPON_MESSAGES.NOT_FOUND });
        }

        return res.status(HTTP_STATUS.OK).json({
            message: COUPON_MESSAGES.UPDATED,
            coupon: updatedCoupon,
        });
    } catch (error) {
        console.error("Error updating coupon:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_WITH_PERIOD });
    }
};






const removeCoupon = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: COUPON_MESSAGES.ID_REQUIRED_FOR_REMOVE });
        }

        // Update the isListed field to "blocked"
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id, 
            { isListed: "blocked" }, 
            { new: true } 
        );

        if (!updatedCoupon) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: COUPON_MESSAGES.NOT_FOUND });
        }

        return res.status(HTTP_STATUS.OK).json({
            message: COUPON_MESSAGES.BLOCKED,
            coupon: updatedCoupon
        });

    } catch (error) {
        console.error("Error in removing coupon:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};


const validateCoupon = async (req, res) => {
    try {
        const { couponCode, totalAmount } = req.body;

        if (typeof couponCode !== "string" || !couponCode.trim()) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: COUPON_MESSAGES.INVALID_CODE });
        }

        // Find the coupon
        const coupon = await Coupon.findOne({
            name: couponCode,
            isListed: "active",
            expireOn: { $gt: new Date() }
        });

        if (!coupon) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                valid: false,
                message: COUPON_MESSAGES.INVALID_OR_EXPIRED
            });
        }

        // Check minimum price requirement
        if (totalAmount < coupon.minimumPrice) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                valid: false,
                message: COUPON_MESSAGES.minimumPurchaseRequired(coupon.minimumPrice)
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            valid: true,
            message: COUPON_MESSAGES.APPLIED,
            coupon: coupon
        });

    } catch (error) {
        console.error('Error validating coupon:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            valid: false,
            message: COUPON_MESSAGES.VALIDATE_FAILED
        });
    }
};



module.exports = { 
    addCoupon,
    allCoupons,
    updateCoupon,
    removeCoupon,
    validateCoupon,

};

