/**
 * Cart context — shopping cart backed by:
 *   • Database via /api/cart  when the user is authenticated
 *   • localStorage (dvr_cart) for guest / unauthenticated users
 *
 * On login  → guest localStorage cart is merged into the user's DB cart.
 * On logout → DB cart is dropped from local state (private to the account).
 *
 * All mutations use optimistic UI: the local state is updated immediately
 * and the server sync happens in the background.  On failure the state
 * is reverted so the UI stays consistent with reality.
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */
export interface CartItem {
  /** Product ID — used as the stable client-side key. */
  id: string;
  /** DB CartItem primary key — populated after the first server sync. */
  dbId?: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

/** Raw shape returned by GET /api/cart */
interface DbCartItemRaw {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: { id: string; name: string; price: number; images: string[] };
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  open: boolean;
  /** True while the cart is being hydrated from localStorage or the DB. */
  cartLoading: boolean;
  setOpen: (v: boolean) => void;
  addItem: (item: Omit<CartItem, "quantity" | "dbId">) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
const STORAGE_KEY = "dvr_cart";

function normalizeDbItem(raw: DbCartItemRaw): CartItem {
  return {
    id: raw.product.id,
    dbId: raw.id,
    name: raw.product.name,
    price: raw.product.price,
    quantity: raw.quantity,
    imageUrl: raw.product.images?.[0],
  };
}

function readLocalCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeLocalCart(items: CartItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* storage full — silently ignore */ }
}

/* ------------------------------------------------------------------ */
/* Context                                                              */
/* ------------------------------------------------------------------ */
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [cartLoading, setCartLoading] = useState(true);

  /**
   * Ref mirror of items — lets mutation callbacks read the current
   * items without capturing stale closures or adding items to dep arrays.
   */
  const itemsRef = useRef<CartItem[]>([]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  /* ---- Hydrate cart whenever auth state changes (login / logout) ---- */
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      setCartLoading(true);

      if (user) {
        try {
          /* On first login: merge any guest items from localStorage into the DB */
          const guestItems = readLocalCart();
          if (guestItems.length > 0) {
            // allSettled so a single bad product ID doesn't abort the merge
            await Promise.allSettled(
              guestItems.map((item) =>
                api.post("/api/cart", { productId: item.id, quantity: item.quantity })
              )
            );
            writeLocalCart([]); // Guest cart consumed — clear it
          }

          /* Fetch the authoritative cart from the database */
          const data = await api.get<{ items: DbCartItemRaw[] }>("/api/cart");
          if (!cancelled) setItems(data.items.map(normalizeDbItem));
        } catch {
          if (!cancelled) setItems([]);
        }
      } else {
        /* Guest: read from localStorage */
        if (!cancelled) setItems(readLocalCart());
      }

      if (!cancelled) setCartLoading(false);
    }

    hydrate();
    return () => { cancelled = true; };
  }, [user?.id]); // Re-run on login / logout only // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Persist guest cart to localStorage on every change ---- */
  useEffect(() => {
    // Only write localStorage for guests, and only after the initial hydration
    // (cartLoading guard prevents wiping the stored cart on mount before hydration)
    if (!user && !cartLoading) {
      writeLocalCart(items);
    }
  }, [items, user, cartLoading]);

  /* ---------------------------------------------------------------- */
  /* Mutations — optimistic UI + background DB sync                    */
  /* ---------------------------------------------------------------- */

  /**
   * Add one unit of a product.  Instantly updates the cart UI; syncs to
   * the DB in the background for authenticated users.
   */
  const addItem = useCallback(
    (item: Omit<CartItem, "quantity" | "dbId">) => {
      /* 1. Optimistic update */
      setItems((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        if (existing) {
          return prev.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        return [...prev, { ...item, quantity: 1 }];
      });
      setOpen(true);

      /* 2. DB sync for authenticated users */
      if (user) {
        api
          .post<{ item: DbCartItemRaw }>("/api/cart", {
            productId: item.id,
            quantity: 1,
          })
          .then((data) => {
            // Patch local entry with server-assigned dbId and confirmed qty
            setItems((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? { ...i, dbId: data.item.id, quantity: data.item.quantity }
                  : i
              )
            );
          })
          .catch(() => {
            // Revert the optimistic increment on failure
            setItems((prev) => {
              const existing = prev.find((i) => i.id === item.id);
              if (!existing) return prev;
              if (existing.quantity <= 1) return prev.filter((i) => i.id !== item.id);
              return prev.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
              );
            });
          });
      }
    },
    [user]
  );

  const removeItem = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((i) => i.id === id);
      setItems((prev) => prev.filter((i) => i.id !== id));

      if (user && item?.dbId) {
        api.delete(`/api/cart/${item.dbId}`).catch(() => {
          // Revert: re-add the item if it is no longer in the cart
          if (item) {
            setItems((cur) =>
              cur.find((i) => i.id === id) ? cur : [...cur, item]
            );
          }
        });
      }
    },
    [user]
  );

  const updateQty = useCallback(
    (id: string, qty: number) => {
      if (qty <= 0) { removeItem(id); return; }

      const oldItem = itemsRef.current.find((i) => i.id === id);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i))
      );

      if (user && oldItem?.dbId) {
        api
          .patch(`/api/cart/${oldItem.dbId}`, { quantity: qty })
          .catch(() => {
            // Revert on failure
            if (oldItem) setItems((cur) => cur.map((i) => (i.id === id ? oldItem : i)));
          });
      }
    },
    [user, removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    if (!user) writeLocalCart([]);
    else api.delete("/api/cart").catch(() => {});
  }, [user]);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        total,
        open,
        cartLoading,
        setOpen,
        addItem,
        removeItem,
        updateQty,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
