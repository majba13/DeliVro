"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";

// Dynamically import map component to avoid SSR issues
const DeliveryMap = dynamic(() => import("@/components/DeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center bg-slate-100">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
    </div>
  ),
});

interface Delivery {
  id: string;
  orderId: string;
  deliveryManId: string;
  status: string;
  currentLat: number | null;
  currentLng: number | null;
  etaMinutes: number | null;
  lastTrackedAt: string | null;
  createdAt: string;
  order: {
    id: string;
    status: string;
    deliveryAddress: any;
    customer: {
      name: string | null;
      phone: string | null;
    };
  };
  deliveryMan: {
    name: string | null;
    phone: string | null;
  };
}

export default function LiveDeliveryTracking() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN"))) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && (user.role === "SUPER_ADMIN" || user.role === "ADMIN")) {
      fetchDeliveries();
    }
  }, [user]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchDeliveries(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchDeliveries = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      // Fetch all active deliveries
      // We'll need to create an admin endpoint for this, but for now use orders API
      const data = await api.get<{ orders: any[] }>("/api/orders");
      
      // Filter orders that have deliveries in progress
      const ordersWithDelivery = (data.orders || []).filter(
        (order: any) => 
          order.status === "OUT_FOR_DELIVERY" || 
          order.delivery
      );

      // For each order, fetch delivery details
      const deliveryPromises = ordersWithDelivery.map(async (order: any) => {
        try {
          const deliveryData = await api.get<{ delivery: Delivery }>(`/api/delivery/${order.id}`);
          return deliveryData.delivery;
        } catch (err) {
          return null;
        }
      });

      const deliveryResults = await Promise.all(deliveryPromises);
      const validDeliveries = deliveryResults.filter(d => d !== null);
      
      setDeliveries(validDeliveries);
      
      // Update selected delivery if it's in the list
      if (selectedDelivery) {
        const updated = validDeliveries.find(d => d.id === selectedDelivery.id);
        if (updated) setSelectedDelivery(updated);
      }
    } catch (error) {
      console.error("Failed to fetch deliveries:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-brand-600 hover:text-brand-700">
            ← Back to Admin Dashboard
          </Link>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Live Delivery Tracking</h1>
              <p className="mt-2 text-slate-600">Monitor real-time delivery locations and status</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700">Auto-refresh (15s)</span>
              </label>
              <button
                onClick={() => fetchDeliveries()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                ↻ Refresh Now
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="text-4xl">🚚</div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No active deliveries</h3>
            <p className="mt-2 text-slate-600">There are no deliveries in progress at the moment</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Delivery List */}
            <div className="space-y-3 lg:col-span-1">
              <h2 className="font-semibold text-slate-900">Active Deliveries ({deliveries.length})</h2>
              {deliveries.map((delivery) => (
                <button
                  key={delivery.id}
                  onClick={() => setSelectedDelivery(delivery)}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    selectedDelivery?.id === delivery.id
                      ? "border-brand-500 bg-brand-50 shadow-md"
                      : "border-slate-200 bg-white hover:border-brand-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                        delivery.status
                      )}`}
                    >
                      {delivery.status.replace("_", " ")}
                    </span>
                    {delivery.etaMinutes && (
                      <span className="text-xs text-slate-600">ETA: {delivery.etaMinutes}m</span>
                    )}
                  </div>
                  
                  <div className="mt-3 space-y-1">
                    <p className="text-sm font-medium text-slate-900">
                      Order: {delivery.orderId.slice(0, 12)}...
                    </p>
                    <p className="text-xs text-slate-600">
                      Courier: {delivery.deliveryMan?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-slate-600">
                      Customer: {delivery.order?.customer?.name || "Unknown"}
                    </p>
                    {delivery.lastTrackedAt && (
                      <p className="text-xs text-slate-500">
                        Last update: {new Date(delivery.lastTrackedAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Map View */}
            <div className="lg:col-span-2">
              {selectedDelivery ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">Order ID</p>
                        <p className="font-medium text-slate-900">{selectedDelivery.orderId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Status</p>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                            selectedDelivery.status
                          )}`}
                        >
                          {selectedDelivery.status.replace("_", " ")}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Delivery Person</p>
                        <p className="text-sm text-slate-900">
                          {selectedDelivery.deliveryMan?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-600">
                          {selectedDelivery.deliveryMan?.phone || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Customer</p>
                        <p className="text-sm text-slate-900">
                          {selectedDelivery.order?.customer?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-600">
                          {selectedDelivery.order?.customer?.phone || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <DeliveryMap orderId={selectedDelivery.orderId} />
                </div>
              ) : (
                <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                  <div className="text-center text-slate-500">
                    <div className="text-4xl">📍</div>
                    <p className="mt-2">Select a delivery to view on map</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "ASSIGNED":
      return "bg-blue-100 text-blue-700";
    case "PICKED_UP":
      return "bg-amber-100 text-amber-700";
    case "ON_THE_WAY":
      return "bg-emerald-100 text-emerald-700";
    case "DELIVERED":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
