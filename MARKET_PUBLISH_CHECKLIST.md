# DeliVro Market Publish Checklist

Use this checklist before every production launch.

## 1. Security (Blockers)

- [ ] No hardcoded secrets in scripts or source files
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are strong random values
- [ ] `DATABASE_URL` points to production MongoDB Atlas with IP allowlist configured
- [ ] `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set for production mode
- [ ] `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are set on secure backend runtime only
- [ ] `NEXT_PUBLIC_*` vars contain only non-sensitive values
- [ ] HTTPS is enforced at all public entrypoints

## 2. Platform Quality (Blockers)

- [ ] Run market preflight:
  - `npm run preflight:market`
- [ ] Typecheck passes:
  - `npm run typecheck --workspace=@delivro/web`
- [ ] Web build passes:
  - `npm run build --workspace=@delivro/web`
- [ ] Smoke-test core flows:
  - registration/login
  - product browse/search
  - shop creation and product upload
  - checkout and payment initiation
  - order tracking

## 3. Legal and Compliance (Blockers)

- [ ] Privacy Policy is accessible in production
  - `apps/web/src/app/privacy/page.tsx`
- [ ] Terms of Service is accessible in production
  - `apps/web/src/app/terms/page.tsx`
- [ ] Refund Policy is accessible in production
  - `apps/web/src/app/refund/page.tsx`
- [ ] Support and legal contact emails are valid and monitored

## 4. PWA Readiness (Required)

- [ ] Manifest served and valid
  - `apps/web/public/manifest.json`
- [ ] Service worker served and active in production
  - `apps/web/public/sw.js`
- [ ] App icons available
  - `apps/web/public/icon-192.svg`
  - `apps/web/public/icon-512.svg`
- [ ] `NEXT_PUBLIC_SITE_URL` set to canonical production URL

## 5. Deployment (Required)

- [ ] Vercel project linked
- [ ] Vercel env vars set for production and preview
- [ ] Run deployment script:
  - `./scripts/deploy.ps1 -Token "<VERCEL_TOKEN>"`
- [ ] Validate post-deploy headers and security policies
  - `vercel.json`
  - `apps/web/next.config.ts`

## 6. Post-Deploy Verification (Required)

- [ ] Landing page loads and is indexable
- [ ] API routes respond with expected status codes
- [ ] Cloudinary uploads work from shop/product forms
- [ ] Notification bell updates unread count
- [ ] Admin dashboard shows live analytics
- [ ] No critical errors in Vercel logs and browser console

## 7. Rollback Plan (Required)

- [ ] Previous production deployment URL recorded
- [ ] Emergency rollback owner assigned
- [ ] Hotfix branch strategy confirmed

## Notes

- Keep `.env` and `.env.local` out of version control.
- Never commit credentials, tokens, or private keys.
- Re-run preflight after any production config change.
