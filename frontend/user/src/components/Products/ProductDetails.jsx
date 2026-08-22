import { useState, useEffect } from "react";
import { ShoppingCart, Heart, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "@/axios/userAxios";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import PriceDisplay from "@/components/PriceDisplay/PriceDisplay";

export default function ProductDetail() {
  const [productData, setProductData] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [brand, setBrand] = useState("");
  const [zoomStyle, setZoomStyle] = useState({ display: "none" });
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [offerData, setOfferData] = useState(null);
  const [productOffer, setProductOffer] = useState(null);
  const [categoryOffer, setCategoryOffer] = useState(null);
  const [bestDiscount, setBestDiscount] = useState({
    discountedPrice: 0,
    originalPrice: 0,
    savings: 0,
    discountPercent: 0,
  });
  const [wishlistMap, setWishlistMap] = useState({});
  const navigate = useNavigate();

  const userDetails = useSelector((state) => state.user);
  const getUserId = (userDetails) => {
    return userDetails?.user?._id || userDetails?.user?.id;
  };
  const userId = getUserId(userDetails);
  const { id } = useParams();

  useEffect(() => {
    // Reset product-specific UI state before loading a different product, so
    // nothing from the previous product can remain visible or stale while
    // (or after) the new one loads.
    setLoading(true);
    setError(null);
    setSelectedImage(0);
    setProductData(null);
    setSelectedVariant(null);
    setBrand("");
    setProductOffer(null);
    setCategoryOffer(null);
    setRelatedProducts([]);
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch product data
      const productResponse = await axiosInstance.get(
        `/showProductsById/${id}`,
      );
      const product = productResponse.data.product;

      if (!product) {
        setError("Product not found");
        setLoading(false);
        return;
      }

      setProductData(product);

      if (userId) {
        try {
          const wishlistResponse = await axiosInstance.get(
            `/wishlist/${userId}`,
          );
          const wishlistItems = wishlistResponse.data.wishlist?.product || [];

          const newWishlistMap = {};
          wishlistItems.forEach((item) => {
            newWishlistMap[item.productId._id] = true;
          });
          setWishlistMap(newWishlistMap);
          setIsInWishlist(!!newWishlistMap[id]); // Update isInWishlist based on wishlistMap
        } catch (error) {
          console.error("Error fetching wishlist:", error);
        }
      }

      // Safely set initial variant
      if (product.variants && product.variants.length > 0) {
        setSelectedVariant(product.variants[0]);
      }

      // Fetch brand data
      try {
        const brandResponse = await axiosInstance.get(
          `/showBrandbyId/${product.brandId}`,
        );
        setBrand(brandResponse.data.brand);
      } catch (error) {
        console.error("Error fetching brand:", error);
      }

      // Fetch product offer if exists
      let productOfferData = null;
      if (product.offerId) {
        try {
          const productOfferResponse = await axiosInstance.get(
            `/Offer/fetch/${product.offerId}`,
          );
          productOfferData = productOfferResponse.data.offerData;
          setProductOffer(productOfferData);
        } catch (error) {
          console.error("Error fetching product offer:", error);
        }
      }

      // Fetch category offer if exists
      let categoryOfferData = null;
      if (product.categoryId) {
        try {
          const categoryOfferResponse = await axiosInstance.get(
            `/Offer/category/${product.categoryId}`,
          );
          categoryOfferData = categoryOfferResponse.data.offerData;
          setCategoryOffer(categoryOfferData);
        } catch (error) {
          console.error("Error fetching category offer:", error);
        }
      }

      // Calculate best discount only if we have a valid variant
      if (product.variants && product.variants.length > 0) {
        calculateBestDiscount(
          product.variants[0].price,
          productOfferData,
          categoryOfferData,
        );
      }

      // Fetch related products if category exists
      if (product.categoryId) {
        fetchRelatedProducts(product.categoryId);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Error fetching product data");
      setLoading(false);
    }
  };

  const calculateBestDiscount = (
    originalPrice,
    productOffer,
    categoryOffer,
  ) => {
    let bestDiscountPercent = 0;
    const currentDate = new Date();

    // Check product offer
    if (
      productOffer &&
      productOffer.isActive &&
      new Date(productOffer.startDate) <= currentDate &&
      new Date(productOffer.endDate) >= currentDate
    ) {
      bestDiscountPercent = Math.max(
        bestDiscountPercent,
        productOffer.discountPercent,
      );
    }

    // Check category offer
    if (
      categoryOffer &&
      categoryOffer.isActive &&
      new Date(categoryOffer.startDate) <= currentDate &&
      new Date(categoryOffer.endDate) >= currentDate
    ) {
      bestDiscountPercent = Math.max(
        bestDiscountPercent,
        categoryOffer.discountPercent,
      );
    }

    const discountedPrice =
      originalPrice - originalPrice * (bestDiscountPercent / 100);
    const savings = originalPrice - discountedPrice;

    setBestDiscount({
      discountedPrice: discountedPrice,
      originalPrice: originalPrice,
      savings: savings,
      discountPercent: bestDiscountPercent,
    });
  };

  // Update discount calculation when variant changes
  useEffect(() => {
    if (selectedVariant && (productOffer || categoryOffer)) {
      calculateBestDiscount(selectedVariant.price, productOffer, categoryOffer);
    }
  }, [selectedVariant, productOffer, categoryOffer]);

  console.log(
    "offer ID .............................................",
    productData?.offerId,
  );

  const fetchRelatedProducts = (category) => {
    axiosInstance
      .get(`/productsByCategory/${category}`)
      .then((response) => {
        setRelatedProducts(
          response.data.products.filter((product) => product.id !== id),
        );
      })
      .catch(() => {
        console.error("Error fetching related products");
      });
  };

  const handleShop = (productId) => {
    navigate(`/product_details/${productId}`);
  };

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
  };

  const handleMouseMove = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setZoomStyle({
      display: "block",
      backgroundImage: `url(${productData.productImage[selectedImage]})`,
      backgroundPosition: `${x}% ${y}%`,
      left: `${e.clientX - rect.left - 75}px`,
      top: `${e.clientY - rect.top - 75}px`,
    });
  };

  const handleCart = async (userId, productId, variantId) => {
    console.log("suer ID  ....", userId);
    if (!userId) {
      toast.error("Please login to add items to cart");
      navigate("/login");
      return;
    }
    try {
      // Using selectedVariant._id instead of hardcoded first variant
      await axiosInstance.post(
        "/Cart",
        {
          userId,
          productId,
          variantId: selectedVariant._id, // Use selected variant
          quantity: 1,
        },
        { withCredentials: true },
      );

      toast.success("Added to cart");
      navigate("/cart");
    } catch (error) {
      console.error("Error in handle cart:", error);
      toast.error("Product is out of stock");
    }
  };

  const handleWishlist = async () => {
    if (!userId) {
      toast.error("Please login to add items to wishlist");
      navigate("/login");
      return;
    }

    try {
      const isCurrentlyInWishlist = wishlistMap[id];
      let response;

      if (isCurrentlyInWishlist) {
        // Remove from wishlist
        response = await axiosInstance.post("/remove/wishlist", {
          userId,
          productId: id,
          variantId: selectedVariant._id,
        });
        if (response.data.success) {
          setWishlistMap((prev) => {
            const newMap = { ...prev };
            delete newMap[id];
            return newMap;
          });
          setIsInWishlist(false);
          toast.success("Removed from wishlist");
        }
      } else {
        // Add to wishlist
        response = await axiosInstance.post("/add/wishlist", {
          userId,
          productId: id,
          variantId: selectedVariant._id,
        });
        if (response.data.success) {
          setWishlistMap((prev) => ({
            ...prev,
            [id]: true,
          }));
          setIsInWishlist(true);
          toast.success("Added to wishlist");
        }
      }
    } catch (error) {
      console.error("Wishlist error:", error);
      toast.error(error.response?.data?.message || "Error updating wishlist");
    }
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: "none" });
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );

  if (error)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <p className="text-red-400 text-xl">{error}</p>
      </div>
    );

  if (!productData)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <p className="text-white text-xl">Product not found</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 space-y-12">
        <Button
          variant="ghost"
          className="mb-4 text-gray-400 hover:text-black transition-colors"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to products
        </Button>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div
              className="relative aspect-square overflow-hidden rounded-xl bg-gray-800 transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/20"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <img
                src={productData.productImage[selectedImage]}
                alt={productData.title}
                className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
              />
              <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                Sale
              </Badge>
              <div
                className="absolute w-80 h-80 border-2 border-primary/50 pointer-events-none bg-no-repeat bg-cover  "
                style={{
                  ...zoomStyle,
                  position: "absolute",
                  backgroundSize: "300%",
                }}
              ></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {productData.productImage.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative aspect-square overflow-hidden rounded-lg transition-all duration-300 ${
                    selectedImage === index
                      ? "ring-2 ring-primary scale-95"
                      : "hover:scale-105"
                  }`}
                >
                  <img
                    src={image}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover transition-opacity hover:opacity-80"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-white">
                {productData.title}
              </h1>
              <PriceDisplay
                originalPrice={
                  selectedVariant ? selectedVariant.price : productData.price
                }
                productOffer={productOffer}
                categoryOffer={categoryOffer}
              />
              <p className="text-lg text-gray-300 leading-relaxed">
                {productData.description}
              </p>
              <p className="text-sm text-gray-400">
                Available Stock :
                <span
                  className={`font-semibold ${selectedVariant.availableQuantity > 0 ? "text-white" : "text-red-500"}`}
                >
                  {selectedVariant.availableQuantity > 0
                    ? selectedVariant.availableQuantity
                    : "Out of Stock"}
                </span>
              </p>
            </div>

            {/* Variants */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Variants</h3>
              <div className="grid grid-cols-2 gap-4 ">
                {productData.variants.map((variant, index) => (
                  <Button
                    key={index}
                    onClick={() => handleVariantChange(variant)}
                    variant={
                      selectedVariant === variant ? "default" : "outline"
                    }
                    className="bg-blue-950 w-full justify-start transition-all duration-300 hover:scale-105"
                  >
                    <div className="text-left">
                      {variant.attributes.map((attr, attrIndex) => (
                        <div key={attrIndex}>
                          {attr.name}: {attr.value}
                        </div>
                      ))}
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  className="w-full bg-blue-950 text-primary-foreground hover:bg-blue-950 transition-all duration-300 hover:scale-105"
                  onClick={() =>
                    handleCart(userId, productData._id, selectedVariant._id)
                  }
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className={`w-full border-primary text-primary hover: transition-all duration-300 hover:scale-105`}
                  onClick={handleWishlist}
                >
                  <Heart
                    className={`w-4 h-4 mr-2 ${
                      wishlistMap[id] ? "text-red-500 fill-current" : ""
                    }`}
                  />
                  {wishlistMap[id] ? "Remove from Wishlist" : "Add to Wishlist"}
                </Button>
              </div>
              {/* <Button size="lg" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all duration-300 hover:scale-100 hover:bg-green-400">
                Buy Now
              </Button> */}
            </div>

            <Tabs defaultValue="specifications" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger
                  value="specifications"
                  className="text-white data-[state=active]:bg-gray-700"
                >
                  Specifications
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="text-white data-[state=active]:bg-gray-700"
                >
                  Details
                </TabsTrigger>
              </TabsList>
              <TabsContent value="specifications" className="space-y-4">
                <Card className="p-6 bg-gray-800 text-white border-gray-700">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-gray-400">Brand</dt>
                      <dd>{brand.name || "N/A"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-400">Model</dt>
                      <dd>{productData.specifications.model}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-400">Series</dt>
                      <dd>{productData.specifications.series}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-400">Color</dt>
                      <dd>{productData.color}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-400">Weight</dt>
                      <dd>{productData.specifications.itemWeight}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-400">Dimensions</dt>
                      <dd>{productData.specifications.dimensions}</dd>
                    </div>
                  </dl>
                </Card>
              </TabsContent>
              <TabsContent value="details">
                <Card className="p-6 bg-gray-800 text-white border-gray-700">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-gray-400">
                        Manufacturer
                      </dt>
                      <dd>{productData.specifications.manufacturer}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-400">
                        Country of Origin
                      </dt>
                      <dd>{productData.specifications.countryOfOrigin}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-400">Warranty</dt>
                      <dd>{productData.specifications.warranty}</dd>
                    </div>
                  </dl>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-center text-white">
              Related Products
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden group bg-gray-800 border-gray-700 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
                >
                  <div className="aspect-square relative">
                    <img
                      src={product.productImage[0]}
                      alt={product.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold truncate text-white">
                      {product.title}
                    </h3>
                    <p className="text-lg font-bold text-white">
                      ₹{product.price?.toFixed(2)}
                    </p>
                    <Button
                      variant="secondary"
                      className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all duration-300"
                      onClick={() => handleShop(product._id)}
                    >
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        {/* <section className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight text-center text-white">Customer Reviews</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "John Doe",
                rating: 5,
                comment: "Excellent product! The quality exceeded my expectations. Highly recommend it!"
              },
              {
                name: "Jane Smith",
                rating: 4,
                comment: "Good value for the price. Works well, but shipping took a bit longer than expected."
              },
              {
                name: "Michael Brown",
                rating: 5,
                comment: "Amazing product! Customer service was also very helpful and responsive."
              }
            ].map((review, index) => (
              <Card key={index} className="p-6 bg-gray-800 border-gray-700 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-white">{review.name}</p>
                      <div className="flex text-yellow-400">
                        {Array(5).fill(0).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'stroke-current fill-none'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-300">{review.comment}</p>
                </div>
              </Card>
            ))}
          </div>
        </section> */}
      </div>
    </div>
  );
}
