"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface Delivery {
  id: string;
  orderId: string;
  status: string;
  currentLat: number | null;
  currentLng: number | null;
  etaMinutes: number | null;
  order: {
    customerId: string;
    customer: { name: string; phone: string };
    deliveryAddress: { street: string; city: string };
  };
}

export default function DeliveryMobilePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  /* Guard - only delivery men */
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "DELIVERY_MAN")) {
      router.push("/dashboard");
    }
  }, [isLoading, user, router]);

  /* Load assigned deliveries */
  useEffect(() => {
    if (user?.role === "DELIVERY_MAN") {
      fetchDeliveries();
      const interval = setInterval(fetchDeliveries, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  /* GPS tracking */
  useEffect(() => {
    if (!trackingEnabled || typeof window === "undefined" || !navigator.geolocation) {
      return;
    }

    const updateLocation = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setCurrentLocation({ lat: latitude, lng: longitude });

      // Send location to backend for all active deliveries
      deliveries.forEach((delivery) => {
        if (delivery.status !== "DELIVERED") {
          updateDeliveryLocation(delivery.orderId, latitude, longitude);
        }
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn("Geolocation error:", error);
      if (error.code === 1) {
        toast("Location access denied. Please enable GPS permissions.", "error");
      }
    };

    // Request high accuracy GPS
    watchIdRef.current = navigator.geolocation.watchPosition(updateLocation, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [trackingEnabled, deliveries]);

  const fetchDeliveries = async () => {
    try {
      const data = await api.get<{ orders: Delivery[] }>("/api/orders?role=DELIVERY_MAN");
      setDeliveries(
        (data.orders ?? []).map((order: any) => ({
          id: order.delivery?.id,
          orderId: order.id,
          status: order.delivery?.status ?? "ASSIGNED",
          currentLat: order.delivery?.currentLat,
          currentLng: order.delivery?.currentLng,
          etaMinutes: order.delivery?.etaMinutes,
          order: {
            customerId: order.customerId,
            customer: order.customer,
            deliveryAddress: order.deliveryAddress,
          },
        }))
      );
    } catch {
      toast("Failed to load deliveries", "error");
    }
  };

  const updateDeliveryLocation = async (orderId: string, lat: number, lng: number) => {
    try {
      await api.patch(`/api/delivery/${orderId}`, {
        status: "ON_THE_WAY",
        lat,
        lng,
      });
    } catch (error) {
      console.error("Failed to update location:", error);
    }
  };

  const updateDeliveryStatus = async (orderId: string, newStatus: string, eta?: number) => {
    setLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const payload: any = { status: newStatus };
      if (currentLocation) {
        payload.lat = currentLocation.lat;
        payload.lng = currentLocation.lng;
      }
      if (eta) payload.etaMinutes = eta;

      await api.patch(`/api/delivery/${orderId}`, payload);
      await fetchDeliveries();
      toast(`Delivery marked as ${newStatus}`, "success");
    } catch (error) {
      toast("Failed to update delivery status", "error");
    } finally {
      setLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  if (isLoading) {
    return (
      <main>
        <Navbar />
        <div className="container-main py-10 flex items-center justify-center min-h-96">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      </main>
    );
  }

  return (
    <main>
      <Navbar />
      <section className="container-main py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🚚 My Deliveries</h1>
            <p className="mt-1 text-sm text-slate-500">Accept and manage your assigned deliveries</p>
          </div>
          <motion.button
            onClick={() => setTrackingEnabled(!trackingEnabled)}
            animate={{
              backgroundColor: trackingEnabled ? "#dc2626" : "#16a34a",
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white transition-all ${
              trackingEnabled && currentLocation ? "ring-2 ring-red-400" : ""
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${trackingEnabled ? "bg-white animate-pulse" : "bg-white/50"}`} />
            {trackingEnabled ? "GPS Live" : "Enable GPS"}
          </motion.button>
        </div>

        {currentLocation && trackingEnabled && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-700">
            📍 GPS Active: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
          </div>
        )}

        {deliveries.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center text-slate-400">
            <div className="text-5xl">📭</div>
            <p>No deliveries assigned yet.</p>
            <Link href="/dashboard" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {deliveries.map((delivery) => (
              <motion.div
                key={delivery.orderId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border-2 p-4 ${
                  delivery.status === "DELIVERED"
                    ? "border-emerald-200 bg-emerald-50"
                    : delivery.status === "ON_THE_WAY"
                    ? "border-indigo-200 bg-indigo-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">Order #{delivery.orderId.slice(-8).toUpperCase()}</h3>
                    <p className="text-sm text-slate-600">{delivery.order.deliveryAddress.street}</p>
                    <p className="text-xs text-slate-500">{delivery.order.deliveryAddress.city}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    delivery.status === "ASSIGNED" ? "bg-amber-100 text-amber-700" :
                    delivery.status === "PICKED_UP" ? "bg-blue-100 text-blue-700" :
                    delivery.status === "ON_THE_WAY" ? "bg-indigo-100 text-indigo-700" :
                    "bg-emerald-100 text-emerald-700"
                  }`}>
                    {delivery.status}
                  </span>
                </div>

                <div className="mb-4 rounded-lg bg-white/50 p-3">
                  <p className="mb-1 text-xs font-medium text-slate-600">Customer</p>
                  <p className="font-semibold text-slate-900">{delivery.order.customer.name}</p>
                  <p className="text-sm text-slate-600">{delivery.order.customer.phone}</p>
                </div>

                {delivery.etaMinutes && (
                  <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 p-2">
                    <p className="text-xs font-semibold text-blue-700">⏱️ ETA: {delivery.etaMinutes} minutes</p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {delivery.status === "ASSIGNED" && (
                    <>
                      <button
                        onClick={() => updateDeliveryStatus(delivery.orderId, "PICKED_UP")}
                        disabled={loading[delivery.orderId]}
                        className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading[delivery.orderId] ? "Updating…" : "✅ Picked Up"}
                      </button>
                    </>
                  )}

                  {(delivery.status === "PICKED_UP" || delivery.status === "ON_THE_WAY") && (
                    <>
                      <button
                        onClick={() => updateDeliveryStatus(delivery.orderId, "ON_THE_WAY")}
                        disabled={loading[delivery.orderId]}
                        className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {loading[delivery.orderId] ? "Updating…" : "🚚 On the Way"}
                      </button>
                      <button
                        onClick={() => updateDeliveryStatus(delivery.orderId, "DELIVERED")}
                        disabled={loading[delivery.orderId]}
                        className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {loading[delivery.orderId] ? "Finishing…" : "🎉 Delivered"}
                      </button>
                    </>
                  )}

                  {delivery.status === "DELIVERED" && (
                    <button
                      disabled
                      className="w-full rounded-lg bg-emerald-100 py-2.5 font-semibold text-emerald-700 cursor-default"
                    >
                      ✅ Completed
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
