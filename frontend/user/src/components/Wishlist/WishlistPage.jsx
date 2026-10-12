'use client'

import { useEffect, useState } from 'react'
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Trash2, ShoppingCart, Heart } from 'lucide-react'
import axiosInstance from '@/axios/userAxios'
import { useSelector } from 'react-redux'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

 const userDetails = useSelector((state)=>state.user)
   const getUserId = (userDetails)=>{
     return userDetails?.user?._id || userDetails?.user?.id
   }
   const userId = getUserId(userDetails)



  const navigate = useNavigate()

  useEffect(() => {
    const fetchWishlistData = async () => {
      try {
        setLoading(true)
        const response = await axiosInstance.get(`/wishlist/${userId}`)
        const items = response.data.wishlist.product

        const itemsWithDetails = await Promise.all(
          items.map(async (item) => {
            try {
              const productResponse = await axiosInstance.get(`/showProductsById/${item.productId._id}`);
              const product = productResponse.data.product;
        
              if (!product || product.status !== 'active') {
                return null;
              }
        
              return {
                id: item._id,
                productId: item.productId._id,
                variantId: item.variantId, // Include variantId here
                name: product.title,
                price: product.price,
                image: product.productImage?.[0] || "/placeholder.svg?height=100&width=100",
                description: product.description,
              };
            } catch (error) {
              console.log(`Failed to fetch product ${item.productId._id}:`, error);
              return null;
            }
          })
        );
        

        const activeItems = itemsWithDetails.filter(item => item !== null)
        setWishlistItems(activeItems)
        setCurrentPage(1)
        
      } catch (err) {
        console.error('Wishlist fetch error:', err)
        setError(err.message || 'Failed to fetch wishlist items')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchWishlistData()
    }
  }, [userId])

  console.log(wishlistItems)


const removeFromWishlist = async (productId, variantId) => {
  const userId = getUserId(userDetails);
  try {
    await axiosInstance.post('/remove/wishlist', { userId, productId, variantId });
    const remainingItems = wishlistItems.filter(item => item.productId !== productId);
    setWishlistItems(remainingItems);
    // Removing the last item on the final page moves back to the last remaining page.
    const remainingPages = Math.max(1, Math.ceil(remainingItems.length / itemsPerPage));
    setCurrentPage((page) => Math.min(page, remainingPages));
    toast.success('Item removed from wishlist');
  } catch (err) {
    console.error('Remove item error:', err);
    toast.error('Failed to remove item from wishlist');
  }
};

console.log("Wishlists")
const handleCart = async (userId, productId, variantId) => {
  console.log("UserId:", userId);
console.log("ProductId:", productId);
console.log("VariantId:", variantId);

  try {
    await axiosInstance.post(
      '/Cart',
      { 
        userId,
        productId,
        variantId,
        quantity: 1
      },
      { withCredentials: true } 
    );
    
    console.log("Product added to cart successfully");
    toast.success("Added to cart");
    navigate('/cart');
  } catch (error) {
    console.log("Error in handle cart:", error || error.message);
    toast.error("Product out of stock  ");
  }
};



  const totalPages = Math.ceil(wishlistItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = wishlistItems.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Loading wishlist...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-900 border-gray-800 shadow-2xl">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-3xl font-bold text-center text-white">Your Wishlist</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {wishlistItems.length === 0 ? (
              <p className="text-center text-gray-300">Your wishlist is empty.</p>
            ) : (
              <div className="space-y-6">
                {currentItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 text-white">
                    <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded-md" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <p className="text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                      <p className="text-gray-400 mt-1 line-clamp-2">{item.variant}</p>
                      <p className="text-gray-400 mt-1">₹{item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={()=>handleCart(userId, item.productId, item.variantId)}
                        className="bg-gray-800 hover:bg-gray-700"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                      <Button 
  variant="destructive" 
  size="icon"
  onClick={() => removeFromWishlist(item.productId, item.variantId)}
  className="bg-red-900 hover:bg-red-800"
>
  <Trash2 className="h-4 w-4" />
</Button>

                    </div>
                  </div>
                ))}
              </div>
            )}

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
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 text-white">
            <Separator className="bg-gray-800" />
            <Button 
              className="w-full bg-blue-900 hover:bg-green-500 text-primary-foreground"
              size="lg"
              onClick={() => navigate('/shop')}
            >
              <Heart className="mr-2 h-5 w-5 text-white"/> Continue Shopping
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

