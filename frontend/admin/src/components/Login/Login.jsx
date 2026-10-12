import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Eye, EyeOff } from "lucide-react";
import axiosInstance from '../../axios/adminAxios'; // Axios instance for API requests
import { addAdmin } from '../../redux/adminSlice';


const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const validateForm = () => {
    let newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      setLoading(true);
      try {
        console.log('before sending the data to the admin')
        const response = await axiosInstance.post('/login', formData);
        const adminData = response.data; // Assuming admin data is returned in response.data
        dispatch(addAdmin(adminData)); // Store admin data in Redux

        navigate('/home'); // Redirect to home after successful login
      } catch (error) {
        console.error('Login error:', error.response?.data || error.message);
        setErrors({ general: 'Invalid credentials. Please try again.' });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <div className="w-full max-w-md p-8 bg-gray-900 shadow-2xl rounded-lg">
        <h2 className="text-3xl font-extrabold text-center text-[#00cc00] mb-6"> Admin Login</h2>

        {/* General Error Message */}
        {errors.general && (
          <div className="text-red-500 text-sm mb-4">{errors.general}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              className={`w-full p-3 bg-gray-800 text-white border rounded-md focus:ring-2 focus:ring-[#00cc00] ${errors.email ? 'border-red-500' : 'border-gray-700'}`}
            />
            {errors.email && <div className="text-red-500 text-sm mt-1">{errors.email}</div>}
          </div>

          {/* Password Field */}
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              className={`w-full p-3 bg-gray-800 text-white border rounded-md focus:ring-2 focus:ring-[#00cc00] ${errors.password ? 'border-red-500' : 'border-gray-700'}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {errors.password && <div className="text-red-500 text-sm mt-1">{errors.password}</div>}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full py-3 bg-[#00cc00] hover:bg-green-600 text-black font-bold rounded-md focus:outline-none disabled:bg-gray-700"
            disabled={loading}
          >
            {loading ? 'Logging In...' : 'Login'}
          </Button>
        </form>
        <br />


      </div>
    </div>
  );
};

export default Login;
