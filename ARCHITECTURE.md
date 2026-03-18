# DeliVro Architecture

Authoritative architecture and folder-structure reference for the current repository.

## 1. Platform Summary

DeliVro is a multi-vendor delivery and commerce platform built as an npm-workspaces monorepo. It serves five primary personas:

- Customer
- Shop Owner
- Delivery Man
- Admin
- Super Admin

The platform supports:

- Marketplace categories: Food, Groceries, Medicine, Emergency, Wear, Stationary, Electronics
- Multi-vendor shops with approval flow
- JWT authentication with role-based access control
- Product catalog, cart, checkout, payments, and orders
- Real-time delivery tracking through WebSocket and SSE fallback
- In-app notifications and AI-assisted shopping experiences
- Multiple deployment targets: Vercel, Docker Compose, Kubernetes

## 2. Architecture Style

This repository uses a hybrid architecture:

1. Next.js web app in apps/web provides the primary customer-facing frontend.
2. Next.js API routes inside the web app handle application-facing server logic for the deployed web surface.
3. Fastify microservices inside services/* provide separated backend services suitable for local orchestration, container deployment, and future scale-out.
4. The API gateway in services/api-gateway fronts the Fastify services when running the service-oriented topology.
5. Prisma with MongoDB is the shared persistence layer and schema source of truth.

This means the repo supports two valid execution modes:

- Web-centric mode: run the Next.js app and use its app/api routes.
- Service-oriented mode: run the API gateway plus Fastify services behind it.

## 3. High-Level System Diagram

```text
Browser / PWA
   |
   v
Next.js Web App (apps/web)
   |-- App Router pages
   |-- Client components
   |-- Context providers
   |-- app/api routes
   |
   +--> Prisma Client --> MongoDB
   |
   +--> External services
         |-- Stripe
         |-- SMTP / email provider
         |-- Firebase RTDB fallback
         |-- Cloud deployment targets

Optional service topology
   |
   v
API Gateway (services/api-gateway)
   |-- Auth Service
   |-- Product Service
   |-- Order Service
   |-- Payment Service
   |-- Delivery Service
   |-- AI Service
   |-- Notification Service
   |
   +--> Prisma Client --> MongoDB
```

## 4. Repository Folder Structure

```text
DeliVro/
├── apps/
│   └── web/
│       ├── public/
│       │   ├── manifest.json
│       │   └── sw.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── (public)/
│       │   │   ├── admin/
│       │   │   ├── api/
│       │   │   ├── category/
│       │   │   ├── checkout/
│       │   │   ├── dashboard/
│       │   │   ├── forgot-password/
│       │   │   ├── login/
│       │   │   ├── orders/
│       │   │   ├── payment/
│       │   │   ├── privacy/
│       │   │   ├── products/
│       │   │   ├── refund/
│       │   │   ├── register/
│       │   │   ├── reset-password/
│       │   │   ├── shops/
│       │   │   ├── terms/
│       │   │   ├── tracking/
│       │   │   ├── error.tsx
│       │   │   ├── globals.css
│       │   │   ├── layout.tsx
│       │   │   ├── not-found.tsx
│       │   │   └── page.tsx
│       │   ├── components/
│       │   ├── context/
│       │   ├── hooks/
│       │   └── lib/
│       ├── Dockerfile
│       ├── next.config.ts
│       ├── package.json
│       ├── tailwind.config.ts
│       └── tsconfig.json
├── backend/
│   └── logs/
├── e2e/
│   ├── auth.spec.ts
│   ├── cart.spec.ts
│   ├── home.spec.ts
│   ├── misc.spec.ts
│   ├── products.spec.ts
│   └── tsconfig.json
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   └── docker-compose.prod.yml
│   └── k8s/
│       └── platform.yaml
├── packages/
│   ├── db/
│   │   ├── package.json
│   │   └── prisma/
│   │       └── schema.prisma
│   └── shared/
│       ├── package.json
│       └── src/
│           └── index.ts
├── scripts/
│   ├── deploy.ps1
│   └── vercel-env-push.ps1
├── services/
│   ├── ai-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/server.ts
│   ├── api-gateway/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/server.ts
│   ├── auth-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/server.ts
│   ├── delivery-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/server.ts
│   ├── notification-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/server.ts
│   ├── order-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/server.ts
│   ├── payment-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/server.ts
│   └── product-service/
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       └── src/server.ts
├── DOCUMENTATION.md
├── ARCHITECTURE.md
├── package.json
├── playwright.config.ts
├── README.md
├── tsconfig.base.json
├── tsconfig.json
└── vercel.json
```

## 5. Responsibility by Top-Level Folder

### apps/web

Primary Next.js application.

Contains:

- App Router pages and layouts
- Next.js API routes under src/app/api
- Shared frontend UI components
- React context providers for auth, cart, and toast state
- Hooks for live tracking and client behavior
- Internal libs such as API client, auth helpers, and Prisma singleton

### services

Container-friendly Fastify microservices.

Each service owns a business capability:

- api-gateway: entrypoint, proxying, gateway-level middleware, service routing
- auth-service: registration, login, token lifecycle, Google OAuth
- product-service: product CRUD, catalog filtering, inventory-related reads
- order-service: order placement and transactional workflows
- payment-service: Stripe and manual payment handling
- delivery-service: assignment, status changes, location streaming
- ai-service: recommendations, search suggestions, analytics-oriented responses
- notification-service: notification creation and email dispatch

### packages/db

Shared database package.

Contains:

- Prisma schema
- Prisma client generation entrypoint
- Canonical data model for all services and API routes

### packages/shared

Cross-workspace contracts.

Contains:

- Shared validation schemas
- Shared enums and typed payload helpers
- Common structures reused across app and services

### infra

Operational deployment assets.

Contains:

- Docker Compose for local and production-like orchestration
- Kubernetes manifest for cluster deployment

### e2e

Playwright end-to-end tests covering key user journeys.

### scripts

Operational PowerShell scripts for deployment and environment sync.

## 6. Web App Internal Structure

### src/app

Route-level concerns.

- page.tsx: landing page
- layout.tsx: global providers and shell wiring
- error.tsx and not-found.tsx: route error boundaries
- admin: admin surfaces
- checkout, orders, payment, tracking: transaction and fulfillment journeys
- login, register, forgot-password, reset-password: auth lifecycle pages
- shops: public shop discovery plus shop-owner management
- api: server endpoints exposed from the Next.js app

### src/components

Reusable presentational and interactive building blocks.

Current notable components:

- Navbar
- Footer
- CartDrawer
- CategorySlider
- ProductCarousel
- DeliveryMap
- AnalyticsCards
- AIAssistant
- PWARegister

### src/context

Global state and user-session orchestration.

Current contexts:

- AuthContext: user state, login, register, logout, token hydration
- CartContext: local plus server cart synchronization
- ToastContext: lightweight notification system

### src/hooks

Focused client hooks.

Current notable hook:

- useTrackingSocket: WebSocket to SSE to Firebase fallback chain for live tracking

### src/lib

Application-level utilities.

Current notable modules:

- api.ts: typed API client with refresh-token handling
- auth-helpers.ts: auth and role helper logic for server routes
- prisma.ts: Prisma singleton for Next.js server runtime

## 7. API Layering

DeliVro currently has two backend access layers in the same repo.

### A. Next.js API Routes

Located in apps/web/src/app/api.

These routes support the web application directly and currently cover:

- auth
- admin
- products
- shops
- cart
- orders
- payments
- delivery
- notifications
- ai

This mode is practical for rapid iteration and Vercel-friendly deployment of the web app.

### B. Fastify Services

Located in services/*/src/server.ts.

