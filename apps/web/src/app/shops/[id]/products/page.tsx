"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ImageUploader } from "@/components/ImageUploader";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, ApiError } from "@/lib/api";

type Category =
  | "FOOD"
  | "GROCERIES"
  | "MEDICINE"
  | "EMERGENCY"
  | "STATIONARY"
  | "WEAR"
  | "ELECTRONICS";

interface ShopDetail {
  id: string;
  name: string;
  owner: { id: string; name: string | null };
  products: Product[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: Category;
  price: number;
  discount: number | null;
  unit: string | null;
  tags: string[];
  images: string[];
  inventory?: { stock: number } | null;
  isActive: boolean;
}

const CATEGORIES: Category[] = [
  "FOOD",
  "GROCERIES",
  "MEDICINE",
  "EMERGENCY",
  "STATIONARY",
  "WEAR",
  "ELECTRONICS",
];

const CATEGORY_EMOJI: Record<Category, string> = {
  FOOD: "🍱",
  GROCERIES: "🛒",
  MEDICINE: "💊",
  EMERGENCY: "🚨",
  STATIONARY: "📚",
  WEAR: "👗",
  ELECTRONICS: "📱",
};

interface ProductFormState {
  name: string;
  description: string;
  category: Category;
  price: number;
  discount: number;
  stock: number;
  unit: string;
  tags: string;
  images: string[];
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  description: "",
  category: "FOOD",
  price: 0,
  discount: 0,
  stock: 0,
  unit: "",
  tags: "",
  images: [],
};

function toFormState(p?: Product): ProductFormState {
  if (!p) return { ...EMPTY_FORM };
  return {
    name: p.name,
    description: p.description,
    category: p.category,
    price: Number(p.price),
    discount: p.discount ?? 0,
    stock: p.inventory?.stock ?? 0,
    unit: p.unit ?? "",
    tags: (p.tags ?? []).join(", "),
    images: p.images ?? [],
  };
}

export default function ShopProductsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<ProductFormState>({ ...EMPTY_FORM });

  async function fetchShop() {
    setLoading(true);
    try {
      const data = await api.get<{ shop: ShopDetail }>(`/api/shops/${id}`);
      const found = data.shop;
      setShop(found);
      setProducts(found.products ?? []);

      if (user && !["ADMIN", "SUPER_ADMIN"].includes(user.role) && found.owner.id !== user.id) {
        toast("You can only manage your own shop", "error");
        router.push("/shops/my");
      }
    } catch {
      toast("Shop not found", "error");
      router.push("/shops/my");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?callbackUrl=/shops/${id}/products`);
      return;
    }
    if (!id || !user) return;
    fetchShop();
  }, [id, user, authLoading]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm(toFormState(product));
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setSaving(true);

    const payload = {
      name: form.name,
      description: form.description,
      category: form.category,
      price: Number(form.price),
      discount: Number(form.discount) || undefined,
      stock: Number(form.stock),
      unit: form.unit.trim() || undefined,
      tags: form.tags.split(",").map((v) => v.trim()).filter(Boolean),
      images: form.images,
      shopId: shop.id,
    };

    try {
      if (editing) {
        const data = await api.patch<{ product: Product }>(`/api/products/${editing.id}`, payload);
        setProducts((prev) => prev.map((p) => (p.id === editing.id ? data.product : p)));
        toast("Product updated", "success");
      } else {
        const data = await api.post<{ product: Product }>("/api/products", payload);
        setProducts((prev) => [data.product, ...prev]);
        toast("Product created", "success");
      }
      setShowForm(false);
      setEditing(null);
      setForm({ ...EMPTY_FORM });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to save product";
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(productId: string) {
    if (!confirm("Deactivate this product?")) return;
    const snapshot = products;
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    try {
      await api.delete(`/api/products/${productId}`);
      toast("Product deactivated", "success");
    } catch {
      setProducts(snapshot);
      toast("Failed to deactivate product", "error");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }, [products, query]);

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="container-main py-8">
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </main>
      </>
    );
  }

  if (!shop) return null;

  return (
    <>
      <Navbar />
      <main className="container-main py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Shop owner workspace</p>
            <h1 className="text-2xl font-bold">{shop.name} Products</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/shops/my"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              ← My Shops
            </Link>
            <button
              onClick={openCreate}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              + New Product
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products in this shop..."
            className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <span className="text-xs text-slate-500">{filtered.length} items</span>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit}
              className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="mb-4 text-lg font-bold">{editing ? "Edit Product" : "Create Product"}</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium">Name *</span>
                  <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>

                <label className="sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium">Description *</span>
                  <textarea required rows={3} value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>

                <label>
                  <span className="mb-1 block text-sm font-medium">Category *</span>
                  <select value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>)}
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-sm font-medium">Unit</span>
                  <input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    placeholder="e.g. 500g / 1pc"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>

                <label>
                  <span className="mb-1 block text-sm font-medium">Price *</span>
                  <input type="number" min={0} step="0.01" required value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>

                <label>
                  <span className="mb-1 block text-sm font-medium">Discount %</span>
                  <input type="number" min={0} max={100} value={form.discount}
                    onChange={(e) => setForm((f) => ({ ...f, discount: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>

                <label>
                  <span className="mb-1 block text-sm font-medium">Stock *</span>
                  <input type="number" min={0} required value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>

                <label>
                  <span className="mb-1 block text-sm font-medium">Tags</span>
                  <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="comma, separated, tags"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>

                <div className="sm:col-span-2 rounded-lg border border-slate-200 p-3">
                  <ImageUploader
                    label="Product images"
                    folder="delivro/products"
                    multiple
                    onUploaded={(urls) => {
                      setForm((f) => ({
                        ...f,
                        images: [...f.images, ...urls],
                      }));
                    }}
                  />

                  <label className="mt-3 block">
                    <span className="mb-1 block text-sm font-medium">Or paste image URLs (comma separated)</span>
                    <input
                      value={form.images.join(", ")}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          images: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                        }))
                      }
                      placeholder="https://... , https://..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>

                  {form.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {form.images.map((url, index) => (
                        <div key={`${url}-${index}`} className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          <img src={url} alt={`Preview ${index + 1}`} className="h-20 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                images: f.images.filter((_, i) => i !== index),
                              }))
                            }
                            className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-black/80"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : editing ? "Update Product" : "Create Product"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                    setForm({ ...EMPTY_FORM });
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <div className="mb-2 text-4xl">📦</div>
            <p className="text-sm text-slate-500">No products found in this shop.</p>
            <button
              onClick={openCreate}
              className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Add first product
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-500">{CATEGORY_EMOJI[p.category]} {p.category}</p>
                    <h3 className="line-clamp-2 text-sm font-bold">{p.name}</h3>
                  </div>
                  {!p.isActive && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Inactive</span>
                  )}
                </div>

                <p className="line-clamp-2 text-xs text-slate-500">{p.description}</p>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm font-bold text-brand-700">৳{Number(p.price).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-500">Price</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{p.discount ?? 0}%</p>
                    <p className="text-[10px] text-slate-500">Discount</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{p.inventory?.stock ?? 0}</p>
                    <p className="text-[10px] text-slate-500">Stock</p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 rounded-lg border border-brand-200 bg-brand-50 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    Deactivate
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
