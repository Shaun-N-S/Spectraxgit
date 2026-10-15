import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axiosInstance from "@/axios/userAxios";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";
import { logoutUser } from "@/redux/userSlice";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const location = useLocation();
  const dispatch = useDispatch();
  const userDetails = useSelector((state) => state.user);
  console.log("user Details  : ", userDetails);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/shop?search=${searchQuery}`);
  };

  const handleUserAction = (path) => {
    if (userDetails !== null) {
      navigate(path);
    } else {
      navigate("/login");
    }
  };

  const handleCart = () => {
    navigate("/cart");
  };

  const handleWishlist = () => {
    navigate("/wishlist");
  };

  const handleLogout = () => {
    console.log("Logging out user...");
    axiosInstance
      .post("/logout")
      .then(() => {
        // Clear frontend user state
        dispatch(logoutUser());

        console.log("User logged out successfully");
        toast.success("Logged out successfully");

        // Navigate to login page
        navigate("/login");
        console.log("Navigated to login page");
      })
      .catch((error) => {
        console.error("Logout error:", error.response?.data || error.message);
      });
  };

  const toggleDropdown = () => {
    setIsUserDropdownOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close the mobile menu after navigating (link click or search submit).
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  return (
    <header className="bg-black text-white relative z-10">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white md:hidden"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
              <span className="sr-only">
                {isMobileMenuOpen ? "Close menu" : "Open menu"}
              </span>
            </Button>
            <Link
              to="/"
              className="text-xl sm:text-2xl font-bold tracking-tighter"
            >
              SPECTRAX
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className="text-sm font-medium hover:text-gray-300 transition-colors"
            >
              HOME
            </Link>
            
            <Link
              to="/shop"
              className="text-sm font-medium hover:text-gray-300 transition-colors"
            >
              SHOP
            </Link>
            {/* <Link
              to="/contact"
              className="text-sm font-medium hover:text-gray-300 transition-colors"
            >
              CONTACT
            </Link> */}
          </nav>

          <div className="flex items-center space-x-1 sm:space-x-4">
            <form onSubmit={handleSearch} className="relative hidden sm:block">
              <Input
                type="search"
                placeholder="Search..."
                className="w-[200px] lg:w-[300px] bg-black text-white pr-8 border-white border-opacity-20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-white hover:text-gray-300"
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">Search</span>
              </Button>
            </form>

            <div className="flex items-center space-x-1 sm:space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-white"
                onClick={handleWishlist}
              >
                <Heart className="h-5 w-5" />
                <span className="sr-only">Wishlist</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white"
                onClick={handleCart}
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="sr-only">Cart</span>
              </Button>

              <div className="relative" ref={dropdownRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white"
                  onClick={toggleDropdown}
                >
                  <User className="h-5 w-5" />
                  <span className="sr-only">Account</span>
                </Button>
                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white text-black rounded shadow-lg">
                    <ul>
                      {userDetails.user ? (
                        <>
                          <li>
                            <Link
                              to="/account"
                              className="block px-4 py-2 hover:bg-gray-200"
                              onClick={() => handleUserAction("/account")}
                            >
                              Account
                            </Link>
                          </li>
                          <li>
                            <button
                              className="block w-full text-left px-4 py-2 hover:bg-gray-200"
                              onClick={handleLogout}
                            >
                              Logout
                            </button>
                          </li>
                        </>
                      ) : (
                        <li>
                          <button
                            className="block w-full text-left px-4 py-2 hover:bg-gray-200"
                            onClick={() => navigate("/login")}
                          >
                            Login
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden border-t border-white border-opacity-20 py-3 space-y-3"
          >
            <nav className="flex flex-col">
              <Link
                to="/"
                className="py-2 text-sm font-medium hover:text-gray-300 transition-colors"
              >
                HOME
              </Link>
              <Link
                to="/shop"
                className="py-2 text-sm font-medium hover:text-gray-300 transition-colors"
              >
                SHOP
              </Link>
            </nav>
            <form onSubmit={handleSearch} className="relative sm:hidden">
              <Input
                type="search"
                placeholder="Search..."
                className="w-full bg-black text-white pr-8 border-white border-opacity-20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-white hover:text-gray-300"
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">Search</span>
              </Button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
