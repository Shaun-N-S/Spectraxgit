const { rateLimit } = require("express-rate-limit");

// Reads a positive integer from an env var, falling back to a safe default if
// the variable is absent, empty, or not a valid positive number.
const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Consistent with this API's existing response style ({ message }) everywhere
// else in the codebase. Deliberately carries no internal detail (no limiter
// name, no reset time, no config values) beyond the standard rate-limit
// headers express-rate-limit itself adds.
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    message: "Too many requests. Please try again later.",
  });
};

// Auth limiter — signup, login, OTP verify/resend, forgot-password,
// reset-password, Google auth, and refresh-token. These are the endpoints an
// attacker would target for credential stuffing, OTP guessing, or triggering
// unlimited outbound OTP emails.
const authLimiter = rateLimit({
  windowMs: parsePositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
  max: parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Admin auth limiter — admin login.
const adminAuthLimiter = rateLimit({
  windowMs: parsePositiveInt(process.env.ADMIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
  max: parsePositiveInt(process.env.ADMIN_RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// API limiter — generous, app-wide baseline against general abuse. Mounted
// globally; the stricter limiters above apply on top of it for their specific
// routes, not instead of it.
const apiLimiter = rateLimit({
  windowMs: parsePositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
  max: parsePositiveInt(process.env.API_RATE_LIMIT_MAX, 300),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

module.exports = { authLimiter, adminAuthLimiter, apiLimiter };
