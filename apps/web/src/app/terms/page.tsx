import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="container-main py-16 max-w-3xl">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-brand-600 hover:underline">
        ← Back to DeliVro
      </Link>
      <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-8 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

      <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed">By accessing or using the DeliVro platform (&quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, please discontinue use immediately.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. Description of Service</h2>
          <p className="text-sm leading-relaxed">DeliVro is an enterprise e-commerce and delivery platform connecting customers, shop owners, and delivery agents. We facilitate transactions but are not directly responsible for third-party product quality or delivery outcomes.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. User Accounts</h2>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>You must provide accurate registration information.</li>
            <li>You are responsible for maintaining the security of your credentials.</li>
            <li>We reserve the right to suspend accounts that violate these terms.</li>
            <li>Minimum age to register is 16 years old.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Shop Owner Obligations</h2>
          <p className="text-sm leading-relaxed">Shop Owners must ensure their product listings are accurate, legal, and in stock. Fraudulent listings will result in immediate account termination.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Payments & Fees</h2>
          <p className="text-sm leading-relaxed">DeliVro collects a 5% platform commission on completed orders. Delivery fees are set per zone. All payments are final except where subject to our Refund Policy.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">6. Prohibited Activities</h2>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>Listing counterfeit, illegal, or hazardous products.</li>
            <li>Manipulating reviews or ratings dishonestly.</li>
            <li>Attempting to circumvent platform payment systems.</li>
            <li>Scraping or automated data extraction without permission.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">7. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed">DeliVro is not liable for indirect, incidental, or consequential damages arising from platform use. Our maximum liability is limited to the fees paid in the prior 30 days.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">8. Changes to Terms</h2>
          <p className="text-sm leading-relaxed">We may update these terms at any time. Material changes will be notified via email and in-app notification 14 days before taking effect.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">9. Contact</h2>
          <p className="text-sm leading-relaxed">For questions: <a href="mailto:legal@delivro.com" className="text-brand-600 hover:underline">legal@delivro.com</a></p>
        </section>
      </div>
    </div>
  );
}
