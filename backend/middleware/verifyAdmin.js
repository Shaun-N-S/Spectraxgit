require("dotenv").config();
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { HTTP_STATUS } = require("../constants/httpStatus");
const { AUTH_MESSAGES } = require("../constants/messages");

const verifyAdmin = async (req, res, next) => {
  let token = req.cookies?.token;

  if (token) {
    try {
      const decode = jwt.verify(token, process.env.JWT_SECRET);

      const admin = await User.findById(decode.id).select("-password");

      if (!admin) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          message: AUTH_MESSAGES.ADMIN_NOT_FOUND,
        });
      }

      if (!admin.isAdmin) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          message: AUTH_MESSAGES.ACCESS_DENIED,
        });
      }

      req.user = admin;

      next();
    } catch (error) {
      console.log(error);

      console.log("Not authorized , token failed");
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: AUTH_MESSAGES.NOT_AUTHORIZED_TOKEN_FAILED });
    }
  } else {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: AUTH_MESSAGES.NOT_AUTHORIZED_NO_TOKEN });
    console.log("Not authorized , no token");
  }
};

module.exports = { verifyAdmin };
