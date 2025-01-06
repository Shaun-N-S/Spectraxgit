import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Edit2, Trash2, MapPin, CreditCard, Truck, ChevronDown, ChevronUp } from 'lucide-react';
import { useSelector } from 'react-redux';
import axiosInstance from '@/axios/userAxios';
import { useNavigate } from 'react-router-dom';

const CheckoutPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [addressForm, setAddressForm] = useState({
    address: '',
    city: '',
    state: '',
    pinCode: '',
    country: '',
  });
  const [errors, setErrors] = useState({});
  const [priceDetails, setPriceDetails] = useState({
    subtotal: 0,
    shipping: 0,
    //discount: 0,
    total: 0
  });
  const [cartItems, setCartItems] = useState([]);

  const navigate = useNavigate();

  const userDetails = useSelector((state) => state.user);
  const getUserId = (userDetails) => {
    return userDetails?.user?._id || userDetails?.user?.id;
  };
  const userId = getUserId(userDetails);

  useEffect(() => {
    fetchAddresses();
    fetchCartData();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await axiosInstance.get(`/User/Address/${userId}`);
      if (response.status === 200) {
        setAddresses(response.data.address);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast.error("Failed to load addresses.");
    }
  };

  const fetchCartData = async () => {
    try {
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
            
            if (!product || product.status !== 'active') {
              return null;
            }

            const selectedVariant = product.variants.find(v => v._id === item.variantId);

            return {
              id: item._id,
              productId: item.productId,
              variantId: item.variantId,
              name: product.title,
              variant: selectedVariant,
              price: selectedVariant ? selectedVariant.price : product.price,
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

      // Calculate price details
      const subtotal = activeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      // const shipping = 50; // Example shipping cost
      // const discount = subtotal * 0.05; // Example tax calculation (18% GST)
      const total = subtotal // + shipping - discount;

      setPriceDetails({
        subtotal,
        // shipping,
        // discount,
        total
      });

    } catch (err) {
      console.error('Cart fetch error:', err);
      toast.error('Failed to fetch cart items');
    }
  };

  const validateAddress = () => {
    const newErrors = {};
    
    if (!addressForm.address?.trim()) newErrors.address = 'Address is required';
    if (!addressForm.city?.trim()) newErrors.city = 'City is required';
    if (!addressForm.state?.trim()) newErrors.state = 'State is required';
    if (!addressForm.pinCode?.trim()) {
      newErrors.pinCode = 'Pin code is required';
    } else if (!/^\d{6}$/.test(addressForm.pinCode.trim())) {
      newErrors.pinCode = 'Please enter a valid 6-digit pin code';
    }
    if (!addressForm.country?.trim()) newErrors.country = 'Country is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const handleSaveAddress = async () => {
    if (!validateAddress()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setIsSaving(true);
      if (editingAddress) {
        await axiosInstance.put(`/User/Address/${editingAddress._id}`, {
          ...addressForm,
          userId: getUserId(userDetails),
        });
        toast.success("Address updated successfully");
      } else {
        await axiosInstance.post('/addAddress', {
          ...addressForm,
          userId: getUserId(userDetails),
        });
        toast.success("Address added successfully");
      }
      
      await fetchAddresses();
      setShowAddressForm(false);
      setEditingAddress(null);
      resetAddressForm();
    } catch (error) {
      console.error("Failed to save address:", error);
      toast.error(editingAddress ? "Failed to update address" : "Failed to add address");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      await axiosInstance.put(`/address/${addressId}/status`);
      await fetchAddresses();
      if (selectedAddress === addressId) {
        setSelectedAddress(null);
      }
      toast.success("Address deleted successfully");
    } catch (error) {
      console.error("Failed to delete address:", error);
      toast.error("Failed to delete address");
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      address: '',
      city: '',
      state: '',
      pinCode: '',
      country: '',
    });
    setErrors({});
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressForm({
      address: address.address,
      city: address.city,
      state: address.state,
      pinCode: address.pinCode,
      country: address.country,
    });
    setShowAddressForm(true);
  };

  const handleCancelAddress = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
    resetAddressForm();
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error("Please select a delivery address.");
      return;
    }
  
    if (!cartItems.length) {
      toast.error("Your cart is empty");
      return;
    }
  
    try {
      const selectedAddressDetails = addresses.find(addr => addr._id === selectedAddress);
  
      if (!selectedAddressDetails) {
        toast.error("Selected address not found");
        return;
      }
  
      // Format products with proper variant information
      const formattedProducts = cartItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        variant: {
          name: item.variant.name || `${item.name} - ${item.variant.attributes.map(attr => attr.value).join(' ')}`,
          price: item.variant.price || item.price,
          attributes: item.variant.attributes || []
        }
      }));
  
      const orderData = {
        userId,
        shippingAddress: {
          address: selectedAddressDetails.address,
          city: selectedAddressDetails.city,
          state: selectedAddressDetails.state,
          country: selectedAddressDetails.country,
          pinCode: selectedAddressDetails.pinCode,
        },
        products: formattedProducts,
        paymentMethod: "Cash on Delivery",
      };
  
      const response = await axiosInstance.post('/place-order', orderData);
  
      if (response.status === 201) {
        toast.success("Order placed successfully!");
        console.log(response);
    
        const orderId = response.data?.order?._id; 
    
        if (orderId) {
            navigate(`/orderSuccessful/${orderId}`, {
                state: { orderId }
            });
        } else {
            console.error("Order ID not found in response.");
            toast.error("Order ID not found. Please try again.");
        }
    }
    
        
        
        // setCartItems([]);
        
      
    } catch (error) {
      console.error('Error placing order:', error);
      const errorMessage = error.response?.data?.message || "Failed to place order. Please try again.";
      toast.error(errorMessage);
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-10 text-center text-green-400">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Addresses and Payment */}
          <div className="lg:col-span-2 space-y-8">
            {/* Delivery Addresses */}
            <Card className="bg-gray-800 border-green-500">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-2xl font-bold text-green-400">Delivery Address</CardTitle>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingAddress(null);
                    resetAddressForm();
                    setShowAddressForm(!showAddressForm);
                  }} 
                  className="text-green-400 border-green-500 hover:bg-green-500 hover:text-black"
                >
                  {showAddressForm ? <ChevronUp className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                  {showAddressForm ? 'Hide Form' : 'Add New'}
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72 mb-4">
                  <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                    {addresses.map(address => (
                      <div key={address._id} className="flex items-center justify-between space-x-2 mb-4 p-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
                        <div className="flex items-center space-x-4">
                          <RadioGroupItem value={address._id} id={`address-${address._id}`} className="border-green-500 text-green-500" />
                          <Label htmlFor={`address-${address._id}`} className="flex flex-col cursor-pointer">
                            <span className="font-semibold text-green-400">{address.address}</span>
                            <span className="text-sm text-gray-400">{address.city}, {address.state} {address.pinCode}</span>
                            <span className="text-sm text-gray-400">{address.country}</span>
                          </Label>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditAddress(address)} className="text-green-400 hover:text-green-500">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteAddress(address._id)} className="text-red-400 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </ScrollArea>

                {/* Address Form */}
                {showAddressForm && (
                  <Card className="bg-gray-700 border-green-500 mt-4">
                    <CardContent className="pt-6">
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveAddress();
                      }} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="address" className="text-green-400">Address</Label>
                          <Textarea
                            id="address"
                            name="address"
                            value={addressForm.address}
                            onChange={handleAddressChange}
                            className={`bg-gray-600 border-green-500 text-white ${errors.address ? 'border-red-500' : ''}`}
                          />
                          {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="city" className="text-green-400">City</Label>
                            <Input
                              id="city"
                              name="city"
                              value={addressForm.city}
                              onChange={handleAddressChange}
                              className={`bg-gray-600 border-green-500 text-white ${errors.city ? 'border-red-500' : ''}`}
                            />
                            {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="state" className="text-green-400">State</Label>
                            <Input
                              id="state"
                              name="state"
                              value={addressForm.state}
                              onChange={handleAddressChange}
                              className={`bg-gray-600 border-green-500 text-white ${errors.state ? 'border-red-500' : ''}`}
                            />
                            {errors.state && <p className="text-red-500 text-sm">{errors.state}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="pinCode" className="text-green-400">Pin Code</Label>
                            <Input
                              id="pinCode"
                              name="pinCode"
                              value={addressForm.pinCode}
                              onChange={handleAddressChange}
                              className={`bg-gray-600 border-green-500 text-white ${errors.pinCode ? 'border-red-500' : ''}`}
                            />
                            {errors.pinCode && <p className="text-red-500 text-sm">{errors.pinCode}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="country" className="text-green-400">Country</Label>
                            <Input
                              id="country"
                              name="country"
                              value={addressForm.country}
                              onChange={handleAddressChange}
                              className={`bg-gray-600 border-green-500 text-white ${errors.country ? 'border-red-500' : ''}`}
                            />
                            {errors.country && <p className="text-red-500 text-sm">{errors.country}</p>}
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2 mt-4">
                          <Button
                            type="submit"
                            disabled={isSaving}
                            className="bg-green-500 text-black hover:bg-green-600"
                          >
                            {isSaving ? 'Saving...' : editingAddress ? 'Update Address' : 'Save Address'}
                          </Button>
                          
                          <Button 
                            type="button"
                            variant="outline" 
                            onClick={handleCancelAddress}
                            disabled={isSaving}
                            className="border-green-500 text-green-400 hover:bg-green-500 hover:text-black"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="bg-gray-800 border-green-500">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-green-400">Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup defaultValue="cod">
                  <div className="flex items-center space-x-2 p-4 rounded-lg bg-gray-700">
                    <RadioGroupItem value="cod" id="cod" className="border-green-500 text-green-500" />
                    <Label htmlFor="cod" className="text-green-400 flex items-center">
                      <CreditCard className="mr-2 h-5 w-5" />
                      Cash on Delivery
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-1 space-y-8">
            <Card className="bg-gray-800 border-green-500">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-green-400">Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 mb-4">
                  {cartItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center mb-4 p-2 rounded-lg bg-gray-700">
                      <div className="flex items-center space-x-4">
                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                        <div>
                          <p className="font-semibold text-green-400">{item.name}</p>
                          <div className="text-sm text-gray-400 mt-1">
                            {item.variant.attributes.map((attr, index) => (
                              <span key={index} className="mr-2">
                                {attr.name}: {attr.value}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-gray-400">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-bold text-green-400">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </ScrollArea>
                <Separator className="my-4 bg-gray-600" />
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>₹{priceDetails.subtotal.toFixed(2)}</span>
                  </div>
                  {/* <div className="flex justify-between text-gray-400">
                    <span>Shipping</span>
                    <span>₹{priceDetails.shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Discount</span>
                    <span>₹{priceDetails.discount.toFixed(2)}</span>
                  </div> */}
                  <Separator className="my-2 bg-gray-600" />
                  <div className="flex justify-between font-bold text-lg text-green-400">
                    <span>Total</span>
                    <span>₹{priceDetails.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handlePlaceOrder} className="w-full py-6 text-lg bg-green-500 text-black hover:bg-green-600 transition-colors">
              <Truck className="mr-2 h-5 w-5" /> Place Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
