const express = require("express");
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/tokenUtils");
const { HTTP_STATUS } = require("../constants/httpStatus");
const { COMMON_MESSAGES, AUTH_MESSAGES, USER_MESSAGES } = require("../constants/messages");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const securePassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    console.log(error);
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b> Your OTP: ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.log("Error sending email", error);
    return false;
  }
}

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes — matches the previous cookie maxAge
const PENDING_SIGNUP_TTL_MS = 10 * 60 * 1000; // 10 minutes — matches the previous cookie maxAge
const RESET_AUTHORIZATION_TTL_MS = 10 * 60 * 1000; // 10 minutes to complete reset after OTP verification

const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, confirmPassword } =
      req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.INVALID_EMAIL });
    }

    if (password !== confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.PASSWORDS_DO_NOT_MATCH });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: AUTH_MESSAGES.EMAIL_ALREADY_REGISTERED });
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ message: AUTH_MESSAGES.VERIFICATION_EMAIL_FAILED });
    }

    const hashedPassword = await securePassword(password);

    // OTP and the pending signup payload live server-side only, keyed by this
    // browser's session (connect-mongo backed). The client never receives the
    // OTP value or the password (hashed here already) in any form.
    req.session.otp = otp;
    req.session.otpPurpose = "signup";
    req.session.otpEmail = email;
    req.session.otpExpiresAt = Date.now() + OTP_TTL_MS;
    req.session.pendingSignupData = { firstName, lastName, email, phone, hashedPassword };
    req.session.pendingSignupExpiresAt = Date.now() + PENDING_SIGNUP_TTL_MS;

    res.status(HTTP_STATUS.OK).json({ success: true, message: AUTH_MESSAGES.OTP_SENT });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_OCCURRED });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (
      !req.session.otp ||
      req.session.otpPurpose !== "signup" ||
      !req.session.otpExpiresAt ||
      Date.now() > req.session.otpExpiresAt
    ) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: AUTH_MESSAGES.OTP_EXPIRED });
    }

    if (otp !== req.session.otp) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.INVALID_OTP });
    }

    const pendingData = req.session.pendingSignupData;
    if (
      !pendingData ||
      !req.session.pendingSignupExpiresAt ||
      Date.now() > req.session.pendingSignupExpiresAt
    ) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: AUTH_MESSAGES.SIGNUP_SESSION_EXPIRED });
    }

    const { firstName, lastName, email, phone, hashedPassword } = pendingData;

    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
    });

    await user.save();

    // Single-use: clear all signup verification state now that it's consumed.
    delete req.session.otp;
    delete req.session.otpPurpose;
    delete req.session.otpEmail;
    delete req.session.otpExpiresAt;
    delete req.session.pendingSignupData;
    delete req.session.pendingSignupExpiresAt;

    const userResponse = user.toObject();
    delete userResponse.password;

    return res
      .status(HTTP_STATUS.CREATED)
      .json({ message: AUTH_MESSAGES.USER_REGISTERED, user: userResponse });
  } catch (error) {
    console.error("OTP verification error:", error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.SERVER_ERROR });
  }
};

const resendOtp = async (req, res) => {
  try {
    if (!req.session.otpPurpose || !req.session.otpEmail) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: AUTH_MESSAGES.NO_PENDING_VERIFICATION });
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(req.session.otpEmail, otp);
    if (!emailSent) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: AUTH_MESSAGES.OTP_RESEND_FAILED });
    }

    req.session.otp = otp;
    req.session.otpExpiresAt = Date.now() + OTP_TTL_MS;

    return res.status(HTTP_STATUS.OK).json({ message: AUTH_MESSAGES.OTP_RESENT });
  } catch (error) {
    console.error("Resend OTP error:", error.message);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.SERVER_ERROR });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.GOOGLE_TOKEN_REQUIRED });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // Extract name parts
    const fullName = payload.given_name || payload.name || "";
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0];
    // Join the rest of the parts as lastName, or use a default
    const lastName = nameParts.slice(1).join(" ") || "Unknown";

    const { email } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        firstName,
        lastName,
        email,
        googleAuth: true,
      });
      await user.save();
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.status(HTTP_STATUS.OK).json({
      message: AUTH_MESSAGES.GOOGLE_LOGIN_SUCCESS,
      id: user._id,
      name: user.firstName,
      email: user.email,
    });
  } catch (error) {
    console.error("Detailed Google Auth Error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.INVALID_EMAIL });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: AUTH_MESSAGES.INVALID_EMAIL_OR_PASSWORD,
      });
    }

    if (user.status === "blocked") {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message:
          AUTH_MESSAGES.ACCOUNT_RESTRICTED,
      });
    }

    if (user.role !== "user") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.CHECK_ROLE });
    }

    // Google-authenticated accounts have no password on record — attempting
    // bcrypt.compare against undefined would throw. Return a clear, actionable
    // business error instead of an internal-server-error.
    if (!user.password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: AUTH_MESSAGES.GOOGLE_ACCOUNT_PASSWORD_LOGIN,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.INVALID_EMAIL_OR_PASSWORD });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store access token and refresh token in HTTP-only cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    const safeUser = await User.findById(user._id).select("-password");

    return res.status(HTTP_STATUS.OK).json({
      message: AUTH_MESSAGES.USER_LOGGED_IN,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR_OCCURRED });
  }
};

