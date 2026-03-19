"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AnalyticsCards } from "@/components/AnalyticsCards";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    shops: 0,
    products: 0,
    pendingShops: 0,
    pendingOrders: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [shopsData, ordersData] = await Promise.all([
          api.get<{ shops: Array<{ isApproved: boolean; _count?: { products: number } }> }>("/api/shops?mine=true"),
          api.get<{ orders: Array<{ status: string }> }>("/api/orders?limit=100"),
        ]);

        if (cancelled) return;

        const shops = shopsData.shops ?? [];
        const products = shops.reduce((sum, s) => sum + (s._count?.products ?? 0), 0);
        const pendingShops = shops.filter((s) => !s.isApproved).length;
        const pendingOrders = (ordersData.orders ?? []).filter((o) => o.status === "PENDING").length;

        setStats({
          shops: shops.length,
          products,
          pendingShops,
          pendingOrders,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Shops" value={loading ? "..." : stats.shops} color="text-brand-700" />
        <StatCard label="Total Products" value={loading ? "..." : stats.products} color="text-emerald-700" />
        <StatCard label="Pending Shop Approvals" value={loading ? "..." : stats.pendingShops} color="text-amber-700" />
        <StatCard label="Pending Orders" value={loading ? "..." : stats.pendingOrders} color="text-indigo-700" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "My Shops", desc: "Create shops and manage product catalogs per store.", href: "/shops/my", icon: "🏪" },
          { title: "Orders", desc: "Review incoming orders and update preparation status.", href: "/orders", icon: "🛒" },
          { title: "Browse Marketplace", desc: "Check competitor pricing and discover trending items.", href: "/products", icon: "🔎" },
          { title: "Delivery Tracking", desc: "Monitor active deliveries connected to your orders.", href: "/tracking", icon: "📍" },
          { title: "Notifications", desc: "Review alerts for new orders, assignments, and updates.", href: "/dashboard", icon: "🔔" },
          { title: "Public Shop Listing", desc: "Preview how your shops appear to customers.", href: "/shops", icon: "✨" },
        ].map((item) => (
          <Link key={item.title} href={item.href} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-300 hover:shadow-md">
            <div className="mb-2 text-2xl">{item.icon}</div>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DeliveryManPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<
    Array<{
      id: string;
      address: string;
      status: string;
      completed: boolean;
      etaMinutes: number | null;
      lastTrackedAt: string | null;
    }>
  >([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pingingId, setPingingId] = useState<string | null>(null);

  const fetchAssignedOrders = async () => {
    const data = await api.get<{
      orders: Array<{
        id: string;
        status: string;
        deliveryAddress?: { street?: string; city?: string; line1?: string };
        delivery?: {
          status: string;
          etaMinutes: number | null;
          lastTrackedAt: string | null;
        } | null;
      }>;
    }>("/api/orders?limit=100");

    const mapped = (data.orders ?? []).map((o) => {
      const address =
        o.deliveryAddress?.street ??
        o.deliveryAddress?.line1 ??
        o.deliveryAddress?.city ??
        "Address unavailable";
      const liveStatus = o.delivery?.status ?? o.status;

      return {
        id: o.id,
        address,
        status: liveStatus,
        completed: o.status === "DELIVERED" || o.delivery?.status === "DELIVERED",
        etaMinutes: o.delivery?.etaMinutes ?? null,
        lastTrackedAt: o.delivery?.lastTrackedAt ?? null,
      };
    });

    setOrders(mapped);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await fetchAssignedOrders();
        if (cancelled) return;
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function updateStatus(orderId: string, status: "PICKED_UP" | "ON_THE_WAY" | "DELIVERED") {
    try {
      setUpdatingId(orderId);

      let lat: number | undefined;
      let lng: number | undefined;
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
        ).catch(() => null);
        if (pos) {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      }

      await api.patch(`/api/delivery/${orderId}`, {
        status,
        etaMinutes: status === "ON_THE_WAY" ? 20 : undefined,
        lat,
        lng,
      });

      await fetchAssignedOrders();
      toast(`Delivery status updated to ${status.replace(/_/g, " ")}`, "success");
    } catch (err: any) {
      toast(err?.message ?? "Failed to update delivery status", "error");
    } finally {
      setUpdatingId(null);
    }
  }

  async function sendLivePing(orderId: string) {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast("Geolocation is not supported on this device", "error");
      return;
    }

    try {
      setPingingId(orderId);
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
      );

      await api.post(`/api/delivery/${orderId}/ping`, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speed: pos.coords.speed ?? undefined,
        heading: pos.coords.heading ?? undefined,
        accuracy: pos.coords.accuracy ?? undefined,
      });

      await fetchAssignedOrders();
      toast("Live location updated", "success");
    } catch (err: any) {
      toast(err?.message ?? "Failed to update location", "error");
    } finally {
      setPingingId(null);
    }
  }

  const assignedToday = orders.length;
  const completed = orders.filter((o) => o.completed).length;
  const active = orders.filter((o) => !o.completed).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned Orders" value={loading ? "..." : assignedToday} color="text-brand-700" />
        <StatCard label="Completed" value={loading ? "..." : completed} color="text-emerald-700" />
        <StatCard label="Active" value={loading ? "..." : active} color="text-indigo-700" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">Active Deliveries</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading deliveries...</p>
        ) : orders.length === 0 ? (
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
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">{o.status.replace(/_/g, " ")}</span>
                  {o.etaMinutes ? <span className="text-xs text-slate-500">ETA {o.etaMinutes}m</span> : null}
                  {o.lastTrackedAt ? <span className="text-xs text-slate-500">{new Date(o.lastTrackedAt).toLocaleTimeString()}</span> : null}
                  {o.status === "ASSIGNED" ? (
                    <button
                      onClick={() => updateStatus(o.id, "PICKED_UP")}
                      disabled={updatingId === o.id}
                      className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                    >
                      {updatingId === o.id ? "Updating..." : "Picked Up"}
                    </button>
                  ) : null}
                  {o.status === "PICKED_UP" ? (
                    <button
                      onClick={() => updateStatus(o.id, "ON_THE_WAY")}
                      disabled={updatingId === o.id}
                      className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                    >
                      {updatingId === o.id ? "Updating..." : "On The Way"}
                    </button>
                  ) : null}
                  {o.status === "ON_THE_WAY" ? (
                    <button
                      onClick={() => updateStatus(o.id, "DELIVERED")}
                      disabled={updatingId === o.id}
                      className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      {updatingId === o.id ? "Updating..." : "Delivered"}
                    </button>
                  ) : null}
                  <button
                    onClick={() => sendLivePing(o.id)}
                    disabled={pingingId === o.id}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                  >
                    {pingingId === o.id ? "Pinging..." : "Update Location"}
                  </button>
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
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Platform Admin",
  SHOP_OWNER: "Shop Owner",
  DELIVERY_MAN: "Delivery Agent",
  CUSTOMER: "Customer",
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
      case "SUPER_ADMIN": return <SuperAdminPanel />;
      case "ADMIN":       return <AdminPanel />;
      case "SHOP_OWNER":  return <ShopOwnerPanel />;
      case "DELIVERY_MAN":return <DeliveryManPanel />;
      default:            return <CustomerPanel name={user!.name} />;
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
