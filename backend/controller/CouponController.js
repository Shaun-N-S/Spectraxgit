const Coupon = require('../models/CouponSchema');
const User = require('../models/userModel');
const addCoupon = async (req, res) => {
    try {
        const { couponCode, couponType, description, discountValue, minimumPrice, expireDate } = req.body;

        // Check if the coupon already exists
        const existingCoupon = await Coupon.findOne({ name: couponCode });
        if (existingCoupon) {
            return res.status(400).json({ message: 'This coupon already exists' });
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

        return res.status(201).json({
            message: "Coupon created successfully",
            coupon: newCoupon,
        });
    } catch (error) {
        console.error('Error while creating coupon:', error);
        return res.status(500).json({
            message: "An error occurred while creating the coupon",
            error: error.message,
        });
    }
};


const allCoupons = async (req,res)=>{
    try {
        
        const couponData = await Coupon.find({isListed:"active"});

        if(!couponData){
            return res.status(404).json({message:"Coupon not found."})
        }

        return res.status(200).json({message:"Coupon fetched successfully !",couponData})

    } catch (error) {
       console.error("Error in fetching all coupons .",error);
       return res.status(500).json({message:"Internal server error",error}) 
    }
}



const updateCoupon = async (req, res) => {
    try {
        const { id, ...updates } = req.body;

        console.log("Received Update Request Body:", req.body);

        if (!id) {
            return res.status(400).json({ message: "ID is required to update the coupon." });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            updates,
            { new: true } 
        );

        if (!updatedCoupon) {
            return res.status(404).json({ message: "Coupon not found." });
        }

        return res.status(200).json({
            message: "Coupon updated successfully!",
            coupon: updatedCoupon,
        });
    } catch (error) {
        console.error("Error updating coupon:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};






const removeCoupon = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Coupon ID is required for removing the coupon.' });
        }

        // Update the isListed field to "blocked"
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id, 
            { isListed: "blocked" }, 
            { new: true } 
        );

        if (!updatedCoupon) {
            return res.status(404).json({ message: 'Coupon not found.' });
        }

        return res.status(200).json({
            message: 'Coupon status updated to blocked successfully.',
            coupon: updatedCoupon
        });

    } catch (error) {
        console.error("Error in removing coupon:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


const validateCoupon = async (req, res) => {
    try {
        const { couponCode, totalAmount } = req.body;

        if (typeof couponCode !== "string" || !couponCode.trim()) {
            return res.status(400).json({ message: "Invalid coupon code" });
        }

        // Find the coupon
        const coupon = await Coupon.findOne({
            name: couponCode,
            isListed: "active",
            expireOn: { $gt: new Date() }
        });

        if (!coupon) {
            return res.status(400).json({
                valid: false,
                message: "Invalid or expired coupon code"
            });
        }

        // Check minimum price requirement
        if (totalAmount < coupon.minimumPrice) {
            return res.status(400).json({
                valid: false,
                message: `Minimum purchase amount of ₹${coupon.minimumPrice} required for this coupon`
            });
        }

        return res.status(200).json({
            valid: true,
            message: "Coupon applied successfully",
            coupon: coupon
        });

    } catch (error) {
        console.error('Error validating coupon:', error);
        return res.status(500).json({
            valid: false,
            message: "An error occurred while validating the coupon"
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

