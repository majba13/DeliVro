import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="container-main py-16 max-w-3xl">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-brand-600 hover:underline">
        ← Back to DeliVro
      </Link>
      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

      <div className="space-y-6 text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Data We Collect</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li><strong>Account data:</strong> name, email, phone, role</li>
            <li><strong>Order data:</strong> items, delivery address, payment method, amounts</li>
            <li><strong>Location data:</strong> delivery agent GPS coordinates during active deliveries</li>
            <li><strong>Usage data:</strong> pages visited, actions performed, device info, IP address</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. How We Use Your Data</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>To process and deliver orders</li>
            <li>To verify payments and prevent fraud</li>
            <li>To send transactional notifications (order status, OTP)</li>
            <li>To improve the platform through aggregated analytics</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. Data Sharing</h2>
          <p className="mt-2 text-sm leading-relaxed">
            We share data only with: (a) payment processors (Stripe) for transaction processing, (b) delivery agents for order fulfillment, (c) cloud infrastructure providers under data processing agreements, and (d) legal authorities when required by law.
          </p>
          <p className="mt-1 text-sm leading-relaxed">We do <strong>not</strong> sell your personal data to third parties.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Data Retention</h2>
          <p className="mt-2 text-sm leading-relaxed">Account data is retained while your account is active and for 3 years after deletion for legal compliance. Order data is retained for 7 years for financial record-keeping. Location data is purged after 30 days.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Your Rights</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion (&quot;right to be forgotten&quot;)</li>
            <li>Data portability (export in JSON/CSV)</li>
            <li>Withdraw consent for marketing communications</li>
          </ul>
          <p className="mt-2 text-sm">Submit requests to <a href="mailto:privacy@delivro.com" className="text-brand-600 hover:underline">privacy@delivro.com</a></p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">6. Cookies</h2>
          <p className="mt-2 text-sm leading-relaxed">We use strictly necessary cookies for authentication sessions. We do not use third-party tracking or advertising cookies.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">7. Security</h2>
          <p className="mt-2 text-sm leading-relaxed">All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Passwords are hashed with bcrypt (cost factor 12). Payments are handled by PCI DSS-compliant Stripe.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">8. Contact DPO</h2>
          <p className="mt-2 text-sm"><a href="mailto:dpo@delivro.com" className="text-brand-600 hover:underline">dpo@delivro.com</a></p>
        </section>
      </div>
    </div>
  );
}
