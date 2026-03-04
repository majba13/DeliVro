# DeliVro Enterprise Platform

Production-grade monorepo for a multi-user e-commerce + delivery system.

## Stack
- Frontend: Next.js 15, TypeScript, Tailwind CSS, Framer Motion
- Backend: Fastify microservices, API Gateway
- Data: PostgreSQL + Prisma, Redis cache
- Realtime: WebSocket tracking service
- Payments: Stripe + manual mobile banking flow
- AI: recommendation + predictive search services

## Services
- `services/api-gateway`
- `services/auth-service`
- `services/product-service`
- `services/order-service`
- `services/payment-service`
- `services/delivery-service`
- `services/ai-service`
- `services/notification-service`

## Architecture
- API Gateway handles authentication, rate-limiting, security headers, CSRF token issue, and route proxying.
- Auth service supports email/phone registration, OTP verification, Google OAuth entry, JWT access/refresh, and SuperAdmin permission assignment.
- Product, Order, Payment, Delivery services are isolated for scaling and operational ownership.
- AI service provides recommendations, predictive search, behavior analytics, and smart category suggestions.
- Notification service supports in-app records and SMTP email dispatch.
- Prisma schema models users, roles/permissions, products, categories, inventory, orders, payments, delivery, notifications, and audit logs.

## Quick start
1. Copy `.env.example` to `.env` and fill real values.
2. Start infra: `docker compose -f infra/docker/docker-compose.yml up -d`
3. Install deps: `npm install`
4. Generate Prisma client: `npm run db:generate`
5. Apply migrations: `npm run db:migrate`
6. Start dev: `npm run dev`

## Production via Docker Compose
1. Ensure `.env` is configured with production secrets.
2. Build and run all services:
	- `docker compose -f infra/docker/docker-compose.prod.yml build`
	- `docker compose -f infra/docker/docker-compose.prod.yml up -d`
3. Exposed entry points:
	- Web: `http://localhost:3000`
	- Gateway API: `http://localhost:4000`

## Deployment
- Frontend: Vercel (use `apps/web` project root)
- Backend: Fly.io / Render / AWS ECS per service
- Database: managed PostgreSQL
- Cache: managed Redis
- Secrets: cloud secret manager

## Vercel + Cloud Deployment
1. Deploy `apps/web` to Vercel and set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`.
2. Deploy each service (`services/*`) as independent containerized app.
3. Attach managed PostgreSQL and Redis, then set `DATABASE_URL` and `REDIS_URL` in every service.
4. Configure gateway service URLs (`AUTH_SERVICE_URL`, `PRODUCT_SERVICE_URL`, etc.) to internal network DNS.
5. Configure Stripe webhook endpoint to payment service and set `STRIPE_WEBHOOK_SECRET`.
6. Enforce TLS and WAF at load balancer/CDN level.

## Stripe Webhook Setup
- Endpoint URL (through gateway): `https://api.example.com/api/payments/stripe/webhook`
- Events to subscribe:
	- `payment_intent.succeeded`
	- `payment_intent.payment_failed`
- Set signing secret into `STRIPE_WEBHOOK_SECRET`.
- Webhook handler updates payment status idempotently in `Payment` table.

## Kubernetes Deployment
1. Build and push all images to your registry (`ghcr.io` by default in CI).
2. Edit image names and hosts in `infra/k8s/platform.yaml`.
3. Apply manifests:
	 - `kubectl apply -f infra/k8s/platform.yaml`
4. Verify rollout:
	 - `kubectl get pods -n delivro`
	 - `kubectl get ingress -n delivro`

## CI/CD
- GitHub Actions pipeline: `.github/workflows/ci-cd.yml`
- Stages:
	- Typecheck + build
	- Build & push all Docker images
	- Apply Kubernetes manifests

## Security Baseline
- JWT access/refresh architecture with role-based authorization.
- Gateway-level CSRF token endpoint and cookie-based CSRF middleware.
- Fastify Helmet and rate limiting for API hardening.
- Zod input validation in all services.
- Audit logging for permission and payment-review actions.
- Payment risk scoring endpoint for fraud triage.
- Stripe webhook signature verification with raw-body validation.

## PWA / App Readiness
- `apps/web/public/manifest.json` is included for PWA packaging.
- Service worker caching enabled via `apps/web/public/sw.js`.
- Responsive layout supports mobile/tablet/desktop for hybrid wrappers (Capacitor/React Native WebView).

## Realtime Tracking Fallback
- Primary channel: WebSocket (`/track/:orderId`)
- Fallback channel: SSE (`/track-sse/:orderId`)
- Optional cloud sync: Firebase RTDB mirror from delivery service

## Market Publish Checklist
1. Security
	- Rotate all JWT and Stripe secrets
	- Enable HTTPS-only cookies and secure headers
	- Configure WAF, DDoS protection, and rate-limit tiers
2. Compliance
	- Add Terms, Privacy, Refund, Delivery policy pages
	- Complete PCI scope review for Stripe usage
3. Quality gates
	- Add E2E tests for checkout, auth, tracking
	- Add load tests for gateway and delivery tracking
4. Store readiness (PWA/Hybrid)
	- Replace SVG icons with store-grade PNG app icon sets (192/512 + adaptive icons)
	- Wrap with Capacitor and generate Android/iOS builds
	- Configure push notification providers (FCM/APNs)
