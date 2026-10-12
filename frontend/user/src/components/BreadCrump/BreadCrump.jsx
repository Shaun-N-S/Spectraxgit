import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

function Breadcrumbs({ productTitle }) {
  const location = useLocation(); // Access the current location object

  // Split the path into segments and filter out empty ones
  const pathSegments = location.pathname
    .split("/")
    .filter((segment) => segment !== "" && segment.toLowerCase() !== "home");

  // Do not render breadcrumbs if there are no segments (i.e., on the root path '/')
  if (pathSegments.length === 0) {
    return null;
  }

  
  let pathName = "";

  
  const crumbs = pathSegments.map((crumb, index) => {
    
    pathName += `/${crumb}`;

    // If the last segment is an ID (assuming it's a numeric ID or unique identifier), show the product title instead
    if (index === pathSegments.length - 1 && /\d/.test(crumb)) {
      crumb = productTitle; 
    }

    return (
      <motion.span
        key={index}
        className="breadcrumb-item"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <Link
          to={pathName}
          className="text-white hover:text-purple-600 transition-all duration-300 capitalize font-medium"
        >
          {crumb ? crumb.replace(/-/g, " ") : ""} {/* Safely replace hyphens */}
        </Link>
        {index < pathSegments.length - 1 && (
          <motion.span
            className="mx-2 text-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.1 + 0.1 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 inline-block"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </motion.span>
        )}
      </motion.span>
    );
  });

  // Render breadcrumbs including a "Home" link
  return (
    <motion.div
      className="breadcrumbs-container py-3 px-4 bg-gray-800 backdrop-blur-sm shadow-sm border-b"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        <motion.div className="flex items-center flex-wrap gap-1">
          {/* Home Link */}
          <motion.span
            className="breadcrumb-item"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link
              to="/"
              className="text-white hover:text-purple-600 transition-all duration-300 font-medium"
            >
              Home
            </Link>
            {crumbs.length > 0 && (
              <motion.span
                className="mx-2 text-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 inline-block"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </motion.span>
            )}
          </motion.span>
          
          {/* Dynamic Breadcrumbs */}
          {crumbs}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// Rendered without props from App.jsx, so productTitle is optional
Breadcrumbs.propTypes = {
  productTitle: PropTypes.string,
};

export default Breadcrumbs;
