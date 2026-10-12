import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import {
  FaBars,
  FaTimes,
  FaHome,
  FaBox,
  FaShoppingCart,
  FaUsers,
  FaList,
  FaIndustry,
  FaSignOutAlt,
  FaTicketAlt,
  FaTags,
} from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button'; // Adjust the path if necessary
import { useDispatch } from 'react-redux';
import { logoutAdmin } from '../../redux/adminSlice';



 

const AdminSidebar = ({children}) => {
  const adminMenuItems = [
    { icon: FaHome, text: 'Dashboard', href: '/home' },
    { icon: FaBox, text: 'Products', href: '/products' },
    { icon: FaShoppingCart, text: 'Orders', href: '/orders' },
    { icon: FaUsers, text: 'Customers', href: '/customerlist' },
    { icon: FaList, text: 'Categories', href: '/categories' },
    { icon: FaIndustry, text: 'Brands', href: '/brands' },
    {icon: FaTicketAlt, text:'Coupon', href: '/coupons'},
    {icon: FaTags, text:'Offer', href:'/offers'}
  ];


  


  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logoutAdmin());
  };

  // Below the lg breakpoint the sidebar is an off-canvas drawer; from lg up
  // it is always visible and the content is offset by its width.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isSidebarOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsSidebarOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="relative bg-black text-white p-4 lg:p-6 text-center">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-md p-2 text-white hover:bg-white/10 lg:hidden"
          aria-label="Open navigation menu"
          aria-expanded={isSidebarOpen}
          aria-controls="admin-sidebar"
        >
          <FaBars className="h-5 w-5" />
        </button>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wider"
        >
          SPECTRAX
        </motion.h1>

      </header>

      {/* Backdrop for the mobile drawer */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        className={`fixed left-0 top-0 z-50 h-screen w-[280px] max-w-[85vw] overflow-y-auto bg-black text-white p-6 transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="absolute right-4 top-6 rounded-md p-2 text-gray-300 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close navigation menu"
        >
          <FaTimes className="h-5 w-5" />
        </button>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          {/* Logo can be placed here if you have one */}
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </motion.div>

        {/* Navigation Menu */}
        <nav className="flex flex-col justify-between h-[85%]">
          <motion.ul
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            className="space-y-4"
          >
            {adminMenuItems.map((item, index) => (
              <motion.li
                key={index}
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0 },
                }}
              >
                <Link
                  to={item.href}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-white/10 text-gray-300 hover:text-white"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-lg">{item.text}</span>
                </Link>
              </motion.li>
            ))}
          </motion.ul>

          {/* Logout Button */}
          <div className="mt-auto">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full flex items-center justify-center space-x-2 py-3 text-red-500 border-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 mt-2"
            >
              <FaSignOutAlt className="w-5 h-5 mt-1" />
              <span onClick={handleLogout}>LOGOUT</span>
            </Button>
          </div>
        </nav>
      </aside>
      <div className="min-w-0 lg:ml-[280px]">{children}</div>
    </div>
  );
};

AdminSidebar.propTypes = {
  children: PropTypes.node,
};

export default AdminSidebar;
