import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <footer className="bg-black text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Logo and Copyright */}
          <div className="flex flex-col">
            <a href="/" className="text-2xl font-bold tracking-tighter mb-4">
              SPECTRAX
            </a>
            <p className="text-xs text-gray-400 mt-auto">© 2024 SPECTRAX. All rights reserved.</p>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Products</h3>
            <ul className="space-y-2">
              <li>
                <a href="/products/headphones" className="text-xs text-gray-300 hover:text-white transition-colors">
                  Headphones
                </a>
              </li>
              <li>
                <a href="/products/keyboard" className="text-xs text-gray-300 hover:text-white transition-colors">
                  Keyboard
                </a>
              </li>
              <li>
                <a href="/products/desktops" className="text-xs text-gray-300 hover:text-white transition-colors">
                  Desktops
                </a>
              </li>
              <li>
                <a href="/products/accessories" className="text-xs text-gray-300 hover:text-white transition-colors">
                  Accessories
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="/support/help" className="text-xs text-gray-300 hover:text-white transition-colors">
                  Product Help
                </a>
              </li>
              <li>
                <a href="/support/register" className="text-xs text-gray-300 hover:text-white transition-colors">
                  Register
                </a>
              </li>
              <li>
                <a href="/support/updates" className="text-xs text-gray-300 hover:text-white transition-colors">
                  Updates
                </a>
              </li>
              <li>
                <a href="/support/providers" className="text-xs text-gray-300 hover:text-white transition-colors">
                  Providers
                </a>
              </li>
            </ul>
          </div>

          {/* Account and Social Media */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Account</h3>
            <ul className="space-y-2 mb-4">
              <li>
                <a href="/account" className="text-xs text-gray-300 hover:text-white transition-colors">
                  My Account
                </a>
              </li>
              <li>
                <a href="/auth" className="text-xs text-gray-300 hover:text-white transition-colors">
                  Login / Register
                </a>
              </li>
              <li>
                <a href="/cart" className="text-xs text-gray-300 hover:text-white transition-colors">
                  Cart
                </a>
              </li>
            </ul>
            <h3 className="text-sm font-semibold mb-2">Follow us</h3>
            <div className="flex space-x-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                  <Facebook className="h-4 w-4" />
                  <span className="sr-only">Facebook</span>
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-4 w-4" />
                  <span className="sr-only">Twitter</span>
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-4 w-4" />
                  <span className="sr-only">Instagram</span>
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4" />
                  <span className="sr-only">LinkedIn</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

