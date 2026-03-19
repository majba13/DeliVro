# Real Data Entry Checklist

Use this checklist when onboarding real users, shops, and products in production.

## 1. User Accounts
- Create only real accounts with real names and active emails.
- Verify phone numbers are reachable.
- Assign least-privilege roles (`CUSTOMER`, `SHOP_OWNER`, `DELIVERY_MAN`, `ADMIN`, `SUPER_ADMIN`).
- Do not use placeholder names or disposable email domains.

## 2. Shop Setup
- Add real shop legal/display name.
- Add real contact phone and business email.
- Add complete address (`line1`, `city`, optional `zip`).
- Set realistic `deliveryFee` and `minOrderAmt`.
- Confirm shop category matches actual inventory.

## 3. Product Setup
- Use real product names and non-placeholder descriptions.
- Set accurate price, stock, and optional discount.
- Upload real product images (no temporary/test assets).
- Add practical tags for search relevance.
- Keep units consistent (for example `500g`, `1pc`, `1L`).

## 4. Payment and Fulfillment Readiness
- Confirm payment methods are configured and tested with small real transactions.
- Validate order lifecycle: `PENDING -> CONFIRMED -> PROCESSING -> DISPATCHED -> DELIVERED`.
- Confirm delivery assignment and tracking updates work in real time.

## 5. Launch Verification
- Register a new customer and place a live order.
- Confirm admin panels show real analytics and records.
- Verify all customer-facing pages contain real content only.
- Re-run smoke checks after each major data import.
