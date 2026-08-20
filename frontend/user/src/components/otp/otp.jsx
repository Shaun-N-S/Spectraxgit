import React, { useState, useEffect } from 'react';
import '../signup/SignUp.css';
import axiosInstance from '@/axios/userAxios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { User } from 'lucide-react';

const OtpVerification = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  
  const userData = JSON.parse(localStorage.getItem('user'));
const email = userData?.email || 'No email found';

console.log('User Email:', email);


  

  const handleChange = (e) => setOtp(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      const response = await axiosInstance.post('/verify-otp', { otp }, { withCredentials: true });
      // alert('OTP verified successfully!');
      toast.success('OTP verified successfully!');
      setTimeout(() => {
        navigate('/home');
      }, 1000);
    } catch (err) {
      console.log(err)
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const countdown = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  const handleResendOtp = async () => {
    try {
      await axiosInstance.post('/resend-otp', { email });
      setTimer(60);
      setError('');
    } catch (err) {
      toast.error('Failed to resend OTP. Please try again later.');
      // setError('Failed to resend OTP. Please try again later.');
    }
  };

  return (
    <div className="signup-container">
      <form className="signup-form" onSubmit={handleSubmit}>
        <h1 className="signup-title">OTP Verification</h1>

        <div className="form-group">
          <input
            type="text"
            name="otp"
            value={otp}
            onChange={handleChange}
            placeholder="Enter OTP"
            className={error ? 'error' : ''}
          />
          {error && <span className="error-message">{error}</span>}
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>

        <p className="signin-text">
          {timer > 0 ? `Resend OTP in ${timer}s` : (
            <span className="signin-link" onClick={handleResendOtp} style={{ cursor: 'pointer' }}>
              Resend OTP
            </span>
          )}
        </p>
      </form>
    </div>
  );
};

export default OtpVerification;
