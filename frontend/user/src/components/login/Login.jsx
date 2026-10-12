import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Eye, EyeOff } from "lucide-react";
import axiosInstance from "../../axios/userAxios";
import { addUser } from "@/redux/userSlice";
import { GoogleLogin } from "@react-oauth/google";
import {toast} from 'react-hot-toast';


const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    let newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Email is invalid";
    if (!formData.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setLoading(true);
      try {
        const response = await axiosInstance.post("/login", formData);
        console.log(response.data);
        dispatch(addUser(response.data.user));
        toast.success('Login successful');
        navigate("/home");
      } catch (error) {
        console.error("Login error:", error.response?.data || error.message);
        if (error.response?.data?.message) {
          toast.error(error.response.data.message );
        }
        // setErrors({ general: "Invalid credentials. Please try again." });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <div className="w-full max-w-md p-8 bg-gray-900 shadow-2xl rounded-lg">
        <h2 className="text-3xl font-extrabold text-center text-[#00cc00] mb-6">
          Login
        </h2>

        {errors.general && (
          <div className="text-red-500 text-sm mb-4">{errors.general}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              className={`w-full p-3 bg-gray-800 text-white border rounded-md focus:ring-2 focus:ring-[#00cc00] ${
                errors.email ? "border-red-500" : "border-gray-700"
              }`}
            />
            {errors.email && (
              <div className="text-red-500 text-sm mt-1">{errors.email}</div>
            )}
          </div>

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              className={`w-full p-3 bg-gray-800 text-white border rounded-md focus:ring-2 focus:ring-[#00cc00] ${
                errors.password ? "border-red-500" : "border-gray-700"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {errors.password && (
              <div className="text-red-500 text-sm mt-1">{errors.password}</div>
            )}
          </div>
          <br />
          <Link to="/forgotpassword" className="text-[#00cc00] hover:underline">
            Forgot Password ?
          </Link>
        

          <Button
            type="submit"
            className="w-full py-3 bg-[#00cc00] hover:bg-green-600 text-black font-bold rounded-md focus:outline-none disabled:bg-gray-700"
            disabled={loading}
          >
            {loading ? "Logging In..." : "Login"}
          </Button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="text-[#00cc00] hover:underline">
            Sign Up
          </Link>
        </p>
        <br />
          <div className="flex justify-center">
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            try {
              const { credential } = credentialResponse;
              const response = await axiosInstance.post("/google-auth", {
                token: credential,
              });
              console.log(response.data);
              dispatch(addUser(response.data));
              navigate("/home");
            } catch (error) {
              console.error("Google login error:", error.response?.data || error.message);
              setErrors({ general: "Google login failed. Please try again." });
            }
          }}
          onError={() => {
            setErrors({ general: "Google login failed. Please try again." });
            console.log("Login Failed");
          }}
        />
        </div>
      </div>
    </div>
  );
};

export default Login;