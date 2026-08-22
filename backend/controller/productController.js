const Product = require("../models/productSchema");
const Order = require("../models/orderSchema")



// Controller to add a new product
const addProduct = async (req, res) => {
  console.log("shiwnooh")
  try {
    const { title, sku, price, color, availableQuantity, description, productImages, status, categoryId, brandId, variants, specifications } = req.body;
    console.log(JSON.stringify(req.body))
    // Validate required fields
    if (!title || !sku || !price || !availableQuantity || !productImages || !categoryId) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Create a new product instance
    const newProduct = new Product({
      title,
      sku,
      price,
      color,
      availableQuantity,
      description,
      productImage: productImages, // Ensure this matches the frontend
      status,
      categoryId,
      brandId,
      variants,
      specifications,
    });

    // Save to the database
    await newProduct.save();

    res.status(201).json({ message: 'Product added successfully', product: newProduct });
  } catch (error) {
    if (error.code === 11000) {
      console.log(error)
      return res.status(400).json({ message: 'Duplicate key error: title or SKU must be unique' });
      
    }
    console.log(error )
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
  

// Controller to show all products
const showProducts = async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        Product.find().skip(skip).limit(limit),
        Product.countDocuments()
      ]);
      res.status(200).json({
        message: 'Products retrieved successfully',
        products,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };



  const showProductsIsActive = async (req,res)=>{
    try {
      const products = await Product.find({status:"active"});
      res.status(200).json({ message: 'Products retrieved successfully', products });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  const showProductsIsActiveOffer = async (req,res)=>{
    try {
      const products = await Product.find({ 
        offerId: { $exists: false }, 
        status: "active" 
    });
      res.status(200).json({ message: 'Products retrieved successfully', products });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }




  // Controller to show a single product by ID
const showProductById = async (req, res) => {
  
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
  
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      
  
      res.status(200).json({ message: 'Product retrieved successfully', product });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };




  const editProduct = async (req, res) => {
    try {
      const { id } = req.params; // Extract product ID from request parameters
      const updates = req.body;  // Updated product details from the request body
      console.log("New updates:", updates);
  
      // Prepare the update object with the new product image URLs
      const updatedFields = {
        ...updates,
        ...(updates.productImage && { productImage: updates.productImage })
      };
  
      // Find the product by ID and update it with new details, returning the updated document
      const updatedProduct = await Product.findByIdAndUpdate(id, updatedFields, { new: true });
  
      if (!updatedProduct) {
        return res.status(404).json({ message: 'Product not found' });
      }
  
      res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  


  const productsByCategory = async (req, res) => {
    try {
      const { id } = req.params; // Extract category ID from URL params
  
      // Validate if the category ID is provided
      if (!id) {
        return res.status(400).json({ message: 'Category ID is required' });
      }
  
      // Find products with the matching category ID
      const products = await Product.find({ categoryId: id });
  
      if (products.length === 0) {
        return res.status(404).json({ message: 'No products found for this category' });
      }
  
      // Return the found products
      res.status(200).json({ success: true, products });
    } catch (error) {
      console.error('Error fetching products by category:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  

  
const toggleProductStatus = async(req,res)=>{
  try {
    
    const {id} = req.params;
    const { status } = req.body;

    console.log(`new status : ${status}`);

    const product = await Product.findByIdAndUpdate(
      id,
      {status},
      {new: true}
    );

    if(!product){
      return res.status(404).json({message:"Product not found "});
    }

    return res.status(200).json({message:`Product Status updated to ${status} `,product});
  } catch (error) {
    console.error('Error toggling product status :',error);
    return res.status(500).json({message:"Internal Server Error"});
  }
}


const filteredProduct = async (req, res) => {
  try {
    const { sortBy, brands, categories, minPrice, maxPrice } = req.query;

    console.log(
      "SortBy:", sortBy,
      "Brands:", brands,
      "Categories:", categories,
      "MinPrice:", minPrice,
      "MaxPrice:", maxPrice
    );

    // Initialize filter object
    const filter = {};

    // Filter by brands
    if (brands) {
      filter.brandId = { $in: Array.isArray(brands) ? brands : [brands] };
    }

    // Filter by categories
    if (categories) {
      filter.categoryId = { $in: Array.isArray(categories) ? categories : [categories] };
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Define sorting options
    const sortOptions = {};
    switch (sortBy) {
      case 'popularity':
        sortOptions.popularity = -1;
        break;
      case 'price-low-high':
        sortOptions.price = 1;
        break;
      case 'price-high-low':
        sortOptions.price = -1;
        break;
      case 'average-rating':
        sortOptions.rating = -1;
        break;
      case 'new-arrivals':
        sortOptions.createdAt = -1;
        break;
      case 'a-z':
        sortOptions.title = 1;
        break;
      case 'z-a':
        sortOptions.title = -1;
        break;
      default:
        sortOptions.createdAt = -1; 
        break;
    }

    // Fetch products based on filters and sort options
    console.log(sortOptions)
    const products = await Product.find({...filter,status:"active"}).sort(sortOptions);

    return res.status(200).json(products);
  } catch (error) {
    console.error('Error in filtering products:', error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const searchProducts = async (req, res) => {
  const { query } = req.query;

  try {
    const searchFilter = query
      ? { title: { $regex: query, $options: 'i' }, status: "active" }
      : { status: "active" }; // Fetch all active products if no query

    const searchResults = await Product.find(searchFilter);
    return res.json({ data: searchResults });
  } catch (error) {
    return res.status(500).json({ message: 'Error searching products', error });
  }
};








module.exports = {
    addProduct,
    showProducts,
    showProductById,
    editProduct,
    productsByCategory,
    toggleProductStatus,
    showProductsIsActive,
    filteredProduct,
    searchProducts,
    showProductsIsActiveOffer,


}