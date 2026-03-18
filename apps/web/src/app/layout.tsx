import "./globals.css";
import type { Metadata, Viewport } from "next";
import { PWARegister } from "@/components/PWARegister";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/context/ToastContext";
import { AIAssistant } from "@/components/AIAssistant";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DeliVro — Premium Delivery & E-Commerce",
    template: "%s | DeliVro",
  },
  description:
    "Enterprise multi-vendor e-commerce platform with real-time delivery tracking, secure payments (Stripe, bKash, Nagad), and AI-enhanced shopping.",
  applicationName: "DeliVro",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.svg", type: "image/svg+xml", sizes: "192x192" },
      { url: "/icon-512.svg", type: "image/svg+xml", sizes: "512x512" },
    ],
    apple: [{ url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" }],
  },
  keywords: ["delivery", "e-commerce", "Bangladesh", "bkash", "nagad", "stripe"],
  robots: { index: true, follow: true },
  openGraph: {
    siteName: "DeliVro",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <PWARegister />
              <div className="min-h-screen">{children}</div>
              <AIAssistant />
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
