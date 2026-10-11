const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { HTTP_STATUS } = require('../constants/httpStatus');
const { COMMON_MESSAGES, AUTH_MESSAGES } = require('../constants/messages');

const verifyAccessToken = async (req, res, next) => {
  // Check both cookies and Authorization header
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: AUTH_MESSAGES.ACCESS_TOKEN_MISSING });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    
    const user = await User.findById(decoded.id);
    
    // Check if user exists
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ 
        message: COMMON_MESSAGES.USER_NOT_FOUND 
      });
    }

    // Check user status
    if (user.status === 'blocked') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ 
        message: AUTH_MESSAGES.ACCOUNT_NOT_ACTIVE 
      });
    }

    req.user = decoded;
    // Also attach the full user object if needed
    req.userDetails = user;
    
    next();
  } catch (error) {
    console.error('Access token error:', error);
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: AUTH_MESSAGES.INVALID_ACCESS_TOKEN });
  }
};

module.exports = { verifyAccessToken };