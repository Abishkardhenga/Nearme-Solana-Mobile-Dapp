import fetch from "node-fetch";

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param point1 First coordinate
 * @param point2 Second coordinate
 * @returns Distance in metres
 */
export function haversineMetres(point1: LatLng, point2: LatLng): number {
  const R = 6371000; // Earth's radius in metres
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get country code from IP address using ipapi.co (free tier: 1000 req/day)
 * @param ip IP address
 * @returns ISO country code or null
 */
export async function getCountryFromIp(ip: string | undefined): Promise<string | null> {
  if (!ip) return null;

  try {
    const response = await fetch(`https://ipapi.co/${ip}/country/`, {
      headers: {"User-Agent": "NearMe/1.0"},
      timeout: 3000,
    });

    if (!response.ok) return null;
    const country = await response.text();
    return country.trim().toUpperCase();
  } catch (error) {
    console.error("Failed to get country from IP:", error);
    return null;
  }
}

/**
 * Get country code from GPS coordinates using Nominatim reverse geocoding (free, no rate limit for fair use)
 * @param lat Latitude
 * @param lng Longitude
 * @returns ISO country code or null
 */
export async function getCountryFromCoords(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3`,
      {
        headers: {"User-Agent": "NearMe/1.0"},
        timeout: 5000,
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.address?.country_code?.toUpperCase() || null;
  } catch (error) {
    console.error("Failed to get country from coordinates:", error);
    return null;
  }
}
