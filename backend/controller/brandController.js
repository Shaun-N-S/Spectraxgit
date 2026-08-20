const Brand = require('../models/brandSchema');

const addBrand = async(req,res)=>{
    try {
        const {name,status} = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({message:"Invalid name"});
        }

        const existingBrand = await Brand.findOne({name});
        if(existingBrand){
            return res.status(400).json({message:"Brand already exists"});

        }

        const newBrand = new Brand({name,status});
        await newBrand.save();
        return res.status(201).json({message:"Brand added successfully"});
    } catch (error) {
        console.log('Error in adding brand :',error);
        return res.status(500).json({message:"Internal Server Error"});
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

        return res.status(200).json({
            brand,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        })
    } catch (error) {
        console.log('Error in fetching brand :',error);
        return res.status(500).json({message:'Internal server error'})
    }
};
const getallIsactiveBrands = async(req,res)=>{
    try {
        const brand = await Brand.find({status:'active'});
        return res.status(200).json({brand})
    } catch (error) {
        console.log('Error in fetching brand :',error);
        return res.status(500).json({message:'Internal server error'})
    }
};


const toggleBrandStatus = async (req, res) => {
    try {
      const { id } = req.params;
      console.log(id);
    
      // Find the brand by ID
      const brand = await Brand.findById(id);
      if (!brand) {
        return res.status(404).json({ message: 'Brand not found' });
      }
    
      // Toggle the status based on the current status
      brand.status = brand.status === 'active' ? 'blocked' : 'active';
  
      await brand.save();
    
      res.status(200).json({ message: 'Brand status updated successfully', brand });
    } catch (error) {
      console.error('Error updating brand status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  
  const updateBrandName = async (req, res) => {
    try {
      const brandId = req.params.id;
      const { name } = req.body;
  
      // Ensure the brand name is provided
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Brand name cannot be empty' });
      }
  
      // Find the brand by ID
      const brand = await Brand.findById(brandId);
  
      if (!brand) {
        return res.status(404).json({ message: 'Brand not found' });
      }
  
      // Check if the brand is active (not soft-deleted)
      if (brand.status === 'inactive') {
        return res.status(400).json({ message: 'Cannot edit an inactive brand' });
      }
  
      // Update the brand name
      brand.name = name;
  
      // Save the updated brand to the database
      const updatedBrand = await brand.save();
  
      return res.status(200).json({
        message: 'Brand name updated successfully',
        brand: updatedBrand,
      });
    } catch (error) {
      console.error('Error updating brand name:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
  

  const showBrandbyId = async (req, res) => {
    try {
      const { id } = req.params;
      // console.log(id)
      // Use a different variable name for the brand model
      const brandData = await Brand.findById(id);
  
      if (!brandData) {
        return res.status(404).json({ message: "Brand not found" });
      }
  
      return res.status(200).json({ message: "Brand found successfully", brand: brandData });
    } catch (error) {
      console.error('Error fetching brand:', error);
      return res.status(500).json({ message: "Internal Server Error", error });
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