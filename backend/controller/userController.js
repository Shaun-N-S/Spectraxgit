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
      return res.status(400).json({ message: "Invalid email" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res
        .status(500)
        .json({ message: "Failed to send verification email" });
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

    res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ message: "An internal server error occurred" });
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
        .status(400)
        .json({ message: "OTP has expired. Please request a new one." });
    }

    if (otp !== req.session.otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const pendingData = req.session.pendingSignupData;
    if (
      !pendingData ||
      !req.session.pendingSignupExpiresAt ||
      Date.now() > req.session.pendingSignupExpiresAt
    ) {
      return res
        .status(400)
        .json({ message: "Signup session expired. Please sign up again." });
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
      .status(201)
      .json({ message: "User registered successfully", user: userResponse });
  } catch (error) {
    console.error("OTP verification error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const resendOtp = async (req, res) => {
  try {
    if (!req.session.otpPurpose || !req.session.otpEmail) {
      return res
        .status(400)
        .json({ message: "No pending verification found. Please start over." });
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(req.session.otpEmail, otp);
    if (!emailSent) {
      return res.status(500).json({ message: "Failed to resend OTP" });
    }

    req.session.otp = otp;
    req.session.otpExpiresAt = Date.now() + OTP_TTL_MS;

    return res.status(200).json({ message: "OTP resent successfully" });
  } catch (error) {
    console.error("Resend OTP error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
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

    res.status(200).json({
      message: "Google login successful",
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
    res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        message:
          "Your account is temporarily restricted. Please contact support.",
      });
    }

    if (user.role !== "user") {
      return res.status(400).json({ message: "Check your role" });
    }

    // Google-authenticated accounts have no password on record — attempting
    // bcrypt.compare against undefined would throw. Return a clear, actionable
    // business error instead of an internal-server-error.
    if (!user.password) {
      return res.status(400).json({
        message: "This account uses Google Sign-In. Please log in with Google.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
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

    return res.status(200).json({
      message: "User logged in",
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "An internal server error occurred" });
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

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error during logout" });
  }
};

const refreshAccessToken = (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token provided" });
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

    res.status(200).json({ message: "Token refreshed successfully" });
  } catch (error) {
    console.error("Refresh token error:", error.message);
    // Clear the invalid refresh token
    res.clearCookie("refreshToken");
    res.status(401).json({ message: "Invalid or expired refresh token" });
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
      return res.status(404).json({ message: "User not found" });
    }

    // Respond with the updated user data
    res
      .status(200)
      .json({ message: "User status updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating user status:", error);
    res
      .status(500)
      .json({ message: "Error updating user status", error: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res
        .status(500)
        .json({ message: "Failed to send verification email" });
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

    res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error in forget password:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const forgotPasswordVerifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: "Please enter OTP" });
    }

    if (
      !req.session.otp ||
      req.session.otpPurpose !== "reset" ||
      !req.session.otpExpiresAt ||
      Date.now() > req.session.otpExpiresAt
    ) {
      return res
        .status(400)
        .json({ message: "OTP has expired. Please request a new one." });
    }

    if (otp !== req.session.otp) {
      return res.status(400).json({ message: "Invalid OTP" });
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

    return res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.log("Error in verifying forgot password OTP:", error.message);
    return res.status(500).json({ message: "Internal server error" });
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
        .status(400)
        .json({ message: "Session expired. Please try again." });
    }

    const user = await User.findOne({ email: req.session.resetAuthorizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
      .status(200)
      .json({ success: true, message: "Password reset successfully." });
  } catch (error) {
    console.error("Error in reset password:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
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

    return res.status(200).json({
      message: "Profile updated successfully",
      user: safeUser,
    });
  } catch (error) {
    console.log("Error in updating profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const userProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User found successfully",
      user,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Invalid old password",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
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
