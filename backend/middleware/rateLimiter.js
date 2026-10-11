const { rateLimit } = require("express-rate-limit");
const { HTTP_STATUS } = require("../constants/httpStatus");
const { COMMON_MESSAGES } = require("../constants/messages");


const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};


const rateLimitHandler = (req, res) => {
  res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
    message: COMMON_MESSAGES.TOO_MANY_REQUESTS,
  });
};


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


const apiLimiter = rateLimit({
  windowMs: parsePositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
  max: parsePositiveInt(process.env.API_RATE_LIMIT_MAX, 300),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

module.exports = { authLimiter, adminAuthLimiter, apiLimiter };
