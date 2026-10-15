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
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Minus, Plus, Trash2, CreditCard } from 'lucide-react'
import axiosInstance from '@/axios/userAxios'
import { useSelector } from 'react-redux'
import {toast} from 'react-hot-toast';
import { formatCurrency, getActiveOfferPercent } from '@/lib/utils';
import { useNavigate } from 'react-router-dom'

export default function CartPage() {
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const userDetails = useSelector((state) => state.user)
  const getUserId = (userDetails)=>{
    return userDetails?.user?._id || userDetails?.user?.id;
  }

  const navigate = useNavigate()
  const currentUserId = getUserId(userDetails)

  useEffect(() => {
    const userId = currentUserId
    const fetchCartData = async () => {
      try {
        setLoading(true);
    
        const cartResponse = await axiosInstance.post('/cart/details', { userId });
    
        if (!cartResponse.data?.data?.items?.length) {
          setCartItems([]);
          return;
        }
    
        const itemsWithDetails = await Promise.all(
          cartResponse.data.data.items.map(async (item) => {
            try {
              const productResponse = await axiosInstance.get(`/showProductsById/${item.productId}`);
              const product = productResponse.data.product;
    
              // Initialize discount percentages
              let productOffer = 0;
              let categoryOffer = 0;

              // Only fetch offer details if offerId exists
              if (product.offerId) {
                try {
                  const offerDetails = await axiosInstance.get(`/Offer/fetch/${product.offerId}`);
                  productOffer = getActiveOfferPercent(offerDetails.data.offerData);
                } catch (error) {
                  console.log('Error fetching product offer:', error);
                }
              }

              // Always try to fetch category offer as it might exist independently
              if (product.categoryId) {
                try {
                  const categoryOfferDetails = await axiosInstance.get(`/Offer/category/${product.categoryId}`);
                  categoryOffer = getActiveOfferPercent(categoryOfferDetails.data.offerData);
                } catch (error) {
                  console.log('Error fetching category offer:', error);
                }
              }
    
              // Determine the best discount
              const bestDiscount = Math.max(productOffer, categoryOffer);
    
              // Calculate the discounted price
              const selectedVariant = product.variants.find(v => v._id === item.variantId);
              const originalPrice = selectedVariant ? selectedVariant.price : product.price;
              const discountedPrice = originalPrice - (originalPrice * (bestDiscount / 100));
    
              return {
                id: item._id,
                productId: item.productId,
                variantId: item.variantId,
                name: product.title,
                variant: selectedVariant,
                originalPrice: originalPrice,
                discountedPrice: discountedPrice,
                discountPercent: bestDiscount,
                quantity: item.quantity,
                image: product.productImage?.[0] || "/placeholder.svg?height=100&width=100"
              };
            } catch (error) {
              console.log(`Failed to fetch product ${item.productId}:`, error);
              return null;
            }
          })
        );
    
        const activeItems = itemsWithDetails.filter(item => item !== null);
        setCartItems(activeItems);
      } catch (err) {
        console.error('Cart fetch error:', err);
        setError(err.message || 'Failed to fetch cart items');
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchCartData();
    }
  }, [currentUserId]);
  

  const updateQuantity = async (id, newQuantity , availableQuantity) => {
    console.log(availableQuantity,newQuantity)
    const userId = getUserId(userDetails)
    try {
      // Check if new quantity exceeds limit of 7
      if (newQuantity > 7) {
        toast.error("Maximum quantity limit is 7 items");
        return;
      }
      console.log(cartItems)

      if(newQuantity > availableQuantity){
        toast.error("Over than stock");
        return
      }
  
      // Check if quantity is less than 1
      if (newQuantity <= 0) {
        toast.error("Quantity cannot be less than 1");
        return;
      }
  
      // If checks pass, update the quantity
      await axiosInstance.patch(`/cart/update-quantity`, {
        userId: userId,
        itemId: id,
        quantity: newQuantity
      });
  
      setCartItems(cartItems.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      ));
  
      toast.success("Cart updated successfully");
    } catch (err) {
      console.error('Update quantity error:', err);
      toast.error(err.response?.data?.message || 'Failed to update quantity');
      setError('Failed to update quantity');
    }
  };




  
  const removeItem = async (id) => {
    const userId = getUserId(userDetails)
    try {
      await axiosInstance.delete(`/cart/remove-item/${id}`, {
        data: { 
          userId: userId,
          itemId: id 
        }
      });
  
      setCartItems(cartItems.filter(item => item.id !== id));
    } catch (err) {
      console.error('Remove item error:', err);
      setError('Failed to remove item');
    }
  };
  

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + item.discountedPrice * item.quantity, 0);
  };
  
  const calculateTotal = () => {
    return calculateSubtotal(); // Add taxes or shipping fees here if needed
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Loading cart...</p>
      </div>
    )
  }

  const handleCheckout = () => {
    navigate('/checkout');
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
            <CardTitle className="text-3xl font-bold text-center text-white">Your Cart</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {cartItems.length === 0 ? (
              <p className="text-center text-gray-300">Your cart is empty.</p>
            ) : (
              <div className="space-y-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex flex-col gap-4 text-white sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-4 min-w-0">
                  <img src={item.image} alt={item.name} className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 object-cover rounded-md" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg break-words">{item.name}</h3>
                    {item.variant && (
                      <>
                        <div className="text-sm text-gray-400 mt-1">
                          {item.variant.attributes.map((attr, index) => (
                            <span key={index} className="mr-2">
                              {attr.name}: {attr.value}
                              {index < item.variant.attributes.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                        <div className="text-sm mt-1">
                          <span className={`${
                            item.variant.availableQuantity < 5 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {item.variant.availableQuantity < 5 
                              ? `Only ${item.variant.availableQuantity} left in stock!` 
                              : `In Stock: ${item.variant.availableQuantity}`}
                          </span>
                        </div>
                      </>
                    )}
                    {/* <p className="text-gray-400 mt-1">₹{item.price.toFixed(2)}</p> */}
                    <p className="text-gray-400 mt-1 line-through">Original Price: {formatCurrency(item.originalPrice)}</p>
    <p className="text-gray-400 mt-1">Discount: {item.discountPercent}%</p>
    <p className="text-white mt-1">Price: {formatCurrency(item.discountedPrice)}</p>
                  </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-start">
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input 
                      type="number" 
                      value={item.quantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                          updateQuantity(item.id, value);
                        }
                      }}
                      min="1"
                      max="7"
                      className="w-16 text-center bg-gray-800 border-gray-700"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => updateQuantity(item.id, item.quantity + 1 , item.variant.availableQuantity)}
                      disabled={item.quantity >= 7}
                      className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                    <Button 
                      variant="destructive" 
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="bg-red-900 hover:bg-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 text-white">
            <Separator className="bg-gray-800" />
            <div className="w-full space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              {/* <div className="flex justify-between text-gray-400">
                <span>Discount (5%)</span>
                <span>{formatCurrency(calculateDiscount())}</span>
              </div> */}
              <Separator className="bg-gray-800" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
            <Button 
              className="w-full bg-blue-900 hover:bg-green-500 text-primary-foreground"
              size="lg"
              onClick={handleCheckout} 
            >
              <CreditCard className="mr-2 h-5 w-5 text-white"/> Proceed to Payment
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}