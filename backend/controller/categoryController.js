const Category = require('../models/categorySchema'); // Assuming Category model is in 'models' folder
const { HTTP_STATUS } = require('../constants/httpStatus');
const { COMMON_MESSAGES, CATEGORY_MESSAGES } = require('../constants/messages');

// Controller to add a new category
const addCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: COMMON_MESSAGES.INVALID_NAME });
    }

    // Check if the category name already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      // console.log('Category already exists')
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: CATEGORY_MESSAGES.ALREADY_EXISTS });
      
    }

    // Create and save the new category
    const newCategory = new Category({ name, description, status });
    await newCategory.save();

    return res.status(HTTP_STATUS.CREATED).json({ message: CATEGORY_MESSAGES.ADDED, category: newCategory });
  } catch (error) {
    console.error('Error adding category:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_TITLE_CASE });
  }
};

// Controller to show all categories
const getAllCategories = async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
      const skip = (page - 1) * limit;

      // Fetch only categories that are active
      const [categories, total] = await Promise.all([
        Category.find().skip(skip).limit(limit),
        Category.countDocuments()
      ]);
      return res.status(HTTP_STATUS.OK).json({
        categories,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_TITLE_CASE });
    }
  };


  const getAllCategoriesIsactive = async (req, res) => {
    try {
      // Fetch only categories that are active
      const categories = await Category.find({status:'active'});
      return res.status(HTTP_STATUS.OK).json({ categories });
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_TITLE_CASE });
    }
  };



// Controller to soft delete (set status to 'inactive')
// const softDeleteCategory = async (req, res) => {
//     try {
//       const { id } = req.params;
  
//       // Find the category by ID and set status to 'inactive'
//       const category = await Category.findByIdAndUpdate(
//         id,
//         { status: 'inactive' },
//         { new: true } // Return the updated document
//       );
  
//       if (!category) {
//         return res.status(404).json({ message: 'Category not found' });
//       }
  
//       return res.status(200).json({ message: 'Category soft deleted successfully', category });
//     } catch (error) {
//       console.error('Error soft deleting category:', error);
//       return res.status(500).json({ message: 'Internal Server Error' });
//     }
//   };



  const toggleCategoryStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
  
      // Find the category by ID and update the status
      const category = await Category.findByIdAndUpdate(
        id,
        { status },
        { new: true } // Return the updated document
      );
  
      if (!category) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: CATEGORY_MESSAGES.NOT_FOUND });
      }
  
      return res.status(HTTP_STATUS.OK).json({ message: CATEGORY_MESSAGES.statusUpdated(status), category });
    } catch (error) {
      console.error('Error toggling category status:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_TITLE_CASE });
    }
  };
  








  const editCategory = async (req, res) => {
    try {
      const categoryId = req.params.id;
      const { name, description } = req.body;
  
      // Find the category by ID
      const category = await Category.findById(categoryId);
  
      if (!category) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: CATEGORY_MESSAGES.NOT_FOUND });
      }
  
      // Check if the category is active (not soft-deleted)
      if (category.status === 'inactive') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: CATEGORY_MESSAGES.CANNOT_EDIT_INACTIVE });
      }
  
      // Update the category details
      category.name = name || category.name;
      category.description = description || category.description;
  
      // Save the updated category to the database
      const updatedCategory = await category.save();
  
      return res.status(HTTP_STATUS.OK).json({
        message: CATEGORY_MESSAGES.UPDATED,
        category: updatedCategory,
      });
    } catch (error) {
      console.error('Error updating category:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
  };
  


 
  








// Exporting the controllers
module.exports = {
  addCategory,
  getAllCategories,
  // softDeleteCategory,
  editCategory,
  toggleCategoryStatus,
  getAllCategoriesIsactive
};
