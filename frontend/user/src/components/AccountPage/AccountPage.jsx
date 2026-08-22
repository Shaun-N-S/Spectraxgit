import { useState, useEffect } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSelector } from 'react-redux'
import axiosInstance from '@/axios/userAxios'
import toast from 'react-hot-toast'
import { Package, Pencil, Trash, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import OrderDetailsBox from './OrderDetailsBox'
export default function AccountPage() {
  // State for user profile data
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    
  });

  // State for address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    address: '',
    city: '',
    state: '',
    pinCode: '',
    country: '',
    phone: '',
  });

  const [addresses, setAddresses] = useState({ address: [] });

  const [orderDetails, setOrderDetails] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [walletDetails,setWalletDetails] = useState([]);


  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);


  const [editingAddress, setEditingAddress] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
  });
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);

  const [errors, setErrors] = useState({
    profile: {},
    address: {},
    password: {}
  });

  // const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [topUpAmount, setTopUpAmount] = useState('');


  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5; 


  const [currentTransactionPage, setCurrentTransactionPage] = useState(1);
  const transactionsPerPage = 5;


  const validateProfile = () => {
    const newErrors = {};
    
    if (!profileData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if(/\d/.test(profileData.firstName)){
      newErrors.firstName = "Numbers are not allowed in first name";
    }
    
    if (!profileData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if(/\d/.test(profileData.lastName)){
      newErrors.lastName = "Numbers are not allowed in last name"
    }
    
    if (!profileData.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(profileData.phone.trim())) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    } else if (/^0{10}$/.test(profileData.phone.trim())) {
      newErrors.phone = 'Phone number cannot be all zeros';
    }
    

    setErrors(prev => ({ ...prev, profile: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateAddress = () => {
    const newErrors = {};
    
    if (!addressForm.address?.trim()) {
      newErrors.address = 'Address is required';
    }

  if(!/[a-zA-Z]/.test(addressForm.address)){
    newErrors.address = "Address must contain at least one letter.";
  }
    
    if (!addressForm.city?.trim()) {
      newErrors.city = 'City is required';
    }
    if(!/[a-zA-Z]/.test(addressForm.city)){
      newErrors.city = "city must contain at least one letter.";
    }
    
    if (!addressForm.state?.trim()) {
      newErrors.state = 'State is required';
    }

    if(!/[a-zA-Z]/.test(addressForm.state)){
      newErrors.state = "state must contain at least one letter.";
    }
    
    if (!addressForm.pinCode?.trim()) {
      newErrors.pinCode = 'Pin code is required';
    } else if (!/^\d{6}$/.test(addressForm.pinCode.trim())) {
      newErrors.pinCode = 'Please enter a valid 6-digit pin code';
    }
    
    if (!addressForm.country?.trim()) {
      newErrors.country = 'Country is required';
    }
    if (!addressForm.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(prev => ({ ...prev, address: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};
    
    if (!passwordForm.oldPassword) {
      newErrors.oldPassword = 'Current password is required';
    }
    
    if (!passwordForm.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(prev => ({ ...prev, password: newErrors }));
    return Object.keys(newErrors).length === 0;
  };


  // Get user details from Redux store
  const userDetails = useSelector((state) => state.user);
  console.log("User details id .............",userDetails.user.id)

  const getUserId = (userDetails)=>{
    return userDetails?.user?._id || userDetails?.user?.id
  }


  useEffect(() => {
    const userId = getUserId(userDetails);
    const fetchUserData = async () => {
      if (!userId) {
        toast.error('User ID not found');
        return;
      }
  
      try {
        setIsLoading(true);
  
        // Fetch User Details
        const userResponse = await axiosInstance.get('/profile');
        const userData = userResponse.data;
  
        if (!userData?.user) {
          throw new Error('Invalid user data received');
        }
  
        setProfileData({
          firstName: userData.user.firstName || userDetails.user.firstName || userDetails.user.name || '',
          lastName: userData.user.lastName || '',
          phone: userData.user.phone || '',
          email: userDetails.user.email || '',
        });
  
        // Fetch Addresses
        const addressResponse = await axiosInstance.get(`/User/Address/${userId}`);
        
        // Ensure proper data structure
        if (addressResponse.data && Array.isArray(addressResponse.data.address)) {
          setAddresses(addressResponse.data);
        } else {
          setAddresses({ address: [] });
        }

        const orderData = await axiosInstance.get(`/fetch/orders/${userId}`)
        if(!orderData){
          toast.error("error in fetching order details..")
        }
        setOrderDetails(orderData.data.orderDetails)
        console.log(orderData.data.orderDetails)


        const walletData = await axiosInstance.get(`/Wallet/${userId}`);
if (!walletData || !walletData.data.walletDetails) {
  toast.error("No wallet found. Setting up default wallet details.");
  setWalletDetails({ balance: 0, transactions: [] }); // Default wallet
} else {
  setWalletDetails(walletData.data.walletDetails);
}
  
      } catch (error) {
        console.error('Failed to fetch user data or addresses:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch user data or addresses');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchUserData();
  }, [userDetails]);
  
  console.log("wallet details from response ...............",walletDetails)
  console.log("order details ...... :",orderDetails)
  console.log(orderDetails?.products?.name)

  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle address form changes
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!validateProfile()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setIsSaving(true);
      const response = await axiosInstance.post('/updateProfile', {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        email: profileData.email
      });

      setProfileData(prev => ({
        ...prev,
        ...response.data.user
      }));
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };


  // Save new address
  const handleSaveAddress = async () => {
    if (!validateAddress()) {
      toast.error('Please fix the errors in the form');
      return;
    }
  
    const userId = getUserId(userDetails);
    if (!userId) {
      toast.error('User ID not found');
      return;
    }
  
    try {
      setIsSaving(true);
      
      const response = await axiosInstance.post('/addAddress', {
        ...addressForm,
        userId: userId,
      });
  
      if (response.data) {
        const updatedAddresses = await axiosInstance.get(`/User/Address/${userId}`);
        setAddresses(updatedAddresses.data);
      }
  
      setShowAddressForm(false);
      setAddressForm({
        address: '',
        city: '',
        state: '',
        pinCode: '',
        country: '',
        phone: '',
      });
  
      setErrors(prev => ({ ...prev, address: {} }));
      toast.success("Address added successfully");
    } catch (error) {
      console.error("Failed to add address:", error);
      toast.error("Failed to add address");
    } finally {
      setIsSaving(false);
    }
  };
  
 // cancel handler:
const handleCancelAddress = () => {
  setShowAddressForm(false);
  setEditingAddress(null);
  setAddressForm({
    address: '',
    city: '',
    state: '',
    pinCode: '',
    country: '',
    phone: '',
  });
};
  

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressForm({
      address: address.address,
      city: address.city,
      state: address.state,
      pinCode: address.pinCode,
      country: address.country,
      phone:address.phone,
    });
    setShowAddressForm(true);
  };


  const handleUpdateAddress = async () => {
      const userId = getUserId(userDetails);
      if (!userId || !editingAddress?._id) {
        toast.error('Required IDs not found');
        return;
      }

        if (!validateAddress()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
      try {
        setIsSaving(true);
        await axiosInstance.put(`/User/Address/${editingAddress._id}`, {
          ...addressForm,
          userId: userId,
        });
    
        const updatedAddresses = await axiosInstance.get(`/User/Address/${userId}`);
        setAddresses(updatedAddresses.data);

      setShowAddressForm(false);
      setEditingAddress(null);
      setAddressForm({
        address: '',
        city: '',
        state: '',
        pinCode: '',
        country: '',
        phone: '',
      });

      toast.success("Address updated successfully");
    } catch (error) {
      console.error("Failed to update address:", error);
      toast.error("Failed to update address");
    } finally {
      setIsSaving(false);
    }
  };


const handleDeleteAddress = async (addressId) => {
  const userId = getUserId(userDetails);
  if (!userId || !addressId) {
    toast.error('Required information missing');
    return;
  }

  try {
    await axiosInstance.put(`/address/${addressId}/status`);
    
    const updatedAddresses = await axiosInstance.get(`/User/Address/${userId}`);
    setAddresses(updatedAddresses.data);

    toast.success("Address deleted successfully");
  } catch (error) {
    console.error("Failed to delete address:", error);
    toast.error("Failed to delete address");
  } finally {
    setShowDeleteDialog(false);
    setAddressToDelete(null);
  }
};


  const handleAddNewAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      address: '',
      city: '',
      state: '',
      pinCode: '',
      country: '',
      phone: '',
    });
    setShowAddressForm(true);
  };


  // Handle password form changes
const handlePasswordChange = (e) => {
  const { name, value } = e.target;
  setPasswordForm(prev => ({
    ...prev,
    [name]: value
  }));
};

// Reset password form fields
const resetPasswordForm = () => {
  setPasswordForm({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  setShowPasswordForm(false); // Optionally close the form
};


const handleCancelPasswordChange = () => {
  resetPasswordForm();
};

const handleChangePassword = async () => {
  if (!validatePassword()) {
    toast.error('Please fix the errors in the form');
    return;
  }

  try {
    setIsPasswordChanging(true);
    const response = await axiosInstance.put('/User/Password', {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    });

    if (response.status === 200) {
      toast.success("Password changed successfully");
      resetPasswordForm();
      // Clear password errors after successful change
      setErrors(prev => ({ ...prev, password: {} }));
    } else {
      toast.error(response.data.message || "Failed to change password");
    }
  } catch (error) {
    console.error("Failed to change password:", error);
    toast.error(error.response?.data?.message || "Failed to change password");
  } finally {
    setIsPasswordChanging(false);
  }
};


// In AccountPage.jsx, add this function
const updateOrderStatus = (orderId, newStatus) => {
  setOrderDetails(prevOrders => 
    prevOrders.map(order => 
      order._id === orderId 
        ? { ...order, orderStatus: newStatus }
        : order
    )
  );
};

const handleTopUp = async () => {
  try {
    const userId = getUserId(userDetails);
    const response = await axiosInstance.post(`/wallet/topup/${userId}`, {
      amount: parseFloat(topUpAmount)
    });
    setWalletBalance(response.data.newBalance);
    setTransactions(prevTransactions => [response.data.transaction, ...prevTransactions]);
    setTopUpAmount('');
    toast.success('Wallet topped up successfully');
  } catch (error) {
    console.error('Failed to top up wallet:', error);
    toast.error('Failed to top up wallet');
  }
};


const totalPages = Math.ceil(orderDetails.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = orderDetails.slice(startIndex, endIndex);



  const totalTransactionPages = Math.ceil((walletDetails?.transactions?.length || 0) / transactionsPerPage);
  const startTransactionIndex = (currentTransactionPage - 1) * transactionsPerPage;
  const endTransactionIndex = startTransactionIndex + transactionsPerPage;
  const currentTransactions = walletDetails?.transactions?.slice(startTransactionIndex, endTransactionIndex) || [];
  


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Account</h1>
        
        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="Address">Address</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="Wallet">Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your account details here.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-4">
                  <div className="grid gap-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                        className={`bg-gray-700 ${errors.profile.firstName ? 'border-red-500' : ''}`}
                      />
                      {errors.profile.firstName && (
                        <p className="text-red-500 text-sm mt-1">{errors.profile.firstName}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleProfileChange}
                        className={`bg-gray-700 ${errors.profile.lastName ? 'border-red-500' : ''}`}
                      />
                      {errors.profile.lastName && (
                        <p className="text-red-500 text-sm mt-1">{errors.profile.lastName}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        name="email"
                        type="email" 
                        value={profileData.email}
                        readOnly
                        className="bg-gray-700 cursor-not-allowed"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input 
                        id="phone" 
                        name="phone"
                        type="tel" 
                        value={profileData.phone}
                        onChange={handleProfileChange}
                        className={`bg-gray-700 ${errors.profile.phone ? 'border-red-500' : ''}`}
                      />
                      {errors.profile.phone && (
                        <p className="text-red-500 text-sm mt-1">{errors.profile.phone}</p>
                      )}
                    </div>
                  </div>
                  <CardFooter className="flex justify-between items-center gap-4 px-0">
                    <Button 
                      type="button" 
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                    type="button"
                    onClick={() => setShowPasswordForm(true)}  
                  >
                    Change Password
                  </Button>
                    
                  </CardFooter>
                  {showPasswordForm && (
                    <div className="space-y-4 p-4 bg-gray-700 rounded-lg mt-4">
                      <div className="grid gap-2">
                      <Label>Old Password</Label>
                       <Input 
                         name="oldPassword" 
                         type="password"
                         value={passwordForm.oldPassword} 
                         onChange={handlePasswordChange} 
                         className={`bg-gray-600 ${errors.password.oldPassword ? 'border-red-500' : ''}`}
                       />
                       {errors.password.oldPassword && (
                         <p className="text-red-500 text-sm mt-1">{errors.password.oldPassword}</p>
                       )}
                      </div>
                      <div className="grid gap-2">
                        <Label>New Password</Label>
                        <Input 
                          name="newPassword" 
                          type="password"
                          value={passwordForm.newPassword} 
                          onChange={handlePasswordChange} 
                          className={`bg-gray-600 ${errors.password.newPassword ? 'border-red-500' : ''}`}
                        />
                        {errors.password.newPassword && (
                         <p className="text-red-500 text-sm mt-1">{errors.password.newPassword}</p>
                       )}
                      </div>
                      <div className="grid gap-2">
                        <Label>Confirm New Password</Label>
                        <Input 
                          name="confirmPassword" 
                          type="password"
                          value={passwordForm.confirmPassword} 
                          onChange={handlePasswordChange} 
                          className={`bg-gray-600 ${errors.password.confirmPassword ? 'border-red-500' : ''}`}
                        />
                        {errors.password.confirmPassword && (
                         <p className="text-red-500 text-sm mt-1">{errors.password.confirmPassword}</p>
                       )}
                      </div>
                      <div className="flex gap-4">
                        <Button
                          onClick={handleChangePassword}
                          disabled={isPasswordChanging}
                        >
                          {isPasswordChanging ? 'Changing...' : 'Change Password'}
                        </Button>
                        <Button
                    variant="outline"
                    onClick={() => {
                      setShowPasswordForm(false);
                      handleCancelPasswordChange();
                    }}
                    className="text-black hover:bg-gray-300"
                  >
                    Cancel
                  </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="Address">
            <Card className="bg-gray-800 border-gray-700 text-white ">
              <CardHeader>
                <CardTitle className='flex justify-center'>Address</CardTitle>
                {/* <CardDescription></CardDescription> */}
              </CardHeader>
              <CardContent>
                  {/* Existing Addresses */}
                  <div>
                  {Array.isArray(addresses?.address) && addresses.address.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Saved Addresses</h3>

                    <div className="space-y-4">
                      {addresses.address.map((address, index) => (
                        <div key={index} className="p-4 bg-gray-700 rounded-lg flex justify-between items-start">
                          <div>
                            <p>{address.address}</p>
                            <p>{`${address.city}, ${address.state} ${address.pinCode}`}</p>
                            <p>{address.country}</p>
                            <p>{address.phone}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditAddress(address)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                handleDeleteAddress(address._id);
                                setAddressToDelete(address);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>
                  <CardFooter className="flex justify-between items-center gap-4 px-0 mt-4">
                   <Button 
                     type="button"
                     onClick={handleAddNewAddress}
                     disabled={isSaving}
                   >
                     Add Address
                   </Button>
                 </CardFooter>




                    {showAddressForm && (
                    <div className="space-y-4 p-4 bg-gray-700 rounded-lg mt-4">
                      <div className="grid gap-2">
                      <Label>Address</Label>
                         <Input 
                           name="address" 
                           value={addressForm.address} 
                           onChange={handleAddressChange} 
                           className={`bg-gray-600 ${errors.address.address ? 'border-red-500' : ''}`}
                         />
                         {errors.address.address && (
                           <p className="text-red-500 text-sm mt-1">{errors.address.address}</p>
                         )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>City</Label>
                          <Input 
                            name="city" 
                            value={addressForm.city} 
                            onChange={handleAddressChange} 
                            className={`bg-gray-600 ${errors.address.city ? 'border-red-500' : ''}`}
                          />
                           {errors.address.city && (
                           <p className="text-red-500 text-sm mt-1">{errors.address.city}</p>
                         )}
                        </div>
                        <div className="grid gap-2">
                          <Label>State</Label>
                          <Input 
                            name="state" 
                            value={addressForm.state} 
                            onChange={handleAddressChange} 
                            className={`bg-gray-600 ${errors.address.state ? 'border-red-500' : ''}`}
                          />
                          {errors.address.state && (
                           <p className="text-red-500 text-sm mt-1">{errors.address.state}</p>
                         )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Pin Code</Label>
                          <Input 
                            name="pinCode" 
                            value={addressForm.pinCode} 
                            onChange={handleAddressChange} 
                            className={`bg-gray-600 ${errors.address.pinCode ? 'border-red-500' : ''}`}
                          />
                          {errors.address.pinCode && (
                           <p className="text-red-500 text-sm mt-1">{errors.address.pinCode}</p>
                         )}
                        </div>
                        <div className="grid gap-2">
                          <Label>Country</Label>
                          <Input 
                            name="country" 
                            value={addressForm.country} 
                            onChange={handleAddressChange} 
                            className={`bg-gray-600 ${errors.address.country ? 'border-red-500' : ''}`}
                          />
                          {errors.address.country && (
                           <p className="text-red-500 text-sm mt-1">{errors.address.country}</p>
                         )}
                        </div>
                        <div className="grid gap-2">
                          <Label>Phone Number</Label>
                          <Input 
                            name="phone" 
                            value={addressForm.phone} 
                            onChange={handleAddressChange} 
                            className={`bg-gray-600 ${errors.address.phone ? 'border-red-500' : ''}`}
                          />
                          {errors.address.phone && (
                           <p className="text-red-500 text-sm mt-1">{errors.address.phone}</p>
                         )}
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Button
                          onClick={editingAddress ? handleUpdateAddress : handleSaveAddress}
                          disabled={isSaving}
                        >
                          {isSaving ? 'Saving...' : editingAddress ? 'Update Address' : 'Save Address'}
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          onClick={handleCancelAddress}
                          disabled={isSaving}
                          className='text-black hover:bg-gray-300'
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                </CardContent>
            </Card>
          </TabsContent>
  



          <TabsContent value="orders">
  <Card className="bg-gray-800 border-gray-700 text-white">
    <CardHeader>
      <CardTitle>Order History</CardTitle>
      <CardDescription>View your past orders and their status.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {currentOrders.length === 0 ? (
          <p className="text-center text-gray-400">No orders found.</p>
        ) : (
          currentOrders.map((order) => (
            <div
              key={order._id}
              className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-gray-700 rounded-lg"
            >
              {/* Left Section - Order Details */}
              <div className="flex items-center space-x-4">
                <Package className="w-6 h-6 text-gray-300" />
                <div>
                  <p className="font-semibold text-lg text-white">Order #{order._id.slice(-6)}</p>
                  <p className="text-sm text-gray-400">
                    Placed on: {new Date(order.orderDate).toLocaleDateString()}
                  </p>
                  {order.products.map((product) => (
                    <div key={product._id} className="space-y-1">
                      <p className="font-medium text-gray-200">Product: {product.name}</p>
                      <p className="font-medium text-gray-300">Quantity: {product.quantity || 1}</p>
                      <p className="font-medium text-green-400">
                        Final Price: ₹{product.price * (product.quantity || 1)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Section - Status & Button */}
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.orderStatus === "Processing"
                      ? "bg-yellow-400 text-yellow-900"
                      : order.orderStatus === "Shipped"
                      ? "bg-blue-500 text-blue-900"
                      : order.orderStatus === "Delivered"
                      ? "bg-green-500 text-green-900"
                      : order.orderStatus === "Cancelled"
                      ? "bg-red-500 text-red-900"
                      : "bg-gray-300 text-gray-900"
                  }`}
                >
                  {order.orderStatus}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsOrderDetailsOpen(true);
                  }}
                  className="text-black border-gray-500 hover:bg-gray-600 hover:text-white"
                >
                  View Details
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-2">
          

          {Array.from({ length: totalPages }, (_, index) => (
            <Button
              key={index + 1}
              variant={currentPage === index + 1 ? "default"  : "outline"}
              onClick={() => setCurrentPage(index + 1)}
              className="px-3 py-1 text-gray-600"
            >
              {index + 1}
            </Button>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>


<TabsContent value="Wallet">
            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wallet className="mr-2" />
                  My Wallet
                </CardTitle>
                <CardDescription>Manage your wallet balance and view transactions.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-xl font-semibold mb-2">Current Balance</h3>
                    <p className="text-3xl font-bold text-green-400">₹{walletDetails.balance.toFixed(2)}</p>
                  </div>
                  {/* <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Top Up Wallet</h3>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        className="bg-gray-700"
                      />
                      <Button onClick={handleTopUp}>Top Up</Button>
                    </div>
                  </div> */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Recent Transactions</h3>
                    <div className="space-y-2">
                      {currentTransactions.map((transaction) => (
                        <div key={transaction._id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                          <div className="flex items-center">
                            {transaction.type === 'refund' ? (
                              <ArrowUpRight className="text-green-400 mr-2" />
                            ) : (
                              <ArrowDownLeft className="text-red-400 mr-2" />
                            )}
                            <div>
                              <p className="font-medium">{transaction.description || transaction.type}</p>
                              <p className="text-sm text-gray-400">{new Date(transaction.date).toLocaleString()}</p>
                            </div>
                          </div>
                          <p className={`font-bold ${transaction.type === 'refund' ? 'text-green-400' : 'text-red-400'}`}>
                            {transaction.type === 'refund' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                     {/* Wallet Transactions Pagination */}
{walletDetails?.transactions?.length > 0 && totalTransactionPages > 1 && (
  <div className="flex justify-center items-center mt-6 space-x-2">
    {Array.from({ length: totalTransactionPages }, (_, index) => (
      <Button
        key={index + 1}
        variant={currentTransactionPage === index + 1 ? "default" : "outline"}
        onClick={() => setCurrentTransactionPage(index + 1)}
        className="px-3 py-1 text-gray-600"
      >
        {index + 1}
      </Button>
    ))}
  </div>
)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
      <OrderDetailsBox
  order={selectedOrder}
  open={isOrderDetailsOpen}
  onOpenChange={setIsOrderDetailsOpen}
  onStatusUpdate={updateOrderStatus}
/>
    </div>
  )
}

