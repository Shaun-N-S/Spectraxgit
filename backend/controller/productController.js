const mongoose = require("mongoose");
const Product = require("../models/productSchema");
const Order = require("../models/orderSchema");
const { HTTP_STATUS } = require("../constants/httpStatus");
const { COMMON_MESSAGES, PRODUCT_MESSAGES } = require("../constants/messages");
const { getProductPayloadError } = require("../utils/productValidation");
const { parsePagination, buildPagination } = require("../utils/pagination");

const SHOP_PAGE_SIZE = 25;

const withDefaultVariant = (variants, { sku, price, availableQuantity }) =>
  Array.isArray(variants) && variants.length > 0
    ? variants
    : [
        {
          attributes: [],
          sku,
          price: Number(price),
          availableQuantity: Number(availableQuantity) || 0,
        },
      ];

// Controller to add a new product
const addProduct = async (req, res) => {
  try {
    const {
      title,
      sku,
      price,
      color,
      availableQuantity,
      description,
      productImages,
      status,
      categoryId,
      brandId,
      variants,
      specifications,
    } = req.body;
    console.log(JSON.stringify(req.body));
    // Validate required fields
    // availableQuantity is checked below so that 0 (out of stock) is accepted
    if (!title || !sku || !price || !productImages || !categoryId) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: COMMON_MESSAGES.ALL_FIELDS_REQUIRED });
    }

    const validationError = getProductPayloadError(req.body);
    if (validationError) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: validationError });
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
      variants: withDefaultVariant(variants, { sku, price, availableQuantity }),
      specifications,
    });

    // Save to the database
    await newProduct.save();

    res
      .status(HTTP_STATUS.CREATED)
      .json({ message: PRODUCT_MESSAGES.ADDED, product: newProduct });
  } catch (error) {
    if (error.code === 11000) {
      console.log(error);
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: PRODUCT_MESSAGES.DUPLICATE_TITLE_OR_SKU });
    }
    console.log(error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.SERVER_ERROR, error: error.message });
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
      Product.countDocuments(),
    ]);
    res.status(HTTP_STATUS.OK).json({
      message: PRODUCT_MESSAGES.LIST_RETRIEVED,
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.SERVER_ERROR, error: error.message });
  }
};

const showProductsIsActive = async (req, res) => {
  try {
    const products = await Product.find({ status: "active" });
    res
      .status(HTTP_STATUS.OK)
      .json({ message: PRODUCT_MESSAGES.LIST_RETRIEVED, products });
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.SERVER_ERROR, error: error.message });
  }
};

const showProductsIsActiveOffer = async (req, res) => {
  try {
    const products = await Product.find({
      offerId: { $exists: false },
      status: "active",
    });
    res
      .status(HTTP_STATUS.OK)
      .json({ message: PRODUCT_MESSAGES.LIST_RETRIEVED, products });
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.SERVER_ERROR, error: error.message });
  }
};

// Controller to show a single product by ID
const showProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: COMMON_MESSAGES.PRODUCT_NOT_FOUND });
    }

    res
      .status(HTTP_STATUS.OK)
      .json({ message: PRODUCT_MESSAGES.RETRIEVED, product });
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.SERVER_ERROR, error: error.message });
  }
};

const editProduct = async (req, res) => {
  try {
    const { id } = req.params; // Extract product ID from request parameters
    const updates = req.body; // Updated product details from the request body
    console.log("New updates:", updates);

    // Only fields present in the update are validated (partial updates allowed)
    const validationError = getProductPayloadError(updates, { partial: true });
    if (validationError) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: validationError });
    }

    // Prepare the update object with the new product image URLs
    const updatedFields = {
      ...updates,
      ...(updates.productImage && { productImage: updates.productImage }),
    };

    if (Array.isArray(updates.variants) && updates.variants.length === 0) {
      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json({ message: COMMON_MESSAGES.PRODUCT_NOT_FOUND });
      }
      updatedFields.variants = withDefaultVariant([], {
        sku: updates.sku ?? existingProduct.sku,
        price: updates.price ?? existingProduct.price,
        availableQuantity: updates.availableQuantity,
      });
    }

    // Find the product by ID and update it with new details, returning the updated document
    const updatedProduct = await Product.findByIdAndUpdate(id, updatedFields, {
      new: true,
    });

    if (!updatedProduct) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: COMMON_MESSAGES.PRODUCT_NOT_FOUND });
    }

    res
      .status(HTTP_STATUS.OK)
      .json({ message: PRODUCT_MESSAGES.UPDATED, product: updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.SERVER_ERROR, error: error.message });
  }
};

const productsByCategory = async (req, res) => {
  try {
    const { id } = req.params; // Extract category ID from URL params

    // Validate if the category ID is provided
    if (!id) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: PRODUCT_MESSAGES.CATEGORY_ID_REQUIRED });
    }

    // Find products with the matching category ID
    const products = await Product.find({ categoryId: id });

    if (products.length === 0) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: PRODUCT_MESSAGES.NONE_IN_CATEGORY });
    }

    // Return the found products
    res.status(HTTP_STATUS.OK).json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`new status : ${status}`);

    const product = await Product.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: COMMON_MESSAGES.PRODUCT_NOT_FOUND_WITH_TRAILING_SPACE,
      });
    }

    return res
      .status(HTTP_STATUS.OK)
      .json({ message: PRODUCT_MESSAGES.statusUpdated(status), product });
  } catch (error) {
    console.error("Error toggling product status :", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_TITLE_CASE });
  }
};

// Sort order shared by the product filter and the paginated shop listing.
const buildProductSortOptions = (sortBy) => {
  switch (sortBy) {
    case "popularity":
      return { popularity: -1 };
    case "price-low-high":
      return { price: 1 };
    case "price-high-low":
      return { price: -1 };
    case "average-rating":
      return { rating: -1 };
    case "new-arrivals":
      return { createdAt: -1 };
    case "a-z":
      return { title: 1 };
    case "z-a":
      return { title: -1 };
    default:
      return { createdAt: -1 };
  }
};

const filteredProduct = async (req, res) => {
  try {
    const { sortBy, brands, categories, minPrice, maxPrice } = req.query;

    console.log(
      "SortBy:",
      sortBy,
      "Brands:",
      brands,
      "Categories:",
      categories,
      "MinPrice:",
      minPrice,
      "MaxPrice:",
      maxPrice,
    );

    // Initialize filter object
    const filter = {};

    // Filter by brands
    if (brands) {
      filter.brandId = { $in: Array.isArray(brands) ? brands : [brands] };
    }

    // Filter by categories
    if (categories) {
      filter.categoryId = {
        $in: Array.isArray(categories) ? categories : [categories],
      };
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Define sorting options
    const sortOptions = buildProductSortOptions(sortBy);

    // Fetch products based on filters and sort options
    console.log(sortOptions);
    const products = await Product.find({ ...filter, status: "active" }).sort(
      sortOptions,
    );

    return res.status(HTTP_STATUS.OK).json(products);
  } catch (error) {
    console.error("Error in filtering products:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_TITLE_CASE });
  }
};

const MAX_SEARCH_LENGTH = 100;

const searchProducts = async (req, res) => {
  const { query } = req.query;

  // Text is matched literally (regex characters escaped) and bounded, so a
  // query cannot be a pattern, an operator object or an expensive regex.
  if (
    query !== undefined &&
    (typeof query !== "string" || query.length > MAX_SEARCH_LENGTH)
  ) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ message: PRODUCT_MESSAGES.INVALID_SEARCH_QUERY });
  }

  try {
    const searchFilter = query
      ? { title: { $regex: escapeRegex(query), $options: "i" }, status: "active" }
      : { status: "active" }; // Fetch all active products if no query

    const searchResults = await Product.find(searchFilter);
    return res.json({ data: searchResults });
  } catch (error) {
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: PRODUCT_MESSAGES.SEARCH_FAILED, error });
  }
};

// Brand/category ids from the query string (one value or an array); invalid
// ids are ignored instead of failing the whole query.
const toObjectIdList = (value) =>
  (Array.isArray(value) ? value : value ? [value] : []).filter((id) =>
    mongoose.Types.ObjectId.isValid(id),
  );

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Paginated shop listing: active products only, with search, brand/category
// filters and sorting applied together. The count uses the same filter.
const getShopProducts = async (req, res) => {
  try {
    const { search, sortBy, brands, categories } = req.query;
    const { page, limit } = parsePagination(req.query, SHOP_PAGE_SIZE);

    const filter = { status: "active" };
    if (typeof search === "string" && search.trim()) {
      filter.title = { $regex: escapeRegex(search.trim()), $options: "i" };
    }
    const brandIds = toObjectIdList(brands);
    if (brandIds.length) filter.brandId = { $in: brandIds };
    const categoryIds = toObjectIdList(categories);
    if (categoryIds.length) filter.categoryId = { $in: categoryIds };

    const totalItems = await Product.countDocuments(filter);
    const pagination = buildPagination(totalItems, page, limit);
    // _id breaks ties so every product lands on exactly one page.
    const products = await Product.find(filter)
      .sort({ ...buildProductSortOptions(sortBy), _id: -1 })
      .skip((pagination.currentPage - 1) * limit)
      .limit(limit);

    return res
      .status(HTTP_STATUS.OK)
      .json({ message: PRODUCT_MESSAGES.LIST_RETRIEVED, products, pagination });
  } catch (error) {
    console.error("Error fetching shop products:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_TITLE_CASE });
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
  getShopProducts,
};
