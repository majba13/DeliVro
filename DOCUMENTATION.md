# DeliVro — Project Documentation

> **Version:** 1.0.0 | **Stack:** Next.js 16 · TypeScript · TailwindCSS · Prisma · PostgreSQL · Vercel

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Getting Started](#4-getting-started)
5. [Environment Variables](#5-environment-variables)
6. [Database Schema](#6-database-schema)
7. [API Reference](#7-api-reference)
8. [Pages & Routing](#8-pages--routing)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Authentication System](#10-authentication-system)
11. [Cart System](#11-cart-system)
12. [Payment System](#12-payment-system)
13. [Order Flow](#13-order-flow)
14. [Delivery & GPS Tracking](#14-delivery--gps-tracking)
15. [Admin Panel](#15-admin-panel)
16. [Notifications](#16-notifications)
17. [AI Assistant](#17-ai-assistant)
18. [PWA Support](#18-pwa-support)
19. [Deployment](#19-deployment)
20. [Role Permissions](#20-role-permissions)

---

## 1. Project Overview

**DeliVro** is an enterprise-grade multi-vendor e-commerce and delivery platform built for the Bangladesh market. It supports multiple mobile financial services (bKash, Nagad, Rocket), Stripe card payments, real-time GPS delivery tracking, and an AI shopping assistant.

### Key Features

| Feature | Description |
|---|---|
| Multi-vendor | Shop owners manage their own product listings |
| Multi-payment | Stripe, bKash, Nagad, Rocket, Bank Transfer, Cash on Delivery |
| Real-time tracking | Live GPS map showing delivery man's location via Leaflet |
| MFS verification | Admin manually records MFS receipts; system auto-matches to orders |
| AI assistant | In-app chatbot powered by `/api/ai/chat` |
| PWA | Installable as a mobile app with offline support |
| Role-based access | 5 roles: SuperAdmin, Admin, ShopOwner, DeliveryMan, Customer |
| Admin panel | Full user management, payment verification, live delivery map |

---

## 2. Tech Stack

### Frontend
| Library | Version | Purpose |
|---|---|---|
| Next.js | 16.1.6 | React framework, App Router, API Routes |
| React | 19.0.0 | UI rendering |
| TypeScript | 5.7 | Type safety |
| TailwindCSS | 3.4 | Utility-first styling |
| Framer Motion | 12.4 | Animations and transitions |
| Leaflet | 1.9.4 | Interactive delivery tracking map |
| SWR | 2.3 | Client-side data fetching with caching |
| Framer Motion | 12.4 | Page/component animations |

### Backend (Next.js API Routes)
| Library | Version | Purpose |
|---|---|---|
| Prisma | * | ORM for PostgreSQL |
| Jose | 5.9 | JWT signing and verification |
| bcryptjs | 2.4 | Password hashing |
| Zod | 3.24 | Request body validation |
| Stripe | 17.7 | Card payment processing |
| Firebase | 11.10 | Push notifications (optional) |

### Infrastructure
| Tool | Purpose |
|---|---|
| PostgreSQL | Primary database |
| Vercel | Hosting and edge deployment |
| Turbo | Monorepo build orchestration |

---

## 3. Repository Structure

```
DeliVro/
├── apps/
│   └── web/                        # Next.js application
│       ├── public/                 # Static assets, manifest.json, icons
│       └── src/
│           ├── app/                # App Router pages + API routes
│           │   ├── api/            # All backend API endpoints
│           │   ├── admin/          # Admin panel pages
│           │   ├── checkout/       # Checkout page
│           │   ├── dashboard/      # User dashboard
│           │   ├── login/          # Authentication pages
│           │   ├── orders/         # Order history
│           │   ├── payment/        # MFS payment instruction page
│           │   ├── products/       # Product listing
│           │   ├── tracking/       # Live delivery tracking
│           │   ├── layout.tsx      # Root layout (providers)
│           │   └── page.tsx        # Home page
│           ├── components/         # Reusable UI components
│           ├── context/            # React Context providers
│           ├── hooks/              # Custom React hooks
│           └── lib/                # Utilities (api client, auth, prisma)
├── packages/
│   ├── db/
│   │   └── prisma/
│   │       └── schema.prisma       # Prisma schema (single source of truth)
│   └── shared/
│       └── src/index.ts            # Shared types/utilities
├── backend/                        # Legacy microservices (not used in prod)
├── services/                       # Additional microservices
├── e2e/                            # Playwright end-to-end tests
├── infra/                          # Infrastructure config
├── scripts/                        # CLI scripts
├── vercel.json                     # Vercel deployment config
├── turbo.json                      # Turborepo pipeline config
└── .env.example                    # Environment variable template
```

---

## 4. Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or use a hosted service like Neon, Supabase)
- npm 10+

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/majba13/DeliVro.git
cd DeliVro

# 2. Install all workspace dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Fill in your values (see Section 5)

# 4. Generate Prisma client
cd packages/db
npx prisma generate
npx prisma db push      # creates tables in the database

# 5. Start the development server
cd ../..
npm run dev:web         # http://localhost:3000
```

### Available Scripts

| Script | Command | Description |
|---|---|---|
| Web dev | `npm run dev:web` | Start Next.js on port 3000 |
| Full dev | `npm run dev` | Start all services concurrently |
| Build | `npm run build` | Production build for all workspaces |
| Type check | `cd apps/web && npm run typecheck` | TypeScript type check |
| Lint | `cd apps/web && npm run lint` | ESLint check |
| DB migrate | `npx prisma db push` | Sync schema to database |
| DB studio | `npx prisma studio` | Visual database browser (port 5555) |

---

## 5. Environment Variables

Create a `.env` file in the project root (see `.env.example` for a template).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✅ | Secret for signing access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | ✅ | Secret for signing refresh tokens (min 32 chars) |
| `STRIPE_SECRET_KEY` | Payments | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Payments | Stripe webhook signing secret (`whsec_...`) |
| `NEXT_PUBLIC_API_URL` | Optional | External API gateway URL (leave blank for Vercel) |
| `FIREBASE_PROJECT_ID` | Optional | Firebase project for push notifications |
| `FIREBASE_CLIENT_EMAIL` | Optional | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Optional | Firebase service account private key |
| `OPENAI_API_KEY` | AI | OpenAI API key for AI assistant |

> **Security:** Never commit `.env` to version control. Rotate secrets if they are ever exposed.

---

## 6. Database Schema

All models are defined in `packages/db/prisma/schema.prisma`.

### Enums

```prisma
enum RoleType         { SUPER_ADMIN | ADMIN | SHOP_OWNER | DELIVERY_MAN | CUSTOMER }
enum ProductCategory  { FOOD | GROCERIES | STATIONARY | MEDICINE | WEAR | ELECTRONICS }
enum OrderStatus      { PENDING | CONFIRMED | PREPARING | OUT_FOR_DELIVERY | DELIVERED | CANCELLED }
enum PaymentMethod    { STRIPE | BKASH | NAGAD | ROCKET | BANK | COD }
enum PaymentStatus    { INITIATED | PENDING_VERIFICATION | VERIFIED | FAILED | REFUNDED }
enum DeliveryStatus   { ASSIGNED | PICKED_UP | ON_THE_WAY | DELIVERED }
```

### Entity Relationship Summary

```
User ──┬──< CartItem >── Product ──< Inventory
       ├──< Order (as customer)
       ├──< Order (as owner)
       ├──< Delivery (as deliveryMan)
       ├──< Notification
       ├──< AuditLog
       ├──< AdminPermission
       └──< AdminTransaction

Order ──┬──< OrderItem >── Product
        ├──  Payment
        ├──  Delivery ──< DeliveryLocation
        └──< DeliveryLocation

Payment ──── AdminTransaction (optional match for MFS)
```

### Models

#### `User`
| Field | Type | Notes |
|---|---|---|
| `id` | String (CUID) | Primary key |
| `name` | String? | Display name |
| `email` | String? (unique) | Login identifier |
| `phone` | String? (unique) | Login identifier for MFS users |
| `passwordHash` | String? | bcrypt hash |
| `googleId` | String? (unique) | Google OAuth |
| `role` | RoleType | Assigned role |
| `isActive` | Boolean | Soft-disable accounts |
| `isVerified` | Boolean | Email verification status |

#### `Product`
| Field | Type | Notes |
|---|---|---|
| `id` | String (CUID) | Primary key |
| `ownerId` | String | FK → User (ShopOwner) |
| `name` | String | Product name |
| `category` | ProductCategory | Enum category |
| `price` | Float | Price in BDT |
| `images` | String[] | Array of image URLs |
| `isActive` | Boolean | Soft-delete |
| `inventory` | Inventory? | Stock tracking (1:1) |

#### `CartItem`
| Field | Type | Notes |
|---|---|---|
| `id` | String (CUID) | Primary key |
| `userId` | String | FK → User |
| `productId` | String | FK → Product |
| `quantity` | Int | Quantity in cart |
| `price` | Float | Snapshot price at add time |
| Unique | `[userId, productId]` | One entry per product per user |

#### `Order`
| Field | Type | Notes |
|---|---|---|
| `id` | String (CUID) | Primary key |
| `customerId` | String | FK → User |
| `ownerId` | String | FK → User (ShopOwner) |
| `status` | OrderStatus | Current order status |
| `subtotal` | Float | Items total |
| `deliveryFee` | Float | Fixed ৳50 |
| `total` | Float | subtotal + deliveryFee |
| `deliveryAddress` | Json? | `{street, city, zip, country}` |

#### `Payment`
| Field | Type | Notes |
|---|---|---|
| `id` | String (CUID) | Primary key |
| `orderId` | String (unique) | FK → Order |
| `method` | PaymentMethod | Payment method used |
| `status` | PaymentStatus | Verification status |
| `amount` | Float | Amount in BDT |
| `transactionId` | String? | MFS transaction ID from customer |
| `stripePaymentId` | String? | Stripe PaymentIntent ID |
| `mobileReference` | String? | Sender's mobile number |
| `verificationLog` | Json? | Auto-match log |

#### `AdminTransaction` (MFS verification)
| Field | Type | Notes |
|---|---|---|
| `transactionId` | String | TXN ID from bank SMS |
| `method` | PaymentMethod | BKASH / NAGAD / ROCKET |
| `amount` | Float | Amount received |
| `senderNumber` | String? | Customer's mobile number |
| `receivedAt` | DateTime | When admin received the money |
| `rawMessage` | String? | Original SMS text |
| `isMatched` | Boolean | Auto-matched to a Payment? |
| `matchedPaymentId` | String? (unique) | FK → Payment if matched |

#### `Delivery`
| Field | Type | Notes |
|---|---|---|
| `orderId` | String (unique) | FK → Order |
| `deliveryManId` | String | FK → User (DeliveryMan) |
| `status` | DeliveryStatus | Delivery progress |
| `currentLat/Lng` | Float? | Last known GPS position |
| `etaMinutes` | Int? | Estimated minutes remaining |

#### `DeliveryLocation` (GPS breadcrumbs)
| Field | Type | Notes |
|---|---|---|
| `deliveryManId` | String | FK → User |
| `orderId` | String? | FK → Order (nullable) |
| `latitude` | Float | GPS latitude |
| `longitude` | Float | GPS longitude |
| `speed` | Float? | km/h |
| `heading` | Float? | Degrees 0–359 |
| `accuracy` | Float? | Metres |

---

## 7. API Reference

All routes are Next.js API Routes served from `/api/`. Authentication is via `Authorization: Bearer <accessToken>` header.

### Authentication

#### `POST /api/auth/login`
Authenticate user and receive JWT tokens.

**Request:**
```json
{ "email": "user@example.com", "password": "secret" }
```
**Response `200`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": "...", "name": "...", "email": "...", "role": "Customer" }
}
```

#### `POST /api/auth/register`
**Request:**
```json
{ "name": "Alice", "email": "alice@example.com", "password": "secret123", "role": "Customer" }
```
**Response `201`:** Same shape as login.

#### `GET /api/auth/me`
Returns the authenticated user's profile. Requires valid access token.

**Response `200`:**
```json
{ "id": "...", "name": "Alice", "email": "alice@example.com", "role": "Customer" }
```

#### `POST /api/auth/token/refresh`
**Request:**
```json
{ "refreshToken": "eyJ..." }
```
**Response `200`:**
```json
{ "accessToken": "eyJ..." }
```

---

### Cart

#### `GET /api/cart`
Returns the authenticated user's cart with product details.

**Response `200`:**
```json
{
  "items": [
    {
      "id": "cuid",
      "productId": "...",
      "quantity": 2,
      "price": 150.00,
      "product": { "id": "...", "name": "Rice 5kg", "price": 150.00, "images": ["..."] }
    }
  ],
  "totalPrice": 300.00
}
```

#### `POST /api/cart`
Add a product to cart (or increment quantity if already present).

**Request:**
```json
{ "productId": "cuid", "quantity": 1 }
```
**Response `201`:** `{ "item": { ... } }`

#### `PATCH /api/cart/[id]`
Update quantity of a specific cart item.

**Request:** `{ "quantity": 3 }`

#### `DELETE /api/cart/[id]`
Remove a specific item. Returns `204 No Content`.

#### `DELETE /api/cart`
Clear the entire cart. Returns `204 No Content`.

---

### Products

#### `GET /api/products`
List active products with optional filtering.

**Query params:** `?category=FOOD&search=rice&page=1&limit=20`

**Response `200`:**
```json
{
  "products": [
    {
      "id": "...", "name": "Rice 5kg", "price": 150.00,
      "category": "GROCERIES", "images": ["..."],
      "inventory": { "stock": 50 }
    }
  ],
  "total": 132,
  "page": 1,
  "limit": 20
}
```

---

### Orders

#### `POST /api/orders`
Place a new order from the authenticated user's database cart.

**Request:**
```json
{
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Dhaka",
    "zip": "1200",
    "country": "Bangladesh"
  }
}
```
**Response `201`:**
```json
{ "order": { "id": "...", "total": 350.00, "status": "PENDING" } }
```

#### `GET /api/orders`
List orders (scope depends on role):
- **Customer:** own orders only
- **ShopOwner:** orders for their products
- **Admin/SuperAdmin:** all orders

**Query:** `?status=PENDING&page=1&limit=20`

#### `GET /api/orders/[id]`
Get a single order with all items, payment and delivery info.

#### `PATCH /api/orders/[id]`
Update order status (Admin / ShopOwner).

---

### Payments

#### `POST /api/payments`
Initiate a payment record after placing an order.

**Request:**
```json
{ "orderId": "...", "method": "BKASH", "amount": 350.00 }
```
**Response `201`:** `{ "payment": { "id": "...", "status": "INITIATED" } }`

#### `GET /api/payments/[id]`
Get payment status and verification details.

#### `POST /api/payments/[id]/submit`
Customer submits their MFS transaction ID for verification.

**Request:**
```json
{ "transactionId": "TXN12345", "mobileReference": "01XXXXXXXXX" }
```
The system attempts auto-match with admin-recorded transactions.

#### `POST /api/payments/stripe/webhook`
Stripe webhook receiver. Validates `Stripe-Signature` header and auto-verifies payments on `payment_intent.succeeded`.

---

### Delivery

#### `GET /api/delivery/[orderId]`
Get delivery status and current GPS position.

**Response `200`:**
```json
{
  "delivery": {
    "status": "ON_THE_WAY",
    "currentLat": 23.8103,
    "currentLng": 90.4125,
    "etaMinutes": 12,
    "deliveryMan": { "name": "Rahim", "phone": "01XXXXXXXXX" }
  }
}
```

#### `POST /api/delivery/[orderId]/ping`
GPS ping from delivery man app.

**Request:**
```json
{ "lat": 23.8103, "lng": 90.4125, "speed": 25.5, "heading": 180, "accuracy": 5.0 }
```

---

### Admin

#### `GET /api/admin/users`
List all users (Admin+). Query: `?role=CUSTOMER&search=alice&page=1`

#### `PATCH /api/admin/users/[id]`
Update user details or toggle `isActive`.

#### `DELETE /api/admin/users/[id]`
Delete a user account.

#### `GET /api/admin/permissions`
List all permission records.

#### `POST /api/admin/permissions`
Assign a permission key to a user.

**Request:**
```json
{ "userId": "...", "key": "payments.manage", "canRead": true, "canWrite": true }
```

#### `GET /api/admin/transactions`
List admin-recorded MFS transactions.

#### `POST /api/admin/transactions`
Record a received MFS transaction (triggers auto-match).

**Request:**
```json
{
  "method": "BKASH",
  "transactionId": "TXN12345",
  "amount": 350.00,
  "senderNumber": "01XXXXXXXXX",
  "receivedAt": "2026-03-07T10:00:00Z",
  "rawMessage": "You have received BDT 350 from 01XXXXXXXXX..."
}
```

---

### Notifications

#### `GET /api/notifications`
List notifications for the authenticated user.

#### `PATCH /api/notifications/[id]`
Mark notification as read: `{ "isRead": true }`

#### `PATCH /api/notifications/read-all`
Mark all notifications as read.

#### `DELETE /api/notifications/[id]`
Delete a notification.

---

### AI

#### `POST /api/ai/chat`
Send a message to the AI assistant.

**Request:** `{ "message": "What products do you have?", "history": [] }`

---

## 8. Pages & Routing

| URL | Component | Auth Required | Description |
|---|---|---|---|
| `/` | `page.tsx` | No | Home page with product carousel & categories |
| `/products` | `products/page.tsx` | No | Full product listing with search and filter |
| `/category/[slug]` | `category/[slug]/page.tsx` | No | Products filtered by category |
| `/login` | `login/page.tsx` | No | Sign in (supports `?callbackUrl=`) |
| `/register` | `register/page.tsx` | No | Sign up (supports `?callbackUrl=`) |
| `/forgot-password` | `forgot-password/page.tsx` | No | Password reset request |
| `/dashboard` | `dashboard/page.tsx` | ✅ | User profile and quick-actions |
| `/checkout` | `checkout/page.tsx` | ✅ | Order confirmation, address, payment method |
| `/payment/[orderId]` | `payment/[orderId]/page.tsx` | ✅ | MFS payment instructions (bKash/Nagad/Rocket) |
| `/orders` | `orders/page.tsx` | ✅ | Order history |
| `/tracking` | `tracking/page.tsx` | ✅ | Live delivery map (Leaflet) |
| `/admin` | `admin/page.tsx` | Admin | User management dashboard |
| `/admin/payments` | `admin/payments/page.tsx` | Admin | Payment verification panel |
| `/admin/deliveries` | `admin/deliveries/page.tsx` | Admin | Live delivery overview |
| `/admin/permissions/[id]` | `admin/permissions/[id]/page.tsx` | Admin | User permission editor |
| `/terms` | `terms/page.tsx` | No | Terms of Service |
| `/privacy` | `privacy/page.tsx` | No | Privacy Policy |
| `/refund` | `refund/page.tsx` | No | Refund Policy |

---

## 9. Frontend Architecture

### Context Providers

All three providers are mounted in the root `layout.tsx` and available application-wide.

```
<AuthProvider>          ← user, login(), logout(), loading
  <CartProvider>        ← items, addItem(), removeItem(), cartLoading
    <ToastProvider>     ← toast("message", "success"|"error"|"warning"|"info")
      {children}
    </ToastProvider>
  </CartProvider>
</AuthProvider>
```

### API Client (`src/lib/api.ts`)

A thin typed wrapper around `fetch` that:
- Automatically attaches `Authorization: Bearer <token>` from `localStorage`
- On `401`: attempts token refresh once using the stored refresh token
- On refresh failure: clears tokens and redirects to `/login`
- Throws `ApiError` with `.status` and `.message` for all non-OK responses

```typescript
api.get<T>("/api/resource")
api.post<T>("/api/resource", body)
api.patch<T>("/api/resource/id", body)
api.delete("/api/resource/id")
```

### Tokens (`api.ts`)

```typescript
Tokens.access        // read access token from localStorage
Tokens.refresh       // read refresh token from localStorage
Tokens.set(a, r)     // store both tokens
Tokens.clear()       // logout — remove both tokens
```
Keys: `dvr_access`, `dvr_refresh`

### Auth Helpers (`src/lib/auth-helpers.ts`)

Server-side utilities for API routes:
- `requireAuth(req)` — verifies `Authorization` header, returns `{ sub, userId, role, email }`
- `isAuthError(result)` — type guard to check if `requireAuth` returned an error response

### Components

| Component | Description |
|---|---|
| `Navbar` | Top navigation bar; shows cart count, user avatar, login/logout |
| `CartDrawer` | Slide-in cart panel; shows items, quantities, checkout link |
| `ProductCarousel` | Featured products on home page; "Add to Cart" button |
| `CategorySlider` | Horizontal scrollable category navigation |
| `DeliveryMap` | Leaflet map component for live tracking page |
| `AIAssistant` | Floating chat button; opens AI conversation panel |
| `AnalyticsCards` | Revenue/orders/users stat cards for admin dashboard |
| `Footer` | Site footer with links |
| `PWARegister` | Registers the service worker for PWA functionality |

### Custom Hooks

| Hook | File | Description |
|---|---|---|
| `useAuth()` | `AuthContext` | Get `user`, `loading`, `login()`, `logout()`, `register()` |
| `useCart()` | `CartContext` | Get `items`, `addItem()`, `cartLoading`, etc. |
| `useToast()` | `ToastContext` | Get `toast(message, type)` function |
| `useTrackingSocket()` | `hooks/useTrackingSocket.ts` | Real-time delivery position updates |

---

## 10. Authentication System

### Token Strategy

| Token | Expiry | Storage | Use |
|---|---|---|---|
| Access Token | 1 hour | `localStorage` (`dvr_access`) | API authorization |
| Refresh Token | 7 days | `localStorage` (`dvr_refresh`) | Obtain new access token |

### JWT Payload

```json
{ "sub": "user-cuid", "role": "CUSTOMER", "iat": 1234567890, "exp": 1234567890 }
```

> **Note:** `role` in the JWT uses the raw enum value (`CUSTOMER`). User objects returned from `/api/auth/me` use the display format (`Customer`).

### Flow

```
User enters credentials
        ↓
POST /api/auth/login
        ↓
bcrypt.compare(password, hash)
        ↓
Sign accessToken (1h) + refreshToken (7d)
        ↓
Store in localStorage (dvr_access, dvr_refresh)
        ↓
AuthContext fetches /api/auth/me → sets user state
        ↓
CartContext sees user → fetches DB cart
```

### Callbacks

Login and register pages support a `?callbackUrl=` query parameter. After successful authentication, the user is redirected to that URL instead of `/dashboard`. Checkout uses this to redirect users back after login:

```
/login?callbackUrl=/checkout
```

---

## 11. Cart System

### Architecture

The cart uses a **dual-layer strategy**:

| User State | Storage | Sync |
|---|---|---|
| Guest (not logged in) | `localStorage` key `dvr_cart` | Local only |
| Authenticated | Database (`CartItem` table) | Via `/api/cart` |

### Guest → User Transition (Login)

When a user logs in with items in their guest cart:
1. Each guest item is posted to `POST /api/cart` via `Promise.allSettled`
2. Guest `localStorage` is cleared
3. The full DB cart is fetched as the authoritative source

### Optimistic UI

All mutations (add, remove, updateQty) update the React state immediately. Server sync happens in the background. On failure, the state is automatically reverted.

### `CartContext` API

```typescript
const {
  items,        // CartItem[] — current cart items
  count,        // number — total quantity across all items
  total,        // number — BDT subtotal
  open,         // boolean — is drawer open
  cartLoading,  // boolean — true while hydrating from DB/localStorage
  setOpen,      // (v: boolean) => void
  addItem,      // (item: { id, name, price, imageUrl? }) => void
  removeItem,   // (id: string) => void — id is productId
  updateQty,    // (id: string, qty: number) => void
  clearCart,    // () => void — clears state + DB/localStorage
} = useCart();
```

---

## 12. Payment System

### Supported Methods

| Method | Type | Flow |
|---|---|---|
| Stripe | Card | Redirect-to-stripe → webhook → auto-verify |
| bKash | MFS | Manual send → customer submits TXN ID → admin matches |
| Nagad | MFS | Same as bKash |
| Rocket | MFS | Same as bKash |
| Bank Transfer | Bank | Manual transfer → admin verifies |
| COD | Cash | No upfront payment → mark verified on delivery |

### MFS Payment Flow

```
Customer places order
        ↓
POST /api/payments  →  creates Payment record (INITIATED)
        ↓
Redirect to /payment/[orderId]?method=BKASH
        ↓
Page shows merchant number and transaction instructions
        ↓
Customer sends money via bKash app
        ↓
POST /api/payments/[id]/submit  →  { transactionId, mobileReference }
        ↓
System attempts auto-match with AdminTransaction records
        ↓
If matched → status = VERIFIED
If no match → status = PENDING_VERIFICATION (admin reviews)
        ↓
Admin panel: POST /api/admin/transactions  →  records received SMS
        ↓
Triggers second auto-match pass
```

### Stripe Flow

```
POST /api/payments  →  creates Stripe PaymentIntent  →  returns clientSecret
        ↓
Client confirms payment with Stripe.js
        ↓
Stripe sends POST /api/payments/stripe/webhook
        ↓
payment_intent.succeeded  →  Payment status = VERIFIED
```

---

## 13. Order Flow

```
1. BROWSE   — User adds products to cart (localStorage or DB)
2. CHECKOUT — User selects address and payment method
3. ORDER    — POST /api/orders:
               - Reads DB cart (prisma.cartItem)
               - Validates all products are still active
               - Creates Order + OrderItems
               - Decrements inventory
               - Clears the user's cart
4. PAYMENT  — POST /api/payments: creates payment record
5. METHOD   — MFS: redirect to /payment/[orderId]
               Stripe: Stripe.js payment
               COD: order confirmed immediately
6. VERIFY   — Payment auto-verified or admin-verified
7. FULFIL   — ShopOwner updates order to CONFIRMED → PREPARING
8. DELIVER  — Admin assigns DeliveryMan → creates Delivery record
9. TRACK    — Customer tracks on /tracking with live GPS map
10. DONE    — Delivery status DELIVERED → Order DELIVERED
```

### Order Statuses

```
PENDING → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED
                                                     CANCELLED (any time)
```

---

## 14. Delivery & GPS Tracking

### Components

- **`DeliveryMap`** — Leaflet map rendering marker at the delivery man's current lat/lng
- **`useTrackingSocket`** — Hook that polls or streams GPS updates for a given order
- **`/api/delivery/[orderId]`** — Returns current position + ETA
- **`/api/delivery/[orderId]/ping`** — Receives GPS updates from the delivery man's device

### GPS Update Flow

```
Delivery Man app / browser
        ↓
POST /api/delivery/[orderId]/ping  { lat, lng, speed, heading, accuracy }
        ↓
Updates Delivery.currentLat/Lng + etaMinutes
Creates DeliveryLocation record (breadcrumb trail)
        ↓
Customer's tracking page polls GET /api/delivery/[orderId]
        ↓
DeliveryMap re-renders marker at new position
```

---

## 15. Admin Panel

### Pages

| Page | URL | Description |
|---|---|---|
| Dashboard | `/admin` | User list, stats, quick actions |
| Payments | `/admin/payments` | MFS payment verification; dual-view (customer submissions + admin transactions) |
| Deliveries | `/admin/deliveries` | All active deliveries with live map |
| Permissions | `/admin/permissions/[id]` | Per-user permission key editor |

### Admin Transaction Recording

Admins receive MFS payment notifications via SMS or mobile wallet app. They record them in the admin payments panel:
- **Method:** BKASH / NAGAD / ROCKET
- **Transaction ID:** From the SMS
- **Amount:** BDT amount
- **Sender Number:** Customer's mobile
- **Received At:** Timestamp
- **Raw Message:** Original SMS (optional)

The system then automatically cross-references with pending `Payment` records and marks them `VERIFIED` if a match is found.

---

## 16. Notifications

Notifications are stored in the `Notification` model and delivered to users via the `/api/notifications` API.

**Channels** (stored in `channel` field):
- `order` — Order status changes
- `payment` — Payment verification updates
- `delivery` — Delivery status updates
- `promo` — Promotional messages
- `system` — Platform announcements

**Reading notifications:**
```typescript
// Mark single as read
api.patch(`/api/notifications/${id}`, { isRead: true })

// Mark all as read
api.patch("/api/notifications/read-all")
```

---

## 17. AI Assistant

The floating AI button (`AIAssistant` component) opens an in-app chat panel. Messages are sent to `POST /api/ai/chat`.

**Use cases:**
- Product search and recommendations
- Order status questions
- General customer support

Configure `OPENAI_API_KEY` in `.env` to enable.

---

## 18. PWA Support

DeliVro is a Progressive Web App. Users can install it to their home screen on mobile.

**Files:**
- `public/manifest.json` — App name, icons, theme color (#4f46e5)
- `apps/web/src/components/PWARegister.tsx` — Registers the service worker

**Offline support:** The service worker caches static assets and API responses where feasible.

---

## 19. Deployment

### Vercel (Production)

The project deploys automatically to Vercel on every push to `main`.

**Configuration (`vercel.json`):**
```json
{
  "buildCommand": "cd apps/web && npm run build",
  "outputDirectory": "apps/web/.next"
}
```

**Setup steps:**
1. Import the GitHub repo into Vercel
2. Set all environment variables in the Vercel dashboard (see Section 5)
3. Ensure `DATABASE_URL` points to a production PostgreSQL instance (e.g. Neon, Supabase, Railway)
4. Push to `main` — Vercel builds and deploys automatically

**Database migrations on deploy:**
```bash
# Run from local or CI before first deploy:
cd packages/db && npx prisma db push
```

### Local Docker (optional)

```bash
docker-compose up   # starts PostgreSQL + the Next.js app
```

---

## 20. Role Permissions

### Built-in Roles

| Role | Display | Capabilities |
|---|---|---|
| `SUPER_ADMIN` | SuperAdmin | Full system access; manage admins |
| `ADMIN` | Admin | User management, payment verification, delivery assignment |
| `SHOP_OWNER` | ShopOwner | Create/edit own products; view own orders |
| `DELIVERY_MAN` | DeliveryMan | View assigned deliveries; send GPS pings |
| `CUSTOMER` | Customer | Browse products, place orders, track deliveries |

### Fine-grained Permissions (`AdminPermission`)

Beyond built-in roles, admins can be granted or denied specific permission keys:

| Key | Description |
|---|---|
| `payments.manage` | Verify and record MFS payments |
| `users.manage` | Create, edit and deactivate users |
| `deliveries.manage` | Assign delivery men to orders |
| `products.manage` | Edit any shop's products |
| `analytics.view` | View platform revenue analytics |

These are checked server-side in the relevant API routes.

---

## Appendix — Quick Reference

### Add a product to cart (frontend)

```typescript
const { addItem } = useCart();
addItem({ id: product.id, name: product.name, price: product.price, imageUrl: product.images[0] });
```

### Check if user is admin (frontend)

```typescript
const { user } = useAuth();
const isAdmin = user?.role === "Admin" || user?.role === "SuperAdmin";
```

### Protect an API route (backend)

```typescript
import { requireAuth, isAuthError } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth; // returns 401 response automatically

  // auth.sub      — user ID
  // auth.role     — raw role (e.g. "ADMIN")
  // auth.email    — user email
}
```

### Show a toast notification

```typescript
const { toast } = useToast();
toast("Order placed successfully! 🎉", "success");
toast("Payment failed. Try again.", "error");
toast("Please sign in to continue.", "warning");
```

---

*Generated: March 2026 — DeliVro v1.0.0*
