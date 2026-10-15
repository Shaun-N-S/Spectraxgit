import { useState, useEffect, useMemo, useRef } from "react";
import axiosInstance from "../../axios/userAxios";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { FaShoppingCart } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";
import { useSelector } from "react-redux";
import FilterComponent from "./Filter";
import PaginationControls from "../Pagination/PaginationControls";
import { Heart } from "lucide-react";
import { useLocation } from "react-router-dom";
import { debounce } from "lodash";

const PRODUCTS_PER_PAGE = 25;

// Product and category offers for the given products, keyed by product id.
const fetchOffersForProducts = async (products) => {
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

  const productOffersMap = {};
  const categoryOffersMap = {};
  offersResults.forEach((result) => {
    productOffersMap[result.productId] = result.offers.productOffer;
    categoryOffersMap[result.productId] = result.offers.categoryOffer;
  });
  return { productOffersMap, categoryOffersMap };
};

const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [wishlistMap, setWishlistMap] = useState({});
  const [productOffers, setProductOffers] = useState({});
  const [categoryOffers, setCategoryOffers] = useState({});
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    sortBy: "",
    brands: [],
    categories: [],
  });
  const location = useLocation();

  const userDetails = useSelector((state) => state.user);
  const getUserId = (userDetails) => {
    return userDetails?.user?._id || userDetails?.user?.id;
  };
  const userId = getUserId(userDetails);
  console.log(userId);

  const query = new URLSearchParams(location.search).get("search") || "";

  // A search typed into the URL is applied after 500ms; a direct visit uses
  // the URL's search immediately.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const debouncedSetQuery = useMemo(() => debounce(setDebouncedQuery, 500), []);
  useEffect(() => {
    debouncedSetQuery(query);
  }, [query, debouncedSetQuery]);

  // The requested page belongs to one search + filter combination; a new
  // search or filter starts again from page 1.
  const listKey = JSON.stringify({ search: debouncedQuery, ...filters });
  const [pageState, setPageState] = useState({ listKey, page: 1 });
  const requestedPage = pageState.listKey === listKey ? pageState.page : 1;
  const goToPage = (page) => setPageState({ listKey, page });

  // Only the most recently started request may update the list, so a slower,
  // older response cannot overwrite newer results.
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

  // The backend returns one page of active products matching the search,
  // filters and sort, plus pagination metadata.
  useEffect(() => {
    const requestId = ++productsRequestRef.current;
    const isLatest = () => requestId === productsRequestRef.current;

    const loadProducts = async () => {
      try {
        const response = await axiosInstance.get("/shop/products", {
          params: {
            page: requestedPage,
            limit: PRODUCTS_PER_PAGE,
            search: debouncedQuery || undefined,
            sortBy: filters.sortBy || undefined,
            brands: filters.brands,
            categories: filters.categories,
          },
        });
        if (!isLatest()) return;

        const pageProducts = response.data.products;
        const { productOffersMap, categoryOffersMap } =
          await fetchOffersForProducts(pageProducts);
        if (!isLatest()) return;

        setProductOffers(productOffersMap);
        setCategoryOffers(categoryOffersMap);
        setProducts(pageProducts);
        setPagination(response.data.pagination);
        setError(null);
      } catch (err) {
        if (!isLatest()) return;
        console.error("Error fetching data:", err);
        setError("Error fetching products");
      } finally {
        if (isLatest()) setLoading(false);
      }
    };

    loadProducts();
  }, [debouncedQuery, filters, requestedPage]);

  // Wishlist hearts use the logged-in user's full wishlist.
  useEffect(() => {
    if (!userId) return;

    const fetchWishlistMap = async () => {
      try {
        const wishlistResponse = await axiosInstance.get(`/wishlist/${userId}`);
        const wishlistItems = wishlistResponse.data.wishlist?.product || [];

        const newWishlistMap = {};
        wishlistItems.forEach((item) => {
          newWishlistMap[item.productId._id] = true;
        });
        setWishlistMap(newWishlistMap);
      } catch (err) {
        console.error("Error fetching wishlist:", err);
      }
    };

    fetchWishlistMap();
  }, [userId]);

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
    if (!variantId) {
      toast.error("This product is currently unavailable");
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
      toast.error(error.response?.data?.message || "Product out of stock  ");
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
    if (!variantId) {
      toast.error("This product is currently unavailable");
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

  return (
    <div className="bg-black min-h-screen text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-green-400 mb-12 tracking-tight">
          Our Products
        </h1>
        <FilterComponent
          isOpen={isFilterOpen}
          setIsOpen={setIsFilterOpen}
          onApplyFilters={setFilters}
        />

        {products.length === 0 && (
          <p className="text-center text-gray-400">No products found.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {products.map((product) => {
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
                        {formatCurrency(discountedPrice)}
                      </span>
                      <span className="text-gray-400 line-through">
                        {formatCurrency(originalPrice)}
                      </span>
                      <Badge className="bg-red-500 text-white">
                        -{discountPercent}%
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-green-400 text-xl font-bold">
                      {formatCurrency(originalPrice)}
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

        <PaginationControls pagination={pagination} onPageChange={goToPage} />
      </div>
    </div>
  );
};

export default ProductPage;
