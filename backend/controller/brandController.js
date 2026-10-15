const Brand = require('../models/brandSchema');
const { HTTP_STATUS } = require('../constants/httpStatus');
const { COMMON_MESSAGES, BRAND_MESSAGES } = require('../constants/messages');

const addBrand = async(req,res)=>{
    try {
        const {name,status} = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({message:COMMON_MESSAGES.INVALID_NAME});
        }

        const existingBrand = await Brand.findOne({name});
        if(existingBrand){
            return res.status(HTTP_STATUS.BAD_REQUEST).json({message:BRAND_MESSAGES.ALREADY_EXISTS});

        }

        const newBrand = new Brand({name,status});
        await newBrand.save();
        return res.status(HTTP_STATUS.CREATED).json({message:BRAND_MESSAGES.ADDED});
    } catch (error) {
        console.log('Error in adding brand :',error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message:COMMON_MESSAGES.INTERNAL_SERVER_ERROR_TITLE_CASE});
    }
};


const getAllBrand = async(req,res)=>{
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
        const skip = (page - 1) * limit;

        const [brand, total] = await Promise.all([
            Brand.find().skip(skip).limit(limit),
            Brand.countDocuments()
        ]);

        return res.status(HTTP_STATUS.OK).json({
            brand,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        })
    } catch (error) {
        console.log('Error in fetching brand :',error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message:COMMON_MESSAGES.INTERNAL_SERVER_ERROR})
    }
};
const getallIsactiveBrands = async(req,res)=>{
    try {
        const brand = await Brand.find({status:'active'});
        return res.status(HTTP_STATUS.OK).json({brand})
    } catch (error) {
        console.log('Error in fetching brand :',error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message:COMMON_MESSAGES.INTERNAL_SERVER_ERROR})
    }
};


const toggleBrandStatus = async (req, res) => {
    try {
      const { id } = req.params;
      console.log(id);
    
      // Find the brand by ID
      const brand = await Brand.findById(id);
      if (!brand) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: BRAND_MESSAGES.NOT_FOUND });
      }
    
      // Toggle the status based on the current status
      brand.status = brand.status === 'active' ? 'blocked' : 'active';
  
      await brand.save();
    
      res.status(HTTP_STATUS.OK).json({ message: BRAND_MESSAGES.STATUS_UPDATED, brand });
    } catch (error) {
      console.error('Error updating brand status:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
  };

  
  const updateBrandName = async (req, res) => {
    try {
      const brandId = req.params.id;
      const { name } = req.body;
  
      // Ensure the brand name is provided
      if (!name || name.trim() === '') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: BRAND_MESSAGES.NAME_REQUIRED });
      }
  
      // Find the brand by ID
      const brand = await Brand.findById(brandId);
  
      if (!brand) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: BRAND_MESSAGES.NOT_FOUND });
      }
  
      // Check if the brand is active (not soft-deleted)
      if (brand.status === 'inactive') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: BRAND_MESSAGES.CANNOT_EDIT_INACTIVE });
      }
  
      // Update the brand name
      brand.name = name;
  
      // Save the updated brand to the database
      const updatedBrand = await brand.save();
  
      return res.status(HTTP_STATUS.OK).json({
        message: BRAND_MESSAGES.NAME_UPDATED,
        brand: updatedBrand,
      });
    } catch (error) {
      console.error('Error updating brand name:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
  };
  

  const showBrandbyId = async (req, res) => {
    try {
      const { id } = req.params;
      // console.log(id)
      const brandData = await Brand.findById(id);
  
      if (!brandData) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: BRAND_MESSAGES.NOT_FOUND });
      }
  
      return res.status(HTTP_STATUS.OK).json({ message: BRAND_MESSAGES.FOUND, brand: brandData });
    } catch (error) {
      console.error('Error fetching brand:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_TITLE_CASE, error });
    }
  };
  



  



module.exports = {
    addBrand,
    getAllBrand,
    toggleBrandStatus,
    updateBrandName,
    getallIsactiveBrands,
    showBrandbyId
}