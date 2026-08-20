require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const userRoutes = require("./routes/userRoutes");
const cookieParser = require("cookie-parser");
const adminRoutes = require("./routes/adminRoutes");
const { apiLimiter } = require("./middleware/rateLimiter");
const { handleRazorpayWebhook } = require("./controller/orderController");

const PORT = process.env.PORT || 4000;

// Trust exactly one hop of reverse proxy (the standard topology for this
// app's deployment targets — a single load balancer/reverse proxy sits in
// front of the Node process). Required for express-rate-limit and any other
// IP-based logic to read the real client IP from X-Forwarded-For instead of
// the proxy's own address. `true` (trust all hops) is deliberately avoided —
// it accepts an unbounded, spoofable chain; `1` is the minimum value that
// still works correctly behind exactly one proxy.
app.set("trust proxy", 1);

// Razorpay webhook (B5). Registered before any other middleware — including
// the global JSON body parser mounted further down — because signature
// verification needs the exact raw request bytes Razorpay signed.
// express.raw() is scoped to this single path only; it never runs for any
// other route, and the global bodyParser.json() below is completely
// unaffected (Express never reaches it for a request already fully handled
// by this route). Not behind cors()/apiLimiter/session — Razorpay's servers
// call this directly, with no Origin header and no cookies, and the request
// is authenticated by its signature, not by the app's usual middleware.
app.post(
  "/webhook/razorpay",
  express.raw({ type: "application/json" }),
  handleRazorpayWebhook,
);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:5174"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
};

app.use(cookieParser());

app.use(cors(corsOptions));

app.use(bodyParser.json());

// Mounted after cors() so a 429 response still carries the correct CORS
// headers (otherwise the browser would surface a confusing CORS failure
// instead of the actual rate-limit response). Applies to every request as a
// generous baseline; the auth-specific limiters below apply on top of this
// for their individual sensitive routes.
app.use(apiLimiter);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      // Prunes expired session documents periodically; connect-mongo's default
      // touchAfter avoids rewriting the session on every single request.
      touchAfter: 24 * 3600,
    }),
    cookie: {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000, // 72 hours
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
);

app.use("/user", userRoutes);
app.use("/admin", adminRoutes);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

app.get("/", (req, res) => {
  res.status(200).json({
    service: "SpectraX Backend",
    status: "running",
  });
});

app.get("/health", async (req, res) => {
  try {
    const mongoState = mongoose.connection.readyState;

    return res.status(200).json({
      status: "healthy",
      database: mongoState === 1 ? "connected" : "disconnected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      status: "unhealthy",
    });
  }
});

app.listen(PORT, () => {
  console.log(`server is running on the port ${PORT}`);
});