These services are appropriate when the platform is deployed as a distributed backend with separate scaling, routing, and container boundaries.

## 8. Service Responsibility Map

### API Gateway

Responsibilities:

- Front door for service topology
- Route proxying to downstream services
- Shared middleware such as security, CSRF, and rate-limiting
- Centralized service URL configuration

### Auth Service

Responsibilities:

- Register and login
- Password verification and hashing
- Access and refresh token issuance
- OAuth integration hooks
- User identity bootstrap and role handling

### Product Service

Responsibilities:

- Product catalog reads and writes
- Product filtering and search-oriented queries
- Inventory-aware product retrieval
- Shop-linked product ownership

### Order Service

Responsibilities:

- Order creation
- Inventory reservation coordination
- Owner/customer linkage
- Order status transitions

### Payment Service

Responsibilities:

- Stripe payment intent lifecycle
- Cash on delivery and manual transfer flows
- Verification status tracking
- Payment record updates and reconciliation support

### Delivery Service

Responsibilities:

- Delivery assignment lifecycle
- Status updates from pickup to delivered
- Real-time location feeds
- Fallback streaming channels for tracking reliability

### AI Service

Responsibilities:

- Recommendations by category or user behavior
- Predictive search support
- Analytics and assistant responses

### Notification Service

Responsibilities:

