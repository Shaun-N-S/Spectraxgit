
import { useEffect, useRef, useState } from 'react'
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
import { formatCurrency } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import PaginationControls from '../Pagination/PaginationControls'

const WISHLIST_PAGE_SIZE = 5

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  // Bumped after a removal to reload the current page.
  const [reloadCount, setReloadCount] = useState(0)
  const wishlistRequestRef = useRef(0)

 const userDetails = useSelector((state)=>state.user)
   const getUserId = (userDetails)=>{
     return userDetails?.user?._id || userDetails?.user?.id
   }
   const userId = getUserId(userDetails)



  const navigate = useNavigate()

  // The backend returns one page of the wishlist, skipping inactive or
  // deleted products, and moves a page past the end back to the last page.
  useEffect(() => {
    if (!userId) return

    const requestId = ++wishlistRequestRef.current
    const isLatest = () => requestId === wishlistRequestRef.current

    const fetchWishlistData = async () => {
      try {
        const response = await axiosInstance.get(`/wishlist/${userId}`, {
          params: { page: currentPage, limit: WISHLIST_PAGE_SIZE },
        })
        if (!isLatest()) return

        const items = response.data.wishlist.product.map((item) => ({
          id: item._id,
          productId: item.productId._id,
          variantId: item.variantId, // Include variantId here
          name: item.productId.title,
          price: item.productId.price,
          image: item.productId.productImage?.[0] || "/placeholder.svg?height=100&width=100",
          description: item.productId.description,
        }))

        setWishlistItems(items)
        setPagination(response.data.pagination)
        if (response.data.pagination.currentPage !== currentPage) {
          setCurrentPage(response.data.pagination.currentPage)
        }
      } catch (err) {
        if (!isLatest()) return
        console.error('Wishlist fetch error:', err)
        setError(err.message || 'Failed to fetch wishlist items')
      } finally {
        if (isLatest()) setLoading(false)
      }
    }

    fetchWishlistData()
  }, [userId, currentPage, reloadCount])

  console.log(wishlistItems)


const removeFromWishlist = async (productId, variantId) => {
  const userId = getUserId(userDetails);
  try {
    await axiosInstance.post('/remove/wishlist', { userId, productId, variantId });
    // Reload the page from the backend; if it is now past the end, the
    // backend returns the last remaining page.
    setReloadCount((count) => count + 1);
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
                {wishlistItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 text-white">
                    <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded-md" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <p className="text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                      <p className="text-gray-400 mt-1 line-clamp-2">{item.variant}</p>
                      <p className="text-gray-400 mt-1">{formatCurrency(item.price)}</p>
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

            <PaginationControls pagination={pagination} onPageChange={setCurrentPage} />
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