const logoutUser = (req, res) => {
  console.log("reaching here");
  try {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(HTTP_STATUS.OK).json({ message: AUTH_MESSAGES.LOGOUT_SUCCESS });
  } catch (error) {
    console.error("Logout error:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: AUTH_MESSAGES.LOGOUT_FAILED });
  }
};

const refreshAccessToken = (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: AUTH_MESSAGES.NO_REFRESH_TOKEN });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const newAccessToken = generateAccessToken(decoded.id);

    // Set the new access token as an HTTP-only cookie
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.status(HTTP_STATUS.OK).json({ message: AUTH_MESSAGES.TOKEN_REFRESHED });
  } catch (error) {
    console.error("Refresh token error:", error.message);
    // Clear the invalid refresh token
    res.clearCookie("refreshToken");
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: AUTH_MESSAGES.INVALID_REFRESH_TOKEN });
  }
};

// Controller to update the user's status
const updateUserStatus = async (req, res) => {
  const { id } = req.params; // Extract user ID from request parameters
  const { status } = req.body; // Extract the new status from request body

  try {
    // Find the user by ID and update the status field
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true }, // Return the updated user document
    );

    // If no user found, send a 404 response
    if (!updatedUser) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: COMMON_MESSAGES.USER_NOT_FOUND });
    }

    // Respond with the updated user data
    res
      .status(HTTP_STATUS.OK)
      .json({ message: USER_MESSAGES.STATUS_UPDATED, user: updatedUser });
  } catch (error) {
    console.error("Error updating user status:", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: USER_MESSAGES.STATUS_UPDATE_FAILED, error: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.INVALID_EMAIL });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: COMMON_MESSAGES.USER_NOT_FOUND });
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ message: AUTH_MESSAGES.VERIFICATION_EMAIL_FAILED });
    }

    // OTP lives server-side only, keyed by this browser's session.
    req.session.otp = otp;
    req.session.otpPurpose = "reset";
    req.session.otpEmail = email;
    req.session.otpExpiresAt = Date.now() + OTP_TTL_MS;
    // Clear any stale authorization left over from a previous reset attempt.
    delete req.session.resetAuthorized;
    delete req.session.resetAuthorizedEmail;
    delete req.session.resetAuthorizedUntil;

    res.status(HTTP_STATUS.OK).json({ success: true, message: AUTH_MESSAGES.OTP_SENT });
  } catch (error) {
    console.error("Error in forget password:", error.message);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const forgotPasswordVerifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.OTP_REQUIRED });
    }

    if (
      !req.session.otp ||
      req.session.otpPurpose !== "reset" ||
      !req.session.otpExpiresAt ||
      Date.now() > req.session.otpExpiresAt
    ) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: AUTH_MESSAGES.OTP_EXPIRED });
    }

    if (otp !== req.session.otp) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: AUTH_MESSAGES.INVALID_OTP });
    }

    // Mark the reset authorized server-side, scoped to this email, for a
    // bounded window. resetPassword below will trust only this — never a
    // client-supplied email.
    req.session.resetAuthorized = true;
    req.session.resetAuthorizedEmail = req.session.otpEmail;
    req.session.resetAuthorizedUntil = Date.now() + RESET_AUTHORIZATION_TTL_MS;

    // Single-use: the OTP itself is now consumed.
    delete req.session.otp;
    delete req.session.otpPurpose;
    delete req.session.otpExpiresAt;

    return res.status(HTTP_STATUS.OK).json({ message: AUTH_MESSAGES.OTP_VERIFIED });
  } catch (error) {
    console.log("Error in verifying forgot password OTP:", error.message);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (
      !req.session.resetAuthorized ||
      !req.session.resetAuthorizedEmail ||
      !req.session.resetAuthorizedUntil ||
      Date.now() > req.session.resetAuthorizedUntil
    ) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: AUTH_MESSAGES.RESET_SESSION_EXPIRED });
    }

    const user = await User.findOne({ email: req.session.resetAuthorizedEmail });
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: COMMON_MESSAGES.USER_NOT_FOUND });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Single-use: clear the authorization now that it's been consumed.
    delete req.session.resetAuthorized;
    delete req.session.resetAuthorizedEmail;
    delete req.session.resetAuthorizedUntil;
    delete req.session.otpEmail;

    res
      .status(HTTP_STATUS.OK)
      .json({ success: true, message: AUTH_MESSAGES.PASSWORD_RESET_SUCCESS });
  } catch (error) {
    console.error("Error in reset password:", error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;

    if (!email) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: USER_MESSAGES.EMAIL_REQUIRED });
    }

    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: COMMON_MESSAGES.USER_NOT_FOUND });
    }

    if (firstName) {
      user.firstName = firstName;
    }
    if (lastName) {
      user.lastName = lastName;
    }
    if (phone) {
      user.phone = phone;
    }

    await user.save();

    const safeUser = await User.findById(user._id).select("-password");

    return res.status(HTTP_STATUS.OK).json({
      message: USER_MESSAGES.PROFILE_UPDATED,
      user: safeUser,
    });
  } catch (error) {
    console.log("Error in updating profile:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const userProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: COMMON_MESSAGES.USER_NOT_FOUND,
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      message: USER_MESSAGES.USER_FOUND,
      user,
    });
  } catch (error) {
    console.error(error);

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: COMMON_MESSAGES.USER_NOT_FOUND,
      });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: USER_MESSAGES.INVALID_OLD_PASSWORD,
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    return res.status(HTTP_STATUS.OK).json({
      message: USER_MESSAGES.PASSWORD_UPDATED,
    });
  } catch (error) {
    console.error(error);

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

module.exports = {
  signup,
  login,
  verifyOtp,
  resendOtp,
  logoutUser,
  googleAuth,
  refreshAccessToken,
  updateUserStatus,
  forgotPassword,
  forgotPasswordVerifyOtp,
  resetPassword,
  updateProfile,
  userProfile,
  updatePassword,
};
