import Link from "next/link";

const FOOTER_LINKS = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Press", href: "#" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Become a Seller", href: "/register" },
      { label: "Delivery Partner", href: "/register" },
      { label: "API Docs", href: "#" },
      { label: "System Status", href: "#" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Contact Us", href: "#" },
      { label: "Refund Policy", href: "/refund" },
      { label: "Track Order", href: "/tracking" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cookie Policy", href: "#" },
      { label: "GDPR", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-main py-12">
        {/* Top section */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">D</span>
              DeliVro
            </Link>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              Enterprise multi-vendor e-commerce & delivery platform. Connecting customers, sellers, and delivery partners across Bangladesh and beyond.
            </p>
            {/* Social links */}
            <div className="mt-4 flex gap-3">
              {["Twitter", "LinkedIn", "GitHub"].map((s) => (
                <a key={s} href="#" className="rounded-lg border border-slate-200 p-1.5 text-xs text-slate-500 hover:border-brand-300 hover:text-brand-700">
                  {s[0]}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {column.title}
              </h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-slate-600 hover:text-brand-700">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Payment methods */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-6">
          <span className="text-xs text-slate-400 mr-2">We accept:</span>
          {["Stripe", "bKash", "Nagad", "Rocket", "Bank Transfer", "Cash on Delivery"].map((m) => (
            <span key={m} className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
              {m}
            </span>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} DeliVro. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-brand-600">Terms</Link>
            <Link href="/privacy" className="hover:text-brand-600">Privacy</Link>
            <Link href="/refund" className="hover:text-brand-600">Refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
