"use client";

import { useEffect, useState } from "react";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase, off, onValue, ref } from "firebase/database";
import { api } from "@/lib/api";

function mapDeliveryStatusToOrderStatus(status?: string) {
  if (!status) return undefined;
  if (status === "ASSIGNED") return "CONFIRMED";
  if (status === "PICKED_UP" || status === "ON_THE_WAY") return "OUT_FOR_DELIVERY";
  if (status === "DELIVERED") return "DELIVERED";
  return status;
}

export function useTrackingSocket(orderId: string) {
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!orderId) {
      setPayload(null);
      return;
    }

    const wsBase = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4005/track";
    const sseBase = process.env.NEXT_PUBLIC_SSE_URL ?? "http://localhost:4005/track-sse";
    const ws = new WebSocket(`${wsBase}/${orderId}`);
    let sse: EventSource | null = null;
    let firebaseCleanup: (() => void) | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const pollApiFallback = async () => {
      try {
        const [deliveryRes, orderRes] = await Promise.allSettled([
          api.get<{
            delivery?: {
              status?: string;
              etaMinutes?: number | null;
              currentLat?: number | null;
              currentLng?: number | null;
              lastTrackedAt?: string | null;
            };
          }>(`/api/delivery/${orderId}`),
          api.get<{ order?: { status?: string; estimatedMinutes?: number | null } }>(`/api/orders/${orderId}`),
        ]);

        const delivery = deliveryRes.status === "fulfilled" ? deliveryRes.value.delivery : undefined;
        const order = orderRes.status === "fulfilled" ? orderRes.value.order : undefined;

        const statusFromDelivery = mapDeliveryStatusToOrderStatus(delivery?.status);
        const status = order?.status ?? statusFromDelivery;

        if (status || delivery) {
          setPayload((prev) => ({
            ...prev,
            status,
            etaMinutes: delivery?.etaMinutes ?? order?.estimatedMinutes ?? null,
            lat: delivery?.currentLat ?? null,
            lng: delivery?.currentLng ?? null,
            updatedAt: delivery?.lastTrackedAt ?? new Date().toISOString(),
            source: "api-poll",
          }));
        }
      } catch {
        // Keep existing payload if polling fails
      }
    };

    const connectFirebaseFallback = () => {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
      const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

      if (apiKey && authDomain && databaseURL && projectId) {
        const firebaseApp = getApps().some((app) => app.name === "tracking-fallback")
          ? getApp("tracking-fallback")
          : initializeApp({ apiKey, authDomain, databaseURL, projectId }, "tracking-fallback");
        const database = getDatabase(firebaseApp);
        const dbRef = ref(database, `tracking/${orderId}`);
        onValue(dbRef, (snapshot) => {
          const value = snapshot.val();
          if (value) setPayload(value);
        });
        firebaseCleanup = () => off(dbRef);
        return;
      }

      sse = new EventSource(`${sseBase}/${orderId}`);
      sse.onmessage = (event) => {
        try {
          setPayload(JSON.parse(event.data));
        } catch {
          // ignore malformed payloads and keep previous state
        }
      };
    };

    ws.onmessage = (event) => {
      try {
        setPayload(JSON.parse(event.data));
      } catch {
        // ignore malformed payloads and keep previous state
      }
    };
    ws.onerror = () => connectFirebaseFallback();
    ws.onclose = () => connectFirebaseFallback();

    // Always keep a polling fallback running so tracking works even when sockets are blocked.
    pollApiFallback();
    pollInterval = setInterval(pollApiFallback, 10000);

    return () => {
      ws.close();
      sse?.close();
      firebaseCleanup?.();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [orderId]);

  return payload;
}
