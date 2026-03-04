"use client";

import { useEffect, useState } from "react";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase, off, onValue, ref } from "firebase/database";

export function useTrackingSocket(orderId: string) {
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const wsBase = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4005/track";
    const sseBase = process.env.NEXT_PUBLIC_SSE_URL ?? "http://localhost:4005/track-sse";
    const ws = new WebSocket(`${wsBase}/${orderId}`);
    let sse: EventSource | null = null;
    let firebaseCleanup: (() => void) | null = null;

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
      sse.onmessage = (event) => setPayload(JSON.parse(event.data));
    };

    ws.onmessage = (event) => setPayload(JSON.parse(event.data));
    ws.onerror = () => connectFirebaseFallback();
    ws.onclose = () => connectFirebaseFallback();

    return () => {
      ws.close();
      sse?.close();
      firebaseCleanup?.();
    };
  }, [orderId]);

  return payload;
}
