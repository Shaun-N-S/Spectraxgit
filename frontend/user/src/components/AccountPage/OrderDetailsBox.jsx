import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Package, Truck, CreditCard, Calendar, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axiosInstance from '@/axios/userAxios';
import { toast } from 'react-hot-toast';
import { ShoppingBag } from 'lucide-react';
import { downloadInvoice } from '../CheckoutPage/InvoiceDownload';


const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';


const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};


const ReturnDialog = ({ isOpen, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(reason, description);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>Return Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Return Reason</label>
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded-md"
              required
            >
              <option value="">Select a reason</option>
              <option value="Wrong Item">Wrong Item</option>
              <option value="Defective Product">Defective Product</option>
              <option value="Size/Fit Issue">Size/Fit Issue</option>
              <option value="Not as Described">Not as Described</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded-md"
              rows="3"
              required
              placeholder="Please provide more details about your return reason..."
            />
          </div>
          <div className="flex justify-end gap-3">
            {/* <Button variant="outline" onClick={onClose}>
              Cancel
            </Button> */}
            <Button type="submit">
              Submit Return
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};


const OrderDetailsBox = ({ order, open, onOpenChange, onStatusUpdate }) => {
  if (!order) return null;
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);





  console.log("Order details from the orderDetails box.....",order)


  
  const handleCancelOrder = async () => {
    if (order.orderStatus === 'Shipped' || order.orderStatus === 'Delivered') {
      toast.error('Orders that are shipped or delivered cannot be cancelled');
      return;
    }
  
    try {
      const response = await axiosInstance.post(
        `/order/status/${order._id}`,
        { status: 'Cancelled' }
      );
  
      if (response.data.wallet) {
        const refundAmount = response.data.wallet.lastTransaction.amount;
        toast.success(`Order cancelled and ₹${refundAmount.toFixed(2)} refunded to wallet`);
      } else {
        toast.success('Order cancelled successfully');
      }
      onStatusUpdate(order._id, 'Cancelled');
      onOpenChange(false);
    } catch (error) {
      console.error("Error in cancelling order:", error);
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };
  

  const handleRetryPayment = async (order) => {
    if (order.orderStatus !== 'Payment Failed') {
      toast.error('Payment retry is only allowed for failed payments');
      return;
    }

    
  
    try {
      const res = await loadRazorpay();
      if (!res) {
        toast.error("Failed to load Razorpay SDK.");
        return;
      }
  
      // Create a new Razorpay order
      const retryResponse = await axiosInstance.post("/create-razorpay-order", {
        amount: order.finalAmount,
        currency: "INR",
      });
  
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: retryResponse.data.order.amount,
        currency: "INR",
        name: "SpectraX",
        description: "Retry Payment",
        order_id: retryResponse.data.order.id,
        handler: async (response) => {
          try {
            // Verify payment
            await axiosInstance.post("/verify-payment", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              orderId: order._id // Add original order ID
            });
  
            // ✅ Update order status to "Completed"
            await axiosInstance.post(`/order/status/${order._id}`, {
              status: "Processing"
            });
  
            toast.success("Payment successful, order updated to Completed.");
            onStatusUpdate(order._id, 'Completed');
            onOpenChange(false);
          } catch (error) {
            console.error("Error verifying payment:", error);
            toast.error(error.response?.data?.message || "Payment verification failed. Please try again.");
          }
        },
        prefill: {
          name: order.customerName,
          email: order.customerEmail,
        },
        theme: {
          color: "#0033A0",
        },
      };
  
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("Retry payment error:", error);
      toast.error(error.response?.data?.message || "Failed to process payment. Please try again.");
    }
  };
  

  
  const handleReturnOrder = async (reason, description) => {
    if (order.orderStatus !== 'Delivered') {
      toast.error('Only delivered orders can be returned');
      return;
    }

    try {
      const response = await axiosInstance.post(
        `/order/return/${order._id}`,
        { 
          status: 'Returned',
          returnReason: reason,
          returnDescription: description
        }
      );

      if (response.data.wallet) {
        const refundAmount = response.data.wallet.lastTransaction.amount;
        toast.success(`Return processed and ₹${refundAmount.toFixed(2)} refunded to wallet`);
      } else {
        toast.success('Return processed successfully');
      }
      onStatusUpdate(order._id, 'Returned');
      onOpenChange(false);
    } catch (error) {
      console.error("Error in returning order:", error);
      toast.error(error.response?.data?.message || 'Failed to process return');
    }
  };

  const handleReturnClick = () => {
    setIsReturnDialogOpen(true);
  };

  const handleInvoiceDownload = () => {
    if (order) {
      // Create a properly formatted order object for the invoice
      const formattedOrder = {
        _id: order._id,
        orderDate: order.orderDate,
        createdAt: order.createdAt,
        products: order.products.map(product => ({
          name: product.name,
          quantity: product.quantity,
          price: product.price,
          variant: product.variant
        })),
        shippingAddress: order.shippingAddress,
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount,
        coupon: order.coupon,
        deliveryCharge: 0 // Since it's not in your data, defaulting to 0
      };
      
      downloadInvoice(formattedOrder);
    }
  };

  // Helper function to safely display variant details
  const renderVariantValue = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      // If the value is an object with name or value property
      return value.name || value.value || JSON.stringify(value);
    }
    return String(value);
  };

  // Calculate the subtotal
  const subtotal = order.totalAmount || 0;
  
  // Calculate the discount amount if coupon exists
  const discountAmount = order.coupon?.discountAmount || 0;
  
  // Calculate   amount
  const finalAmount = order.finalAmount || order.totalAmount || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="relative">
          <DialogClose className="absolute right-4 top-4" />
          <DialogTitle className="text-2xl font-bold">
            <div className="flex items-center space-x-2">
              <Package className="w-6 h-6" />
              <span>Order Details</span>
            </div>
          </DialogTitle>
          <div className="flex items-center space-x-2 text-gray-400 mt-2">
            <Calendar className="w-4 h-4" />
            <span>Order placed on {new Date(order.orderDate).toLocaleDateString()}</span>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-6 overflow-y-auto flex-1 pr-2">
          {/* Products Section */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Products
            </h3>
            <div className="grid gap-4">
              {order.products.map((product, index) => (
                <div 
                  key={index}
                  className="bg-gray-600 p-4 rounded-lg flex justify-between items-center"
                >
                  <div className="flex-1">
                  <div>
                    <h4 className="font-medium text-white">{product.name || 'Product Name'}</h4>
                  </div>
                    <p className="text-sm text-gray-300 mt-1">
                      Quantity: {product.quantity || 1}
                    </p>
                    <p className="text-sm text-gray-300">
                      Price: ₹{product.price || 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coupon Section */}
          {order.coupon && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Applied Coupon
              </h3>
              <div className="space-y-2">
                <p className="text-gray-300">Coupon Code: {order.coupon.code}</p>
                <p className="text-gray-300">Discount Amount: ₹{order.coupon.discountAmount}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shipping Details */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Shipping Details
              </h3>
              <div className="space-y-2 text-gray-300">
                <p>{order.shippingAddress?.address}</p>
                <p>{order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
                <p>{order.shippingAddress?.pinCode}</p>
                <p>{order.shippingAddress?.country}</p>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Status</span>
                  <span className={`font-medium ${
                    order.orderStatus === 'Processing' ? 'text-yellow-500' :
                    order.orderStatus === 'Shipped' ? 'text-blue-500' :
                    order.orderStatus === 'Delivered' ? 'text-green-500' :
                    order.orderStatus === 'Cancelled' ? 'text-red-500' : 
                    'text-gray-500'
                  }`}>
                    {order.orderStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Payment Method</span>
                  <span className="font-medium">{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Subtotal</span>
                  <span className="font-medium">₹{subtotal}</span>
                </div>
                {order.coupon && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Discount</span>
                    <span className="font-medium text-green-500">
                      -₹{discountAmount}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                  <span className="text-gray-300">Final Amount</span>
                  <span className="font-medium text-lg">₹{finalAmount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 pt-6">
  {order.orderStatus !== "Cancelled" && order.orderStatus !== "Returned" && (
    <>
      {order.orderStatus === "Payment Failed" && (
        <Button
          variant="default"
          className="w-40"
          onClick={() => handleRetryPayment(order)}
        >
          Retry Payment
        </Button>
      )}
      {order.orderStatus !== "Shipped" && order.orderStatus !== "Delivered" && order.orderStatus !== "Payment Failed" && (
        <Button
          variant="destructive"
          className="w-40"
          onClick={handleCancelOrder}
        >
          Cancel Order
        </Button>
      )}
      {order.orderStatus === "Delivered" && (
        <Button
          variant="destructive"
          className="w-40"
          onClick={handleReturnClick}
        >
          Return Order
        </Button>
      )}
    </>
  )}
  <Button 
    variant="outline" 
    className="flex items-center text-black hover:bg-gray-400" 
    onClick={handleInvoiceDownload}
  >
    <ShoppingBag className="mr-2 h-4 w-4 text-black hover:bg-gray-400"/>
    Invoice Download
  </Button>
</div>

<ReturnDialog
  isOpen={isReturnDialogOpen}
  onClose={() => setIsReturnDialogOpen(false)}
  onSubmit={handleReturnOrder}
/>

      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsBox;