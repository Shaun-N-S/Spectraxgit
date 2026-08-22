import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axiosInstance from '@/axios/userAxios';

const ResetPassword = () => {
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwords.password !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);

    try {
      await axiosInstance.post('/reset-password', { 
         
        newPassword: passwords.password 
      });
      toast.success('Password reset successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-white">Reset Password</CardTitle>
          <CardDescription className="text-center text-gray-400">
            Enter your new password
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={passwords.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 bg-gray-700 text-white border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={passwords.confirmPassword}
                  onChange={handleChange}
                  className="pl-10 pr-10 bg-gray-700 text-white border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;

