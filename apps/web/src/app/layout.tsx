import "./globals.css";
import type { Metadata, Viewport } from "next";
import { PWARegister } from "@/components/PWARegister";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/context/ToastContext";
import { AIAssistant } from "@/components/AIAssistant";

export const metadata: Metadata = {
  title: {
    default: "DeliVro — Premium Delivery & E-Commerce",
    template: "%s | DeliVro",
  },
  description:
    "Enterprise multi-vendor e-commerce platform with real-time delivery tracking, secure payments (Stripe, bKash, Nagad), and AI-enhanced shopping.",
  applicationName: "DeliVro",
  manifest: "/manifest.json",
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
