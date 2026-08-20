const Offer = require('../models/offerSchema');
const Product = require('../models/productSchema');
const Category = require('../models/categorySchema');

const addOffer = async (req, res) => {
    try {
        const { name, discountPercent, startDate, endDate, targetId, targetType } = req.body;

        // Validate required fields
        if (!name || !discountPercent || !startDate || !endDate || !targetId || !targetType) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Validate discount percentage
        if (discountPercent < 0 || discountPercent > 100) {
            return res.status(400).json({ message: "Discount percentage must be between 0 and 100." });
        }

        // Determine the model based on the target type
        const Model = targetType === 'product' ? Product : Category;

        // Check if the target (product or category) exists
        const target = await Model.findById(targetId);
        if (!target) {
            return res.status(404).json({ message: `${targetType} not found.` });
        }

        // Create the offer
        const newOffer = await Offer.create({
            name,
            discountPercent,
            startDate,
            endDate,
            targetId,
            targetType,
            isActive: true,
        });

        // Update the target (product or category) with the new offer
        await Model.findByIdAndUpdate(
            targetId,
            { offerId: newOffer._id }, // Assign the offer ID to the `offerId` field
            { new: true } // Return the updated document
        );

        res.status(201).json({
            success: true,
            message: "Offer added successfully.",
            offer: newOffer,
        });
    } catch (error) {
        console.error("Error in adding offer:", error);
        res.status(500).json({ message: "Error in adding offer." });
    }
};


const allOffers = async(req,res)=>{
    try {

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
        const skip = (page - 1) * limit;

        const [offersData, total] = await Promise.all([
            Offer.find().skip(skip).limit(limit),
            Offer.countDocuments()
        ]);
        if(!offersData){
            return res.status(404).json({message:"No offer found."});
        };

        res.status(200).json({
            message:"Offers fetched successfully.",
            offersData,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.log("Error in fetching offers:",error);
        return res.status(500).json({message:"Error in fetching offers."});
    }
}


const deleteOffers = async (req, res) => {
    try {
        const { id } = req.params;

        
        if (!id) {
            return res.status(400).json({ message: "Offer ID is required." });
        }

        
        const offer = await Offer.findById(id);
        if (!offer) {
            return res.status(404).json({ message: "Offer not found." });
        }

       
        const Model = offer.targetType === 'product' ? Product : Category;

        
        await Model.findByIdAndUpdate(
            offer.targetId,
            { $unset: { offerId: "" } },
            { new: true } 
        );

        
        await Offer.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Offer deleted successfully.",
        });
    } catch (error) {
        console.error("Error in deleting offers:", error);
        res.status(500).json({ message: "Error in deleting offers." });
    }
};

const updateOffer = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate if ID is provided
        if (!id) {
            return res.status(400).json({ message: "Offer ID is required." });
        }

        const { name, discountPercent, startDate, endDate, targetId, targetType } = req.body;

        // Validate required fields
        if (!name || !discountPercent || !startDate || !endDate || !targetId || !targetType) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Validate discount percentage
        if (discountPercent < 0 || discountPercent > 100) {
            return res.status(400).json({ message: "Discount percentage must be between 0 and 100." });
        }

        // Find the existing offer
        const existingOffer = await Offer.findById(id);
        if (!existingOffer) {
            return res.status(404).json({ message: "Offer not found." });
        }

        // Check if the target (product or category) exists
        const Model = targetType === 'product' ? Product : Category;
        const target = await Model.findById(targetId);
        if (!target) {
            return res.status(404).json({ message: `${targetType} not found.` });
        }

        // If the target ID or type has changed, update the old target's offer reference
        if (existingOffer.targetId.toString() !== targetId || existingOffer.targetType !== targetType) {
            const OldModel = existingOffer.targetType === 'product' ? Product : Category;
            await OldModel.findByIdAndUpdate(existingOffer.targetId, { $unset: { offerId: "" } });
        }

        // Update the offer
        const updatedOffer = await Offer.findByIdAndUpdate(
            id,
            { name, discountPercent, startDate, endDate, targetId, targetType },
            { new: true } // Ensures the updated document is returned
        );

        // Update the new target (product or category) with the updated offer
        await Model.findByIdAndUpdate(
            targetId,
            { offerId: updatedOffer._id }, // Assign the updated offer ID to the `offerId` field
            { new: true } // Return the updated document
        );

        res.status(200).json({
            success: true,
            message: "Offer updated successfully.",
            offer: updatedOffer,
        });
    } catch (error) {
        console.error("Error in updating offer:", error);
        res.status(500).json({ message: "Error in updating offer." });
    }
};


const fetchOfferById = async(req,res)=>{
    try {
        
        const {id} = req.params;
        if(!id){
            return res.status(400).json({message:"Offer ID is required."});
        }

        const offerData = await Offer.findById(id);
        if(!offerData){
            return res.status(404).json({message:"Offer not found."});
        }

        return res.status(200).json({message:"Offer fetched successfully.",offerData});

    } catch (error) {
        console.log("Error in fetching offer by Id:",error);
        return res.status(500).json({message:"Error in fetching offer by Id."});
    }
}

const fetchOfferOfCategory= async (req, res) => {
      try {
        const { id } = req.params;
        console.log(id,req.params);

        const category = await Category.findById(id);
        if (!category) {
          return res.status(404).json({message: 'Category not found'});
        }
  
        
        if (!category.offerId) {
          return res.status(200).json({message: 'No offer associated with this category'});
        }
  
        
        const offer = await Offer.findById(category.offerId);
        if (!offer) {
          return res.status(404).json({ message: 'Offer not found'});
        }
  
        
        const currentDate = new Date();
        const isOfferActive =
          offer.isActive &&
          new Date(offer.startDate) <= currentDate &&
          new Date(offer.endDate) >= currentDate;
  
        // Send a successful response
        return res.status(200).json({
          success: true,
          message: 'Category offer fetched successfully',
          offerData: {
            ...offer.toObject(),
            isCurrentlyActive: isOfferActive,
          },
        });
  
      } catch (error) {
        console.error('Error in fetchCategoryOffer:', error);
        return res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: error.message,
        });
      }
    };
  
  

module.exports = {
    addOffer,
    allOffers,
    deleteOffers,
    updateOffer,
    fetchOfferById,
    fetchOfferOfCategory
};