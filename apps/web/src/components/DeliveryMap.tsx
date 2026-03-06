"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";

interface GPSPing {
  id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  recordedAt: string;
}

interface Delivery {
  id: string;
  status: string;
  currentLat: number | null;
  currentLng: number | null;
  etaMinutes: number | null;
  lastTrackedAt: string | null;
  order: {
    deliveryAddress: any;
  };
}

interface DeliveryMapProps {
  orderId: string;
}

export default function DeliveryMap({ orderId }: DeliveryMapProps) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [locations, setLocations] = useState<GPSPing[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    fetchDeliveryData();
  }, [orderId]);

  useEffect(() => {
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchDeliveryData();
    }, 10000);

    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (delivery && locations.length > 0 && typeof window !== "undefined") {
      initializeMap();
    }
  }, [delivery, locations]);

  const fetchDeliveryData = async () => {
    try {
      const data = await api.get<{ delivery: Delivery; locations: GPSPing[] }>(`/api/delivery/${orderId}`);
      
      setDelivery(data.delivery);
      setLocations(data.locations || []);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch delivery data:", error);
      setLoading(false);
    }
  };

  const initializeMap = async () => {
    if (!mapRef.current || !delivery) return;

    // Dynamically import Leaflet to avoid SSR issues
    const L = (await import("leaflet")).default;

    // Fix default marker icon issue with Leaflet + webpack
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });

    // Clear existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Center on current location or first location
    const centerLat = delivery.currentLat || locations[0]?.latitude || 23.8103;
    const centerLng = delivery.currentLng || locations[0]?.longitude || 90.4125;

    // Initialize map
    const map = L.map(mapRef.current).setView([centerLat, centerLng], 14);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add destination marker
    if (delivery.order?.deliveryAddress) {
      const dest = delivery.order.deliveryAddress;
      if (dest.latitude && dest.longitude) {
        const destMarker = L.marker([dest.latitude, dest.longitude], {
          icon: L.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
        }).addTo(map);
        
        destMarker.bindPopup("<b>Destination</b><br>" + (dest.address || "Delivery Address"));
        markersRef.current.push(destMarker);
      }
    }

    // Add current location marker
    if (delivery.currentLat && delivery.currentLng) {
      const currentMarker = L.marker([delivery.currentLat, delivery.currentLng], {
        icon: L.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      }).addTo(map);

      const lastUpdate = delivery.lastTrackedAt 
        ? new Date(delivery.lastTrackedAt).toLocaleTimeString()
        : "Unknown";
      
      currentMarker.bindPopup(
        `<b>Current Position</b><br>Last update: ${lastUpdate}${
          delivery.etaMinutes ? `<br>ETA: ${delivery.etaMinutes} minutes` : ""
        }`
      ).openPopup();
      markersRef.current.push(currentMarker);
    }

    // Draw route from location pings
    if (locations.length > 1) {
      const coordinates = locations.map(loc => [loc.latitude, loc.longitude] as [number, number]);
      const polyline = L.polyline(coordinates, {
        color: "#4f46e5",
        weight: 3,
        opacity: 0.7,
      }).addTo(map);
      markersRef.current.push(polyline as any);

      // Fit bounds to show entire route
      const bounds = L.latLngBounds(coordinates);
      if (delivery.order?.deliveryAddress?.latitude && delivery.order?.deliveryAddress?.longitude) {
        bounds.extend([
          delivery.order.deliveryAddress.latitude,
          delivery.order.deliveryAddress.longitude,
        ]);
      }
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center text-slate-500">
          <div className="text-4xl">❌</div>
          <p className="mt-2">Delivery not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div 
          ref={mapRef} 
          className="h-96 w-full"
          style={{ minHeight: "400px" }}
        />
      </div>

      {/* GPS Pings Timeline */}
      {locations.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-900">
            Location History ({locations.length} pings)
          </h3>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {locations.slice().reverse().map((loc, index) => (
              <div
                key={loc.id}
                className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0"
              >
                <div className="flex-1">
                  <p className="text-xs font-mono text-slate-700">
                    {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(loc.recordedAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-600">
                  {loc.speed !== null && (
                    <div>Speed: {loc.speed.toFixed(1)} km/h</div>
                  )}
                  {loc.accuracy !== null && (
                    <div>±{loc.accuracy.toFixed(0)}m</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
