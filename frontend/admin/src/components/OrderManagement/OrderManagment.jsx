import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from 'react-hot-toast';
import axiosInstance from '@/axios/adminAxios';

function OrderManagement() {
    const [orders, setOrders] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const ordersPerPage = 10;
  
    const orderStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
  
    useEffect(() => {
      fetchOrders();
    }, []);
  
    const fetchOrders = async () => {
      try {
        const response = await axiosInstance.get('/orders');
        if (response.data && response.data.orders) {
          setOrders(response.data.orders);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to fetch orders');
      }
    };
  
    const handleStatusChange = async (orderId, newStatus, currentStatus) => {
      if (newStatus === currentStatus) return;
  
      if (['Delivered', 'Cancelled', 'Payment Failed', 'Returned'].includes(currentStatus)) {
          toast.error(`Cannot change status of ${currentStatus} orders`);
          return;
      }
  
      try {
          setIsLoading(true);
  
          // Optimistically update the UI
          setOrders(prevOrders =>
              prevOrders.map(order =>
                  order._id === orderId ? { ...order, orderStatus: newStatus } : order
              )
          );
  
          const response = await axiosInstance.post(`/order/status/${orderId}`, {
              status: newStatus
          });

          if (response.data && response.data.updateOrder) {
              setOrders(prevOrders =>
                  prevOrders.map(order =>
                      order._id === orderId ? { ...order, ...response.data.updateOrder } : order
                  )
              );
              toast.success(`Order status updated to ${newStatus}`);
          }
      } catch (error) {
          console.error('Error updating order status:', error);
  
          // Revert to previous state on error
          setOrders(prevOrders =>
              prevOrders.map(order =>
                  order._id === orderId ? { ...order, orderStatus: currentStatus } : order
              )
          );
  
          const errorMessage = error.response?.data?.message || 'Failed to update order status';
          toast.error(errorMessage);
      } finally {
          setIsLoading(false);
      }
  };
  

    // Format date to local string
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    // Pagination logic
    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
    const totalPages = Math.ceil(orders.length / ordersPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
      <div className="ml-[280px] p-10">
        <h1 className="text-3xl font-bold mb-6">Order Management</h1>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Shipping Address</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentOrders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell className="font-medium">{order._id}</TableCell>
                  <TableCell>{formatDate(order.orderDate)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{order.shippingAddress.address}</p>
                      <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                      <p>{order.shippingAddress.country} - {order.shippingAddress.pinCode}</p>
                    </div>
                  </TableCell>
                  <TableCell>₹{order.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>{order.paymentMethod}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        order.orderStatus === 'Delivered' ? 'bg-green-200 text-green-800' : 
                        order.orderStatus === 'Processing' ? 'bg-yellow-200 text-yellow-800' : 
                        order.orderStatus === 'Shipped' ? 'bg-blue-200 text-blue-800' :
                        'bg-red-200 text-red-800'
                      }`}
                    >
                      {order.orderStatus}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select
                      onValueChange={(value) => handleStatusChange(order._id, value, order.orderStatus)}
                      value={order.orderStatus}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Change Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {orderStatuses.map((status) => (
                          <SelectItem 
                            key={status} 
                            value={status}
                            disabled={
                              (order.orderStatus === 'Shipped' && (status === 'Processing' || status === 'Cancelled')) ||
                              status === order.orderStatus
                            }
                          >
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => paginate(index + 1)}
              disabled={index + 1 === currentPage}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </div>
    );
}

export default OrderManagement;