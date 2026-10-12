import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import axiosInstance from "../../axios/userAxios";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { FaShoppingCart } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import FilterComponent from "./Filter";
import { Heart } from "lucide-react";
import { useLocation } from "react-router-dom";
import { debounce } from "lodash";

const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [wishlistMap, setWishlistMap] = useState({});
  const [productOffers, setProductOffers] = useState({});
  const [categoryOffers, setCategoryOffers] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 25;
  const location = useLocation();

  const userDetails = useSelector((state) => state.user);
  const getUserId = (userDetails) => {
    return userDetails?.user?._id || userDetails?.user?.id;
  };
  const userId = getUserId(userDetails);
  console.log(userId);

  const query = new URLSearchParams(location.search).get("search");

  // The catalogue load, search and filter all write the product list; only
  // the most recently started request may write it, so a slower, older
  // response cannot overwrite newer results.
  const productsRequestRef = useRef(0);

  const calculateBestDiscount = (
    originalPrice,
    productOffer,
    categoryOffer
  ) => {
    let bestDiscountPercent = 0;
    const currentDate = new Date();

    if (
      productOffer &&
      productOffer.isActive &&
      new Date(productOffer.startDate) <= currentDate &&
      new Date(productOffer.endDate) >= currentDate
    ) {
      bestDiscountPercent = Math.max(
        bestDiscountPercent,
        productOffer.discountPercent
      );
    }

    if (
      categoryOffer &&
      categoryOffer.isActive &&
      new Date(categoryOffer.startDate) <= currentDate &&
      new Date(categoryOffer.endDate) >= currentDate
    ) {
      bestDiscountPercent = Math.max(
        bestDiscountPercent,
        categoryOffer.discountPercent
      );
    }

    const discountedPrice =
      originalPrice - originalPrice * (bestDiscountPercent / 100);
    const savings = originalPrice - discountedPrice;

    return {
      discountedPrice,
      originalPrice,
      savings,
      discountPercent: bestDiscountPercent,
    };
  };

  const fetchData = async () => {
    // While a search is active, the search results own the product list.
    const requestId = query ? null : ++productsRequestRef.current;
    try {
      const productsResponse = await axiosInstance.get("/showproductsisActive");
      const products = productsResponse.data.products;

      // Fetch offers for all products
      const offersPromises = products.map(async (product) => {
        const offers = { productOffer: null, categoryOffer: null };

        if (product.offerId) {
          try {
            const productOfferResponse = await axiosInstance.get(
              `/Offer/fetch/${product.offerId}`
            );
            offers.productOffer = productOfferResponse.data.offerData;
          } catch (error) {
            console.error("Error fetching product offer:", error);
          }
        }

        if (product.categoryId) {
          try {
            const categoryOfferResponse = await axiosInstance.get(
              `/Offer/category/${product.categoryId}`
            );
            offers.categoryOffer = categoryOfferResponse.data.offerData;
          } catch (error) {
            console.error("Error fetching category offer:", error);
          }
        }

        return {
          productId: product._id,
          offers,
        };
      });

      const offersResults = await Promise.all(offersPromises);

      // Create maps of offers
      const productOffersMap = {};
      const categoryOffersMap = {};
      offersResults.forEach((result) => {
        productOffersMap[result.productId] = result.offers.productOffer;
        categoryOffersMap[result.productId] = result.offers.categoryOffer;
      });

      setProductOffers(productOffersMap);
      setCategoryOffers(categoryOffersMap);
      if (requestId === productsRequestRef.current) {
        setProducts(products);
      }

      // Fetch wishlist if user is logged in
      if (userId) {
        const wishlistResponse = await axiosInstance.get(`/wishlist/${userId}`);
        const wishlistItems = wishlistResponse.data.wishlist?.product || [];

        const newWishlistMap = {};
        wishlistItems.forEach((item) => {
          newWishlistMap[item.productId._id] = true;
        });
        setWishlistMap(newWishlistMap);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Error fetching products");
      setLoading(false);
    }
  };

  // Re-run only when the user changes, always with the latest fetchData.
  const fetchDataRef = useRef(fetchData);
  useLayoutEffect(() => {
    fetchDataRef.current = fetchData;
  });
  useEffect(() => {
    fetchDataRef.current();
  }, [userId]);

  // The initial load, search and filter each replace the product list;
  // every new list starts from the first page.
  useEffect(() => {
    setCurrentPage(1);
  }, [products]);

  const fetchProducts = async (searchQuery = "") => {
    const requestId = ++productsRequestRef.current;
    setLoading(true);
    try {
      const response = await axiosInstance.get("/search/products", {
        params: { query: searchQuery },
      });
      if (requestId === productsRequestRef.current) {
        setProducts(response.data.data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Error fetching products");
      setLoading(false);
    }
  };

  // One debounced instance for the component's lifetime, calling the
  // latest fetchProducts.
  const fetchProductsRef = useRef(fetchProducts);
  useLayoutEffect(() => {
    fetchProductsRef.current = fetchProducts;
  });
  const debouncedFetchProducts = useMemo(
    () =>
      debounce((searchQuery) => {
        fetchProductsRef.current(searchQuery);
      }, 500), // 500ms debounce delay
    []
  );

  useEffect(() => {
    debouncedFetchProducts(query); // Fetch products dynamically
  }, [query, debouncedFetchProducts]);

  // Filter results replace the list and supersede any request still in flight.
  const setFilteredProducts = (filteredProducts) => {
    productsRequestRef.current += 1;
    setProducts(filteredProducts);
  };

  // console.log(wishlistProducts)
  const navigate = useNavigate();

  const handleCart = async (userId, productId, variantId) => {
    console.log("UserId:", userId);
    console.log("ProductId:", productId);
    console.log("VariantId:", variantId);

    if(!userId){
      toast.error("Please Login to add to cart.")
      return;
    }

    try {
      const response = await axiosInstance.post(
        "/Cart",
        {
          userId,
          productId,
          variantId,
          quantity: 1,
        },
        { withCredentials: true }
      );
      console.log("Response:", response.data);
      console.log("Product added to cart successfully");
      toast.success("Added to cart");
      navigate("/cart");
    } catch (error) {
      console.log("Error in handle cart:", error || error.message);
      toast.error("Product out of stock  ");
    }
  };

  const handleShop = (productId) => {
    navigate(`/product_details/${productId}`);
  };

  const handleWishlist = async (userId, productId, variantId) => {
    if (!userId) {
      toast.error("Please login to add items to wishlist");
      navigate("/login");
      return;
    }

    console.log("handlewishlist ............",userId, productId, variantId);
    

    try {
      const isCurrentlyInWishlist = wishlistMap[productId];
      let response;

      if (isCurrentlyInWishlist) {
        // Remove from wishlist
        response = await axiosInstance.post("/remove/wishlist", {
          userId,
          productId,
          variantId,
        });
        if (response.data.success) {
          setWishlistMap((prev) => {
            const newMap = { ...prev };
            delete newMap[productId];
            return newMap;
          });
          toast.success("Removed from wishlist");
        }
      } else {
        // Add to wishlist
        response = await axiosInstance.post("/add/wishlist", {
          userId,
          productId,
          variantId,
        });
        if (response.data.success) {
          setWishlistMap((prev) => ({
            ...prev,
            [productId]: true,
          }));
          toast.success("Added to wishlist");
        }
      }
    } catch (error) {
      console.error("Wishlist error:", error);
      toast.error(error.response?.data?.message || "Error updating wishlist");
    }
  };

  const renderHeartIcon = (productId) => {
    const isInWishlist = wishlistMap[productId];
    console.log("Product ID:", productId, "Is in wishlist:", isInWishlist);
    return (
      <Heart
        className={`w-5 h-5 transition-colors duration-300 ${
          isInWishlist
            ? "text-red-500 fill-current"
            : "text-white hover:text-red-300"
        }`}
        aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-red-500 text-xl font-bold">
        {error}
      </div>
    );
  }

  console.log(products._id);
  console.log("products in ....", products);

  const totalPages = Math.ceil(products.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = products.slice(startIndex, endIndex);

  return (
    <div className="bg-black min-h-screen text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-green-400 mb-12 tracking-tight">
          Our Products
        </h1>
        <FilterComponent
          isOpen={isFilterOpen}
          setIsOpen={setIsFilterOpen}
          setProducts={setFilteredProducts}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {currentProducts.map((product) => {
            const { discountedPrice, originalPrice, discountPercent } =
              calculateBestDiscount(
                product.price,
                productOffers[product._id],
                categoryOffers[product._id]
              );

            return (
              <Card
                key={product._id}
                className="bg-gray-900 border-2 border-green-500 shadow-xl rounded-lg overflow-hidden transition-all duration-300 hover:shadow-green-500/50 hover:-translate-y-1"
              >
                <div className="relative">
                  <img
                    src={product.productImage[0]}
                    alt={product.title}
                    className="w-full h-64 object-cover"
                  />
                  <button
                    className="absolute top-4 left-4 bg-black/70 p-2 rounded-full hover:bg-black/90 transition-colors cursor-pointer"
                    onClick={() =>
                      handleWishlist(
                        userId,
                        product._id,
                        product.variants?.[0]?._id
                      )
                    }
                  >
                    {renderHeartIcon(product._id)}
                  </button>
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white">
                    {product.title}
                  </h3>

                  {discountPercent > 0 ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400 text-xl font-bold">
                        ₹{discountedPrice.toFixed(2)}
                      </span>
                      <span className="text-gray-400 line-through">
                        ₹{originalPrice.toFixed(2)}
                      </span>
                      <Badge className="bg-red-500 text-white">
                        -{discountPercent}%
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-green-400 text-xl font-bold">
                      ₹{originalPrice.toFixed(2)}
                    </span>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <Button
                      onClick={() =>
                        handleCart(
                          userId,
                          product._id,
                          product.variants?.[0]?._id
                        )
                      }
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <FaShoppingCart className="mr-2" /> Add to Cart
                    </Button>
                    <Button
                      onClick={() => handleShop(product._id)}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-6 space-x-2">
            {Array.from({ length: totalPages }, (_, index) => (
              <Button
                key={index + 1}
                variant={currentPage === index + 1 ? "default" : "outline"}
                onClick={() => setCurrentPage(index + 1)}
                className={`px-3 py-1 ${
                  currentPage === index + 1
                    ? "border border-transparent bg-green-500 text-black hover:bg-green-600"
                    : "text-gray-600"
                }`}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPage;
