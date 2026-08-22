# SpectraX

A full-stack e-commerce platform for electronics retail — customer storefront, admin dashboard, and REST API in one monorepo.

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)

## Overview

SpectraX is a production-style MERN e-commerce application built as two independent single-page applications — a customer storefront and an admin dashboard — backed by a single Express/MongoDB API. It covers the full commerce lifecycle: browsing and search, cart and wishlist, checkout with three payment paths (COD, Razorpay, wallet), order management, and an admin panel for catalog, promotions, and sales reporting.

The backend is built around transactional integrity and defensive request handling rather than happy-path-only logic — checkout writes are wrapped in MongoDB transactions, payment reconciliation runs through a signature-verified webhook independent of the client, and every write endpoint scopes to the authenticated user rather than trusting client-supplied identifiers.

## Key Features

**Storefront**
- Product catalog with categories, brands, variant attributes (e.g. RAM/storage combinations), search, filtering, and sorting
- Cart and wishlist, persisted per user
- Email OTP verification for signup and password reset, backed by server-side session state
- Google OAuth login alongside standard email/password auth
- Checkout via Cash on Delivery, Razorpay, or in-app wallet balance
- Coupon codes and time-bound product/category offers
- Order tracking with cancellation, returns, and automatic wallet refunds
- PDF invoice generation

**Admin Dashboard**
- Product, category, brand, coupon, and offer management with image upload/cropping (Cloudinary)
- Customer management and order fulfillment workflow
- Sales analytics and reporting with chart visualizations and Excel export

**Platform**
- JWT access/refresh token auth (httpOnly cookies) with a separate admin auth stack
- Razorpay webhook reconciliation — signature-verified, idempotent, independent of the client completing checkout
- MongoDB transactions around checkout (stock reservation, order creation, cart clearing) — all-or-nothing
- Rate limiting on authentication and API routes
- Health check endpoint for deployment monitoring

## Tech Stack

**Frontend** (×2 — storefront & admin, each a separate Vite app)
React 18 · React Router v7 · Redux Toolkit + redux-persist · Tailwind CSS · shadcn/ui (Radix primitives) · Axios · Framer Motion

**Backend**
Node.js · Express · MongoDB + Mongoose · JWT · bcrypt · express-session (MongoDB-backed) · express-rate-limit · Nodemailer · Razorpay SDK · Google Auth Library

**Admin-specific**
Recharts · React Hook Form + Zod · Cloudinary · XLSX export

## Architecture Overview

```
Spectraxgit/
├── backend/          Express REST API (MVC) — routes → middleware → controllers → Mongoose models
├── frontend/user/     Customer storefront (Vite + React SPA)
└── frontend/admin/    Admin dashboard (Vite + React SPA)
```

Both frontends are independently deployed SPAs that consume the same backend under separate route prefixes (`/user`, `/admin`), each authenticated through its own JWT cookie flow. The backend follows a conventional MVC structure — routes wire URLs to controllers, shared concerns (auth, rate limiting, session) live in middleware, and controllers are the only layer that talks to Mongoose models.

## Local Setup

**Prerequisites:** Node.js 18+, a MongoDB instance (Atlas or local)

```bash
# Clone
git clone https://github.com/Shaun-N-S/Spectraxgit.git
cd Spectraxgit

# Backend
cd backend && npm install
cp .env.example .env   # fill in the values below
npm run dev             # http://localhost:4000

# Storefront (new terminal)
cd frontend/user && npm install
npm run dev              # http://localhost:5173

# Admin dashboard (new terminal)
cd frontend/admin && npm install
npm run dev               # http://localhost:5174
```

## Environment Variables

**`backend/.env`**

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` | JWT signing secrets (user auth) |
| `JWT_SECRET` | JWT signing secret (admin auth) |
| `SESSION_SECRET` | express-session signing secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `NODEMAILER_EMAIL` / `NODEMAILER_PASSWORD` | SMTP credentials for OTP emails |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay API credentials |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signature secret |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins |

**`frontend/*/.env`**

| Variable | Description |
|---|---|
| `VITE_BASE_URL` | Backend API base URL |
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key (storefront) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID (storefront) |

## Deployment

- **Storefront & Admin Dashboard** — deployed as static SPAs on Vercel, each with SPA rewrite routing.
- **Backend** — containerized with Docker (Node 22 Alpine), deployable to any container host (Render, Railway, Fly.io).
- **Database** — MongoDB Atlas.
- Exposes `GET /health` for uptime/readiness checks.

## Future Improvements

- CSRF token protection on state-changing requests
- Automated test coverage (unit + integration)
- CI/CD pipeline for build and deploy
- Redis-backed caching for high-traffic read endpoints
- Real-time order status updates

## Author

**Shaun N S**
GitHub: [@Shaun-N-S](https://github.com/Shaun-N-S)
