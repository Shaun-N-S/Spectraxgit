import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import axiosInstance from '@/axios/adminAxios';
import OrderDetailsSheet from './OrderDetailsSheet';
import {
  formatCurrency,
  formatDate,
  getCustomer,
  itemCount,
  orderStatusClass,
  payableAmount,
  paymentStatusClass,
} from './orderFormat';

const ORDERS_PER_PAGE = 10;

function OrderManagement() {
    const [orders, setOrders] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const [isFetching, setIsFetching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const orderStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];

    // Server-side pagination: the API returns one page plus total/totalPages.
    const fetchOrders = useCallback(async (page) => {
      try {
        setIsFetching(true);
        const response = await axiosInstance.get('/orders', {
          params: { page, limit: ORDERS_PER_PAGE },
        });
        if (response.data && response.data.orders) {
          setOrders(response.data.orders);
          setTotalPages(Math.max(response.data.totalPages || 1, 1));
          setTotalOrders(response.data.total || 0);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to fetch orders');
      } finally {
        setIsFetching(false);
      }
    }, []);

    useEffect(() => {
      fetchOrders(currentPage);
    }, [currentPage, fetchOrders]);

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
              // The status endpoint returns userId unpopulated; keep the
              // populated customer already shown in the table.
              setOrders(prevOrders =>
                  prevOrders.map(order =>
                      order._id === orderId
                        ? { ...order, ...response.data.updateOrder, userId: order.userId }
                        : order
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

    // Keep the open details sheet in sync with status changes made in the table.
    const detailsOrder = selectedOrder
      ? orders.find((order) => order._id === selectedOrder._id) || selectedOrder
      : null;

    // Shared by the desktop table and the mobile cards so the permitted
    // status transitions are defined in exactly one place.
    const renderStatusSelect = (order, triggerClassName) => (
      <Select
        onValueChange={(value) => handleStatusChange(order._id, value, order.orderStatus)}
        value={order.orderStatus}
        disabled={isLoading}
      >
        <SelectTrigger className={triggerClassName}>
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
    );

    const renderViewButton = (order, customer, labelClassName) => (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setSelectedOrder(order)}
        aria-label={`View order details for ${customer.name}`}
      >
        <Eye className="h-4 w-4" />
        <span className={labelClassName}>View</span>
      </Button>
    );

    return (
      <div className="min-w-0 p-4 sm:p-6 lg:p-10">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Order Management</h1>
          <span className="text-sm text-gray-500">
            {totalOrders} {totalOrders === 1 ? 'order' : 'orders'}
          </span>
        </div>

        {/* Cards until the full table (~1000px) fits beside the sidebar */}
        <div className="grid gap-3 md:grid-cols-2 min-[1360px]:hidden">
          {!isFetching && orders.length === 0 && (
            <p className="py-10 text-center text-gray-500 md:col-span-2">No orders found.</p>
          )}
          {orders.map((order) => {
            const customer = getCustomer(order);
            const payable = payableAmount(order);
            const hasDiscount = order.totalAmount > payable;

            return (
              <div
                key={order._id}
                className={`rounded-lg border bg-white p-4 shadow-sm ${isFetching ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`truncate font-medium ${customer.exists ? '' : 'italic text-gray-500'}`} title={customer.name}>
                      {customer.name}
                    </p>
                    {customer.email && (
                      <p className="truncate text-xs text-gray-500" title={customer.email}>{customer.email}</p>
                    )}
                  </div>
                  <span className={`shrink-0 px-2 py-1 rounded-full text-xs ${orderStatusClass(order.orderStatus)}`}>
                    {order.orderStatus}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-gray-500">Date</dt>
                    <dd>{formatDate(order.orderDate || order.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Items</dt>
                    <dd>{itemCount(order)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Amount</dt>
                    <dd className="font-medium">
                      {formatCurrency(payable)}
                      {hasDiscount && (
                        <span className="ml-1 text-xs font-normal text-gray-400 line-through">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-gray-500">Payment</dt>
                    <dd className="break-words">{order.paymentMethod}</dd>
                    <dd>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${paymentStatusClass(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-center gap-2">
                  {renderStatusSelect(order, 'flex-1 min-w-0')}
                  {renderViewButton(order, customer)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Wide screens: table */}
        <div className="hidden min-[1360px]:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isFetching && orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
            {orders.map((order) => {
              const customer = getCustomer(order);
              const payable = payableAmount(order);
              const hasDiscount = order.totalAmount > payable;

              return (
                <TableRow key={order._id} className={isFetching ? 'opacity-60' : undefined}>
                  <TableCell className="min-w-[160px] max-w-[240px]">
                    <p className={`truncate font-medium ${customer.exists ? '' : 'italic text-gray-500'}`} title={customer.name}>
                      {customer.name}
                    </p>
                    {customer.email && (
                      <p className="truncate text-xs text-gray-500" title={customer.email}>{customer.email}</p>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(order.orderDate || order.createdAt)}</TableCell>
                  <TableCell className="text-right">{itemCount(order)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <span className="font-medium">{formatCurrency(payable)}</span>
                    {hasDiscount && (
                      <p className="text-xs text-gray-400 line-through">{formatCurrency(order.totalAmount)}</p>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <p className="text-sm">{order.paymentMethod}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${paymentStatusClass(order.paymentStatus)}`}>
                      {order.paymentStatus}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${orderStatusClass(order.orderStatus)}`}>
                      {order.orderStatus}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {renderStatusSelect(order, 'w-[140px]')}
                      {renderViewButton(order, customer, 'hidden 2xl:inline')}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              disabled={currentPage === 1 || isFetching}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              disabled={currentPage === totalPages || isFetching}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <OrderDetailsSheet
          order={detailsOrder}
          onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}
        />
      </div>
    );
}

export default OrderManagement;
