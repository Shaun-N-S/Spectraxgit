import { useEffect, useState } from 'react'
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom'
import { CheckCircle, Truck, ShoppingBag, ArrowRight, AlertCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import axiosInstance from '@/axios/userAxios'
import { downloadInvoice } from './InvoiceDownload';

export default function OrderSuccessful() {
  const { orderId } = useParams()
  const location = useLocation()
  const [orderDetails, setOrderDetails] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    const id = orderId || location.state?.orderId
    if (id) {
      fetchOrderDetails(id)
    } else {
      setError('No order ID provided')
      setIsLoading(false)
    }
  }, [orderId, location.state?.orderId])

  const fetchOrderDetails = async (id) => {
    try {
      setIsLoading(true)
      const response = await axiosInstance.get(`/fetch/order-details/${id}`)
      if (!response.data || !response.data.orderDetails) {
        throw new Error('Failed to fetch order details')
      }
      setOrderDetails(response.data.orderDetails)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setIsLoading(false)
    }
  }

  console.log("order successfull response ......",orderDetails)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-3xl mx-auto bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <CardTitle className="text-3xl font-bold text-center">Error</CardTitle>
            <CardDescription className="text-center text-lg">
              {error}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link to="/" className="w-full">
              <Button className="w-full">
                Return to Home
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-3xl mx-auto bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Order Not Found</CardTitle>
            <CardDescription className="text-center text-lg">
              We couldn&apos;t find the order details you&apos;re looking for.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link to="/" className="w-full">
              <Button className="w-full">
                Return to Home
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }



  const handleOrderHistory = () =>{
    navigate('/Account')
  }

  const handleInvoiceDownload = () => {
    if (orderDetails) {
      downloadInvoice(orderDetails);
    }
  };



  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-3xl font-bold text-center">Order Successful!</CardTitle>
            <CardDescription className="text-center text-lg">
              Thank you for your purchase. Your order has been received and is being processed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Order Details</h3>
              <p><strong>Order ID:</strong> {orderDetails._id || orderDetails.orderId}</p>
              <p><strong>Applied coupon :</strong>{orderDetails.coupon?.code || 'Nill'}</p>
              <p><strong>Total Amount:</strong> ₹{orderDetails.totalAmount?.toFixed(2)}</p>
              <p><strong>Paid Amount : </strong>₹{orderDetails.finalAmount?.toFixed(2)}</p>
              <p><strong>Order Date:</strong> {new Date(orderDetails.createdAt || orderDetails.orderDate).toLocaleString()}</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Items Ordered</h3>
              <ul className="list-disc list-inside">
                {orderDetails.products?.map((item, index) => (
                  <li key={index} className="mb-2">
                    {item.name} - Quantity: {item.quantity} - Price: ₹{item.price?.toFixed(2)}
                    {item.variant && (
                      <div className="ml-4 text-sm text-gray-400">
                        Variant: {item.variant.name || item.variant.attributes?.map(attr => `${attr.value}`).join(', ')}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Shipping Information</h3>
              <p>{orderDetails.shippingAddress?.address}</p>
              <p>{orderDetails.shippingAddress?.city}, {orderDetails.shippingAddress?.state} {orderDetails.shippingAddress?.pinCode}</p>
              <p>{orderDetails.shippingAddress?.country}</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="flex items-center justify-center space-x-4 w-full">
              <Button variant="outline" className="flex items-center  text-black hover:bg-gray-400" onClick={handleOrderHistory} >
                <Truck className="mr-2 h-4 w-4  text-black hover:bg-gray-400" />
                Track Order
              </Button>
              <Button variant="outline" className="flex items-center  text-black hover:bg-gray-400" onClick={handleInvoiceDownload}>
                <ShoppingBag className="mr-2 h-4 w-4 text-black hover:bg-gray-400" />
                Invoice Download
              </Button>
            </div>
            <Link to="/" className="w-full">
              <Button className="w-full">
                Continue Shopping
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}