import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../axios/userAxios'; // Ensure your axios instance is correctly imported
import { Button } from '@/components/ui/button'; // Ensure Button component is imported correctly

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // Fetch products from the backend
  useEffect(() => {
    axiosInstance.get('/showproductsisActive')
      .then(response => {
        console.log('API Response:', response.data);
        setProducts(response.data.products);
        setLoading(false);
      })
      .catch(err => {
        console.error('API Error:', err);
        setError('Error fetching products');
        setLoading(false);
      });
  }, []);

  const features = [
    { title: "Premium Quality", description: "High-end peripherals and accessories from top gaming brands" },
    { title: "Fast Delivery", description: "Express shipping for your gaming gear worldwide" },
    { title: "24/7 Support", description: "Expert technical assistance for all your accessories" },
    { title: "Secure Payment", description: "Safe transactions for your gaming equipment purchases" }
  ];

  const handleProductDetails=(id)=>{
    navigate(`/product_details/${id}`);
  }
 

  return (
    <div className="bg-black text-white min-h-screen">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="h-screen flex items-end justify-center relative overflow-hidden text-white pb-40"
      >
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/video1.webm" // Replace with your video file path
          autoPlay
          loop
          muted
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
        <div className="container mx-auto px-4 z-10 text-center">
          <motion.h1
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-5xl md:text-7xl mb-8  font-bold"
            style={{ color: 'white' }}
          >
            Level Up Your Gaming Gear
          </motion.h1>
          <Link to="/shop">
            <Button
              style={{ backgroundColor: '#3AB223' }}
              className="hover:bg-green-800 px-8 py-3 text-lg font-semibold text-white"
            >
              Shop Now
            </Button>
          </Link>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16" style={{ color: '#44D62C' }}>
            Why Choose Us
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
                whileHover={{ scale: 1.05 }}
                className="p-6 bg-gray-800 text-white rounded-lg text-center"
              >
                <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      
      {/* Featured Products */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-8" style={{ color: '#44D62C' }}>
          Featured Products
        </h2>
      
        {loading && <p className="text-center">Loading products...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
      
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {products.map((product, index) => (
            <div
              key={index}
              className="bg-gray-800 p-4 rounded-lg shadow-lg hover:shadow-green-500 transition-shadow"
            >
              <div className="h-48 bg-gray-700 rounded-lg mb-4 overflow-hidden">
                {product.productImage.length > 0 ? (
                  <img
                    src={product.productImage[0]}
                    alt={product.title}
                    className="h-full w-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
              </div>
              <h3 className="text-xl font-semibold text-center">{product.title}</h3>
              <Link to={`/product_details/${product._id}`}>
                      <Button
                        style={{ backgroundColor: '#44D62C' }}
                        className="hover:bg-green-600 w-full py-2 text-black font-semibold"
                        onClick={()=>handleProductDetails(product._id)}
                      >
                        View Details
                      </Button>
                    </Link>
            </div>
            
          ))}
        </div>
      </section>


      {/* Call to Action */}
      <section className="py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Ready to Dominate the Game?
        </h2>
        <Link to="/shop">
          <Button
            style={{ backgroundColor: '#44D62C' }}
            className="hover:bg-green-600 px-8 py-4 text-lg"
          >
            Explore Best Sellers
          </Button>
        </Link>
      </section>
    </div>
  );
};

export default HomePage;
