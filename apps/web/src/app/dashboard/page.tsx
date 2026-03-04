"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AnalyticsCards } from "@/components/AnalyticsCards";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { api } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Stat card                                                            */
/* ------------------------------------------------------------------ */
function StatCard({ label, value, delta, color }: { label: string; value: string | number; delta?: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {delta && <p className="mt-1 text-xs text-emerald-600">{delta}</p>}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Role-specific panels                                                 */
/* ------------------------------------------------------------------ */
function SuperAdminPanel() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value="2,841" delta="+12% this month" color="text-brand-700" />
        <StatCard label="Active Shops" value="184" delta="+5 today" color="text-emerald-700" />
        <StatCard label="Revenue (USD)" value="$48,290" delta="+8.4% vs last month" color="text-indigo-700" />
        <StatCard label="Pending Disputes" value="7" color="text-amber-700" />
      </div>
      <AnalyticsCards />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Permission Matrix", desc: "Configure role-based access control permissions for Admin and ShopOwner roles.", href: "#", icon: "🔑" },
          { title: "Admin Restrictions", desc: "Set spending limits, product caps and operation windows for admin accounts.", href: "#", icon: "🛡️" },
          { title: "Audit Log", desc: "Full audit trail of all privileged operations across the platform.", href: "#", icon: "📋" },
          { title: "Fee Configuration", desc: "Adjust delivery fees, commission rates, and tax settings.", href: "#", icon: "💰" },
          { title: "Notification Blasts", desc: "Send bulk push/email notifications to segmented user groups.", href: "#", icon: "📢" },
          { title: "Platform Health", desc: "Monitor all microservice health checks and DB connections.", href: "#", icon: "🩺" },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-2xl">{item.icon}</div>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPanel() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Shop Owners" value="184" color="text-brand-700" />
        <StatCard label="Pending Verifications" value="14" color="text-amber-700" />
        <StatCard label="Orders Today" value="312" delta="+18% vs yesterday" color="text-emerald-700" />
        <StatCard label="Delivery Agents" value="67" color="text-indigo-700" />
      </div>
      <AnalyticsCards />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Manage Shop Owners", desc: "Verify new shop registrations and suspend violating accounts.", icon: "🏪" },
          { title: "Payment Verification", desc: "Review and approve manual MFS payment uploads.", icon: "✅" },
          { title: "Delivery Operations", desc: "Assign delivery personnel and manage delivery zones.", icon: "🚚" },
          { title: "Refund Requests", desc: "Process customer refund and return requests.", icon: "↩️" },
          { title: "Product Moderation", desc: "Review flagged product listings before they go live.", icon: "🔍" },
          { title: "Reports", desc: "Generate sales, delivery, and compliance reports.", icon: "📊" },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-2xl">{item.icon}</div>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShopOwnerPanel() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Products" value="38" color="text-brand-700" />
        <StatCard label="Today's Orders" value="21" delta="+6 new" color="text-emerald-700" />
        <StatCard label="Revenue (Month)" value="$3,840" delta="+12%" color="text-indigo-700" />
        <StatCard label="Low Stock" value="4" color="text-amber-700" />
      </div>
      <AnalyticsCards />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Add Product", desc: "List a new product with pricing, images, and inventory details.", href: "#", icon: "➕" },
          { title: "Manage Inventory", desc: "Update stock levels and review low-stock alerts.", href: "#", icon: "📦" },
          { title: "Order Processing", desc: "Confirm pending orders and mark items as ready for dispatch.", href: "#", icon: "🛒" },
          { title: "Customer Reviews", desc: "View and respond to customer ratings and feedback.", href: "#", icon: "⭐" },
          { title: "Promotions", desc: "Create discounts, flash sales, and bundle deals.", href: "#", icon: "🏷️" },
          { title: "Shop Analytics", desc: "Track sales trends, top products, and revenue breakdowns.", href: "#", icon: "📈" },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-2xl">{item.icon}</div>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeliveryManPanel() {
  const [orders, setOrders] = useState<{ id: string; address: string; status: string }[]>([
    { id: "ORD-001", address: "12 Main St, Dhaka", status: "DISPATCHED" },
    { id: "ORD-002", address: "45 Lake View Rd, Chittagong", status: "CONFIRMED" },
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned Today" value="8" color="text-brand-700" />
        <StatCard label="Completed" value="5" color="text-emerald-700" />
        <StatCard label="Earnings Today" value="$32" color="text-indigo-700" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">Active Deliveries</h3>
        {orders.length === 0 ? (
          <p className="text-sm text-slate-500">No active deliveries right now.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-sm">
                <div>
                  <p className="font-medium">{o.id}</p>
                  <p className="text-xs text-slate-500">{o.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">{o.status}</span>
                  <Link href={`/tracking?orderId=${o.id}`} className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100">
                    Navigate
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CustomerPanel({ name }: { name: string }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Welcome back, {name.split(" ")[0]}! 👋</h2>
        <p className="mt-1 text-sm text-slate-500">Here's a quick look at your account.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard label="Total Orders" value="12" color="text-brand-700" />
          <StatCard label="Points" value="450" color="text-indigo-700" />
          <StatCard label="Saved Addresses" value="2" color="text-emerald-700" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Order History", desc: "View all past and active orders.", href: "/orders", icon: "📦" },
          { title: "Track Delivery", desc: "Live GPS tracking for active deliveries.", href: "/tracking", icon: "📍" },
          { title: "Recommendations", desc: "AI-personalized picks curated for you.", href: "/products", icon: "✨" },
          { title: "Saved Items", desc: "Products you love, saved for later.", href: "#", icon: "❤️" },
          { title: "Addresses", desc: "Manage delivery addresses.", href: "#", icon: "🏠" },
          { title: "Refer & Earn", desc: "Invite friends and earn platform credits.", href: "#", icon: "🎁" },
        ].map((item) => (
          <Link key={item.title} href={item.href} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-300 hover:shadow-md transition-all">
            <div className="mb-2 text-2xl">{item.icon}</div>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main dashboard page                                                  */
/* ------------------------------------------------------------------ */
const ROLE_LABELS: Record<UserRole, string> = {
  SuperAdmin: "Super Administrator",
  Admin: "Platform Admin",
  ShopOwner: "Shop Owner",
  DeliveryMan: "Delivery Agent",
  Customer: "Customer",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main>
        <Navbar />
        <div className="container-main py-10">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />)}
          </div>
        </div>
      </main>
    );
  }

  function renderPanel() {
    switch (user!.role) {
      case "SuperAdmin": return <SuperAdminPanel />;
      case "Admin":      return <AdminPanel />;
      case "ShopOwner":  return <ShopOwnerPanel />;
      case "DeliveryMan":return <DeliveryManPanel />;
      default:           return <CustomerPanel name={user!.name} />;
    }
  }

  return (
    <main>
      <Navbar />
      <section className="container-main py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{ROLE_LABELS[user.role]} Dashboard</h1>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
            {user.role}
          </span>
        </div>
        {renderPanel()}
      </section>
    </main>
  );
}