- In-app notification creation
- Email sending hooks
- Read/unread state changes

## 9. Data Architecture

Database access is centralized through Prisma in packages/db/prisma/schema.prisma.

### Core enums

- RoleType
- ProductCategory
- OrderStatus
- PaymentMethod
- PaymentStatus
- DeliveryStatus

### Core models

- User
- AdminPermission
- Shop
- Review
- Product
- Inventory
- CartItem
- Order
- OrderItem
- Payment
- Delivery
- Notification
- AuditLog
- DeliveryLocation
- AdminTransaction

### Important relationships

- A User can own many shops.
- A Shop can contain many products.
- A Product may belong to a shop and can have reviews.
- A Customer creates orders containing order items for products.
- An Order has one payment and may have one delivery record.
- Delivery locations stream updates for an order and delivery man.
- Admin permissions and audit logs model privileged operations.

## 10. Request and Data Flow

### Customer browsing flow

1. Browser requests a page from the Next.js app.
2. The page fetches data from Next.js API routes or a service-backed endpoint.
3. The backend layer reads from Prisma and MongoDB.
4. The page renders catalog, shop, or order data.

### Checkout flow

1. Customer adds products to the cart.
2. CartContext maintains local state and syncs to the server when authenticated.
3. Checkout submits an order.
4. Order and payment records are created.
5. Depending on payment method, the user is redirected into Stripe or manual-payment instructions.
6. Delivery status becomes trackable after assignment.

### Tracking flow

1. Delivery service emits location/status updates.
2. Client hook tries WebSocket first.
3. If WebSocket is unavailable, it falls back to SSE.
4. Optional Firebase RTDB support provides another mirror channel.
5. UI map and order timeline update in near real time.

## 11. Security and Access Control

Security model includes:

- JWT access and refresh tokens
- Role-based authorization across customer, shop owner, delivery, admin, and super admin roles
- Password hashing with bcryptjs
- Request validation via Zod
- Gateway-level hardening in service topology
- Admin permission records for scoped administrative control
- Audit-oriented models for sensitive activity

## 12. Deployment Topologies

### A. Frontend-first deployment

Recommended when optimizing for fast product iteration.

- Deploy apps/web to Vercel
- Use app/api for the web-facing backend surface
- Connect directly to MongoDB and external services

### B. Full service deployment

Recommended when isolating backend concerns operationally.

- Deploy the web app separately
- Deploy api-gateway and each service independently
- Use Docker Compose for local orchestration
- Use Kubernetes manifests for cluster rollout

## 13. Local Development Commands

From the repository root:

```bash
npm install
npm run db:generate
npm run db:push
npm run dev:web
```

For the service topology:

```bash
npm run dev:api
```

For everything together:

```bash
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run test:e2e
```

## 14. Recommended Ownership Boundaries

If the platform grows, use these ownership seams:

- Web Experience Team: apps/web, shared UI, client flows
- Commerce Team: products, shops, cart, orders
- Fulfillment Team: delivery, tracking, driver tooling
- Payments Team: payment-service, reconciliation, refund flows
- Platform Team: api-gateway, infra, deployment, observability, CI/CD

## 15. Current Architectural Notes

- The repository already contains both monolithic web-side APIs and service-separated backends. Keep that duality explicit in future changes instead of mixing responsibilities implicitly.
- Prisma schema changes should always start in packages/db/prisma/schema.prisma.
- Shared payload and validation contracts should move through packages/shared whenever multiple runtimes need the same structure.
- New business features should decide early whether they belong in app/api, a dedicated Fastify service, or both.
