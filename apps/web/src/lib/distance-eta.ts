/**
 * Distance & ETA Calculation Utilities
 * Haversine formula for lat/lng distance + ETA calculation
 */

const EARTH_RADIUS_KM = 6371;
const AVERAGE_DELIVERY_SPEED_KMH = 25; // Urban delivery speed

/**
 * Calculate distance between two lat/lng coordinates using Haversine formula
 * @Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 1000) / 1000; // Round to 3 decimals
}

/**
 * Convert degrees to radians
 */
function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate ETA in minutes based on distance and speed
 * @param distanceKm - Distance in kilometers
 * @param speedKmh - Speed in km/h (defaults to AVERAGE_DELIVERY_SPEED_KMH)
 * @Returns ETA in minutes
 */
export function calculateETA(
  distanceKm: number,
  speedKmh: number = AVERAGE_DELIVERY_SPEED_KMH
): number {
  const hours = distanceKm / speedKmh;
  const minutes = Math.round(hours * 60);
  return Math.max(minutes, 5); // Minimum 5 minutes
}

/**
 * Calculate distance and ETA together
 */
export function getDistanceAndETA(
  currentLat: number,
  currentLng: number,
  destinationLat: number,
  destinationLng: number,
  speedKmh?: number
) {
  const distance = calculateDistance(currentLat, currentLng, destinationLat, destinationLng);
  const eta = calculateETA(distance, speedKmh);

  return {
    distanceKm: distance,
    etaMinutes: eta,
  };
}

/**
 * Find nearest delivery men within a certain radius
 * @Returns array sorted by distance
 */
export function findNearestDeliveryMen(
  deliveryMen: Array<{ id: string; lat: number; lng: number; name: string; isAvailable: boolean }>,
  pickupLat: number,
  pickupLng: number,
  radiusKm: number = 5
) {
  return deliveryMen
    .filter((dm) => dm.isAvailable)
    .map((dm) => ({
      ...dm,
      distance: calculateDistance(dm.lat, dm.lng, pickupLat, pickupLng),
    }))
    .filter((dm) => dm.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

/**
 * Format ETA for display
 */
export function formatETA(etaMinutes: number): string {
  if (etaMinutes < 60) {
    return `${etaMinutes}min`;
  }
  const hours = Math.floor(etaMinutes / 60);
  const mins = etaMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
