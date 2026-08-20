require("dotenv").config();
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const verifyAdmin = async (req, res, next) => {
  let token = req.cookies?.token;

  if (token) {
    try {
      const decode = jwt.verify(token, process.env.JWT_SECRET);

      const admin = await User.findById(decode.id).select("-password");

      if (!admin) {
        return res.status(401).json({
          message: "Admin not found",
        });
      }

      if (!admin.isAdmin) {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      req.user = admin;

      next();
    } catch (error) {
      console.log(error);

      console.log("Not authorized , token failed");
      res.status(401).json({ message: "Not authorized token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized , no token" });
    console.log("Not authorized , no token");
  }
};

module.exports = { verifyAdmin };
