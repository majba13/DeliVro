import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Refund & Return Policy" };

export default function RefundPage() {
  return (
    <div className="container-main py-16 max-w-3xl">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-brand-600 hover:underline">
        ← Back to DeliVro
      </Link>
      <h1 className="mb-2 text-3xl font-bold">Refund & Return Policy</h1>
      <p className="mb-8 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

      <div className="space-y-6 text-slate-700">
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <strong>30-day returns</strong> on eligible physical products. Digital goods are non-refundable after download/access.
        </div>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Eligibility</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>Item received damaged, defective, or different from listing</li>
            <li>Item not delivered within twice the stated delivery window</li>
            <li>Wrong item delivered</li>
            <li>Items must be unused, in original packaging</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. Non-Refundable Items</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>Perishable food items after delivery is confirmed</li>
            <li>Medicines and health items once opened</li>
            <li>Custom or personalized products</li>
            <li>Services once fully performed</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. Refund Process</h2>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm">
            <li>Submit a refund request via <strong>My Orders → Request Refund</strong> within 30 days of delivery</li>
            <li>Upload photos of the defective/wrong item</li>
            <li>Our team reviews within 2 business days</li>
            <li>Approved refunds are processed to the original payment method within 5–10 business days</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Refund Methods</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li><strong>Stripe:</strong> 5–10 business days back to card</li>
            <li><strong>bKash / Nagad / Rocket:</strong> 2–3 business days to original number</li>
            <li><strong>Bank Transfer:</strong> 7–14 business days</li>
            <li><strong>COD:</strong> Bank transfer to provided account details</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Delivery Disputes</h2>
          <p className="mt-2 text-sm leading-relaxed">If your order was marked delivered but not received, contact us within 48 hours. We will investigate with the delivery agent&apos;s GPS log and resolve within 3 business days.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">6. Contact Support</h2>
          <p className="mt-2 text-sm">
            Email: <a href="mailto:support@delivro.com" className="text-brand-600 hover:underline">support@delivro.com</a><br />
            Live chat available in the app Mon–Fri 9am–6pm (GMT+6)
          </p>
        </section>
      </div>
    </div>
  );
}
