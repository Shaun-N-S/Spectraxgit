const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { HTTP_STATUS } = require("../constants/httpStatus");
const { COMMON_MESSAGES, AUTH_MESSAGES, USER_MESSAGES } = require("../constants/messages");

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: AUTH_MESSAGES.INVALID_EMAIL });
    }

    const adminInfo = await User.findOne({ email });

    if (!adminInfo) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: AUTH_MESSAGES.INVALID_CREDENTIALS,
      });
    }

    if (adminInfo.isAdmin === true) {
      if (await bcrypt.compare(password, adminInfo.password)) {
        const token = jwt.sign({ id: adminInfo._id }, process.env.JWT_SECRET, {
          expiresIn: "3d",
        });

        res.cookie("token", token, {
          httpOnly: true,
          maxAge: 30 * 24 * 60 * 60 * 1000,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });

        return res.status(HTTP_STATUS.OK).json({
          message: AUTH_MESSAGES.ADMIN_LOGIN_SUCCESS,
          _id: adminInfo._id,
          firstName: adminInfo.firstName,
          lastName: adminInfo.lastName,
          email: adminInfo.email,
          phone: adminInfo.phone,
        });
      } else {
        return res
          .status(HTTP_STATUS.UNAUTHORIZED)
          .json({ message: AUTH_MESSAGES.INVALID_PASSWORD });
      }
    } else {
      return res
        .status(HTTP_STATUS.FORBIDDEN)
        .json({ message: AUTH_MESSAGES.NO_ACCESS });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_TITLE_CASE });
  }
};

// Fetch all users
const fetchAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false }).select("-password");

    if (!users || users.length === 0) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: USER_MESSAGES.NO_USERS_FOUND });
    }

    // Return the list of users
    res
      .status(HTTP_STATUS.OK)
      .json({ message: USER_MESSAGES.USERS_FETCHED, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: COMMON_MESSAGES.SERVER_ERROR, error: error.message });
  }
};

const logoutAdmin = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  return res
    .status(HTTP_STATUS.OK)
    .json({ message: AUTH_MESSAGES.LOGOUT_SUCCESS });
};

module.exports = {
  adminLogin,
  logoutAdmin,
  fetchAllUsers,
};
