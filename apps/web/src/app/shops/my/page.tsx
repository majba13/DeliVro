"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ImageUploader } from "@/components/ImageUploader";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, ApiError } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */
interface Shop {
  id: string;
  name: string;
  description: string | null;
  logo?: string | null;
  banner?: string | null;
  category: string;
  deliveryFee: number;
  minOrderAmt: number;
  isApproved: boolean;
  isActive: boolean;
  avgRating: number | null;
  totalReviews: number | null;
  createdAt: string;
  _count?: { products: number };
}

const CATEGORIES = [
  "FOOD", "GROCERIES", "MEDICINE", "EMERGENCY",
  "STATIONARY", "WEAR", "ELECTRONICS",
] as const;

const CATEGORY_EMOJI: Record<string, string> = {
  FOOD: "🍱", GROCERIES: "🛒", MEDICINE: "💊", EMERGENCY: "🚨",
  STATIONARY: "📚", WEAR: "👗", ELECTRONICS: "📱",
};

/* ------------------------------------------------------------------ */
/* Create / Edit Shop Form                                              */
/* ------------------------------------------------------------------ */
interface ShopFormProps {
  initial?: Partial<Shop>;
  onSuccess: (shop: Shop) => void;
  onCancel: () => void;
}

function ShopForm({ initial, onSuccess, onCancel }: ShopFormProps) {
  const { toast } = useToast();
  const isEdit = !!initial?.id;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    logo: initial?.logo ?? "",
    banner: initial?.banner ?? "",
    category: (initial?.category ?? "FOOD") as typeof CATEGORIES[number],
    deliveryFee: initial?.deliveryFee ?? 50,
    minOrderAmt: initial?.minOrderAmt ?? 100,
    phone: "",
    email: "",
    addressLine1: "",
    addressCity: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        logo: form.logo || undefined,
        banner: form.banner || undefined,
        category: form.category,
        deliveryFee: Number(form.deliveryFee),
        minOrderAmt: Number(form.minOrderAmt),
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.addressLine1
          ? { line1: form.addressLine1, city: form.addressCity }
          : undefined,
      };

      let result: { shop: Shop };
      if (isEdit && initial?.id) {
        result = await api.patch<{ shop: Shop }>(`/api/shops/${initial.id}`, payload);
        toast("Shop updated successfully!", "success");
      } else {
        result = await api.post<{ shop: Shop }>("/api/shops", payload);
        toast("Shop created! Awaiting admin approval.", "success");
      }
      onSuccess(result.shop);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to save shop";
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  const field = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-bold">{isEdit ? "Edit Shop" : "Create Your Shop"}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">Shop Name *</label>
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={field} placeholder="e.g. Fresh Corner" />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea rows={2} value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className={field} placeholder="Tell customers what you sell…" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Logo URL</label>
          <input
            value={form.logo}
            onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))}
            className={field}
            placeholder="https://..."
          />
          {form.logo && (
            <img src={form.logo} alt="Shop logo preview" className="mt-2 h-14 w-14 rounded-lg border border-slate-200 object-cover" />
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Banner URL</label>
          <input
            value={form.banner}
            onChange={(e) => setForm((f) => ({ ...f, banner: e.target.value }))}
            className={field}
            placeholder="https://..."
          />
          {form.banner && (
            <img src={form.banner} alt="Shop banner preview" className="mt-2 h-14 w-full rounded-lg border border-slate-200 object-cover" />
          )}
        </div>

        <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
          <ImageUploader
            label="Upload logo"
            folder="delivro/shops/logo"
            onUploaded={(urls) => {
              if (urls[0]) setForm((f) => ({ ...f, logo: urls[0] }));
            }}
          />
          <ImageUploader
            label="Upload banner"
            folder="delivro/shops/banner"
            onUploaded={(urls) => {
              if (urls[0]) setForm((f) => ({ ...f, banner: urls[0] }));
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Category *</label>
          <select required value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as any }))}
            className={field}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Delivery Fee (BDT)</label>
          <input type="number" min={0} value={form.deliveryFee}
            onChange={(e) => setForm((f) => ({ ...f, deliveryFee: Number(e.target.value) }))}
            className={field} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Min. Order Amount (BDT)</label>
          <input type="number" min={0} value={form.minOrderAmt}
            onChange={(e) => setForm((f) => ({ ...f, minOrderAmt: Number(e.target.value) }))}
            className={field} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Phone</label>
          <input type="tel" value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className={field} placeholder="01XXXXXXXXX" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Business Email</label>
          <input type="email" value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className={field} placeholder="shop@example.com" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Address</label>
          <input value={form.addressLine1}
            onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
            className={field} placeholder="Street address" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">City</label>
          <input value={form.addressCity}
            onChange={(e) => setForm((f) => ({ ...f, addressCity: e.target.value }))}
            className={field} placeholder="Dhaka" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Shop"}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export default function MyShopsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Shop | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login?callbackUrl=/shops/my");
    if (!isLoading && user) {
      const shopOwnerRoles = ["SHOP_OWNER", "ADMIN", "SUPER_ADMIN"];
      if (!shopOwnerRoles.includes(user.role)) {
        toast("Only shop owners can access this page", "error");
        router.push("/dashboard");
      }
    }
  }, [isLoading, user]);

  useEffect(() => {
    if (user) fetchShops();
  }, [user]);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ shops: Shop[] }>("/api/shops?mine=true");
      setShops(data.shops ?? []);
    } catch {
      toast("Failed to load shops", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleShopSaved = (shop: Shop) => {
    setShops((prev) => {
      const idx = prev.findIndex((s) => s.id === shop.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = shop;
        return next;
      }
      return [shop, ...prev];
    });
    setShowForm(false);
    setEditing(null);
  };

  const handleDeactivate = async (shopId: string) => {
    if (!confirm("Deactivate this shop? Customers will no longer see it.")) return;
    try {
      await api.delete(`/api/shops/${shopId}`);
      setShops((prev) => prev.filter((s) => s.id !== shopId));
      toast("Shop deactivated", "success");
    } catch {
      toast("Failed to deactivate shop", "error");
    }
  };

  return (
    <>
      <Navbar />
      <main className="container-main py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Shops</h1>
            <p className="mt-1 text-sm text-slate-500">Manage your stores and view performance</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + New Shop
          </button>
        </div>

        {/* Create / Edit form */}
        <AnimatePresence>
          {(showForm || editing) && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <ShopForm
                initial={editing ?? undefined}
                onSuccess={handleShopSaved}
                onCancel={() => { setShowForm(false); setEditing(null); }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Shop list */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : shops.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="text-5xl">🏪</div>
            <h2 className="text-lg font-semibold">No shops yet</h2>
            <p className="text-sm text-slate-500">Create your first shop to start selling on DeliVro.</p>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Create Shop
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop) => (
              <motion.div
                key={shop.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{CATEGORY_EMOJI[shop.category] ?? "🏪"}</span>
                      <h3 className="font-bold">{shop.name}</h3>
                    </div>
                    <span className="text-xs text-slate-500">{shop.category}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${shop.isApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {shop.isApproved ? "Approved" : "Pending"}
                    </span>
                    {!shop.isActive && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {shop.description && (
                  <p className="mb-3 text-xs text-slate-500 line-clamp-2">{shop.description}</p>
                )}

                <div className="mt-auto grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                  <div>
                    <p className="text-sm font-bold text-brand-700">{shop._count?.products ?? 0}</p>
                    <p className="text-[10px] text-slate-500">Products</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">⭐ {shop.avgRating?.toFixed(1) ?? "—"}</p>
                    <p className="text-[10px] text-slate-500">Rating</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">৳{shop.deliveryFee}</p>
                    <p className="text-[10px] text-slate-500">Delivery</p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/shops/${shop.id}`}
                    className="flex-1 rounded-lg border border-slate-200 py-1.5 text-center text-xs font-medium hover:bg-slate-50"
                  >
                    View
                  </Link>
                  <Link
                    href={`/shops/${shop.id}/products`}
                    className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 text-center text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    Products
                  </Link>
                  <button
                    onClick={() => { setEditing(shop); setShowForm(false); }}
                    className="flex-1 rounded-lg border border-brand-200 bg-brand-50 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeactivate(shop.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Quick links */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { href: "/dashboard", label: "Dashboard", icon: "📊" },
            { href: "/products", label: "Browse Products", icon: "🛍️" },
            { href: "/orders", label: "My Orders", icon: "📦" },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-200 hover:shadow-md transition-shadow">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
