const Offer = require('../models/offerSchema');
const Product = require('../models/productSchema');
const Category = require('../models/categorySchema');
const { HTTP_STATUS } = require('../constants/httpStatus');
const { COMMON_MESSAGES, CATEGORY_MESSAGES, OFFER_MESSAGES } = require('../constants/messages');

const addOffer = async (req, res) => {
    try {
        const { name, discountPercent, startDate, endDate, targetId, targetType } = req.body;

        // Validate required fields
        if (!name || !discountPercent || !startDate || !endDate || !targetId || !targetType) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: COMMON_MESSAGES.ALL_FIELDS_REQUIRED_WITH_PERIOD });
        }

        // Validate discount percentage
        if (discountPercent < 0 || discountPercent > 100) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: OFFER_MESSAGES.DISCOUNT_OUT_OF_RANGE });
        }

        // Determine the model based on the target type
        const Model = targetType === 'product' ? Product : Category;

        // Check if the target (product or category) exists
        const target = await Model.findById(targetId);
        if (!target) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: OFFER_MESSAGES.targetNotFound(targetType) });
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

        res.status(HTTP_STATUS.CREATED).json({
            success: true,
            message: OFFER_MESSAGES.ADDED,
            offer: newOffer,
        });
    } catch (error) {
        console.error("Error in adding offer:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: OFFER_MESSAGES.ADD_FAILED });
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
            return res.status(HTTP_STATUS.NOT_FOUND).json({message:OFFER_MESSAGES.NONE_FOUND});
        };

        res.status(HTTP_STATUS.OK).json({
            message:OFFER_MESSAGES.LIST_FETCHED,
            offersData,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.log("Error in fetching offers:",error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message:OFFER_MESSAGES.LIST_FETCH_FAILED});
    }
}


const deleteOffers = async (req, res) => {
    try {
        const { id } = req.params;

        
        if (!id) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: OFFER_MESSAGES.ID_REQUIRED });
        }

        
        const offer = await Offer.findById(id);
        if (!offer) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: OFFER_MESSAGES.NOT_FOUND_WITH_PERIOD });
        }

       
        const Model = offer.targetType === 'product' ? Product : Category;

        
        await Model.findByIdAndUpdate(
            offer.targetId,
            { $unset: { offerId: "" } },
            { new: true } 
        );

        
        await Offer.findByIdAndDelete(id);

        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: OFFER_MESSAGES.DELETED,
        });
    } catch (error) {
        console.error("Error in deleting offers:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: OFFER_MESSAGES.DELETE_FAILED });
    }
};

const updateOffer = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate if ID is provided
        if (!id) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: OFFER_MESSAGES.ID_REQUIRED });
        }

        const { name, discountPercent, startDate, endDate, targetId, targetType } = req.body;

        // Validate required fields
        if (!name || !discountPercent || !startDate || !endDate || !targetId || !targetType) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: COMMON_MESSAGES.ALL_FIELDS_REQUIRED_WITH_PERIOD });
        }

        // Validate discount percentage
        if (discountPercent < 0 || discountPercent > 100) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: OFFER_MESSAGES.DISCOUNT_OUT_OF_RANGE });
        }

        // Find the existing offer
        const existingOffer = await Offer.findById(id);
        if (!existingOffer) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: OFFER_MESSAGES.NOT_FOUND_WITH_PERIOD });
        }

        // Check if the target (product or category) exists
        const Model = targetType === 'product' ? Product : Category;
        const target = await Model.findById(targetId);
        if (!target) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: OFFER_MESSAGES.targetNotFound(targetType) });
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

        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: OFFER_MESSAGES.UPDATED,
            offer: updatedOffer,
        });
    } catch (error) {
        console.error("Error in updating offer:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: OFFER_MESSAGES.UPDATE_FAILED });
    }
};


const fetchOfferById = async(req,res)=>{
    try {
        
        const {id} = req.params;
        if(!id){
            return res.status(HTTP_STATUS.BAD_REQUEST).json({message:OFFER_MESSAGES.ID_REQUIRED});
        }

        const offerData = await Offer.findById(id);
        if(!offerData){
            return res.status(HTTP_STATUS.NOT_FOUND).json({message:OFFER_MESSAGES.NOT_FOUND_WITH_PERIOD});
        }

        return res.status(HTTP_STATUS.OK).json({message:OFFER_MESSAGES.FETCHED,offerData});

    } catch (error) {
        console.log("Error in fetching offer by Id:",error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message:OFFER_MESSAGES.FETCH_BY_ID_FAILED});
    }
}

const fetchOfferOfCategory= async (req, res) => {
      try {
        const { id } = req.params;
        console.log(id,req.params);

        const category = await Category.findById(id);
        if (!category) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({message: CATEGORY_MESSAGES.NOT_FOUND});
        }
  
        
        if (!category.offerId) {
          return res.status(HTTP_STATUS.OK).json({message: OFFER_MESSAGES.NO_CATEGORY_OFFER});
        }
  
        
        const offer = await Offer.findById(category.offerId);
        if (!offer) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({ message: OFFER_MESSAGES.NOT_FOUND});
        }
  
        
        const currentDate = new Date();
        const isOfferActive =
          offer.isActive &&
          new Date(offer.startDate) <= currentDate &&
          new Date(offer.endDate) >= currentDate;
  
        // Send a successful response
        return res.status(HTTP_STATUS.OK).json({
          success: true,
          message: OFFER_MESSAGES.CATEGORY_OFFER_FETCHED,
          offerData: {
            ...offer.toObject(),
            isCurrentlyActive: isOfferActive,
          },
        });
  
      } catch (error) {
        console.error('Error in fetchCategoryOffer:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR,
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