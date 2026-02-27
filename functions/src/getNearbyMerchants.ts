import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as geofire from "geofire-common";

const db = admin.firestore();

export interface GetNearbyMerchantsRequest {
  lat: number;
  lng: number;
  radiusKm?: number;
  filters?: {
    onlySol?: boolean;
    onlyUsdc?: boolean;
    category?: string;
  };
}

export interface MerchantData {
  id: string;
  walletAddress: string;
  name: string;
  category: string;
  description: string;
  openingHours: string;
  photoUrl: string;
  lat: number;
  lng: number;
  geoHash: string;
  acceptsSol: boolean;
  acceptsUsdc: boolean;
  isActive: boolean;
  totalPaymentsCount: number;
  totalVolumeSOL: number;
  totalVolumeUSDC: number;
  averageRating: number;
  ratingCount: number;
  distance?: number; // Distance in km, calculated on the fly
}

/**
 * Cloud Function to get nearby merchants using GeoFirestore queries
 *
 * Uses geohashQueryBounds to efficiently query Firestore for merchants
 * within a specified radius using geohashes.
 *
 * @param lat - User's latitude
 * @param lng - User's longitude
 * @param radiusKm - Search radius in kilometers (default: 5km)
 * @param filters - Optional filters (onlySol, onlyUsdc, category)
 */
export const getNearbyMerchants = functions.https.onCall(
  async (data: GetNearbyMerchantsRequest, context: functions.https.CallableContext) => {
    const {lat, lng, radiusKm = 5, filters = {}} = data;

    // Validate inputs
    if (!lat || !lng) {
      throw new functions.https.HttpsError("invalid-argument", "Latitude and longitude are required");
    }

    if (lat < -90 || lat > 90) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid latitude");
    }

    if (lng < -180 || lng > 180) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid longitude");
    }

    if (radiusKm <= 0 || radiusKm > 50) {
      throw new functions.https.HttpsError("invalid-argument", "Radius must be between 0 and 50 km");
    }

    try {
      // Get geohash query bounds for the specified radius
      // radiusKm is converted to meters for geofire
      const center: [number, number] = [lat, lng];
      const radiusInMeters = radiusKm * 1000;
      const bounds = geofire.geohashQueryBounds(center, radiusInMeters);

      console.log(`Searching for merchants within ${radiusKm}km of [${lat}, ${lng}]`);
      console.log(`Generated ${bounds.length} geohash query bounds`);

      // Create a query for each geohash range
      const queries = bounds.map((b) => {
        return db
          .collection("merchants")
          .where("isActive", "==", true)
          .orderBy("geoHash")
          .startAt(b[0])
          .endAt(b[1])
          .get();
      });

      // Execute all queries in parallel
      const snapshots = await Promise.all(queries);

      // Collect all matching documents
      const allDocs: admin.firestore.QueryDocumentSnapshot[] = [];
      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          allDocs.push(doc);
        }
      }

      // Remove duplicates (geohash boxes can overlap)
      const uniqueDocs = new Map<string, admin.firestore.QueryDocumentSnapshot>();
      for (const doc of allDocs) {
        if (!uniqueDocs.has(doc.id)) {
          uniqueDocs.set(doc.id, doc);
        }
      }

      console.log(`Found ${uniqueDocs.size} unique merchants in geohash bounds`);

      // Filter merchants by exact distance and apply filters
      const merchants: MerchantData[] = [];

      for (const [docId, doc] of uniqueDocs) {
        const data = doc.data();
        const merchantLat = data.lat;
        const merchantLng = data.lng;

        // Calculate exact distance using geofire's distanceBetween (returns km)
        const distance = geofire.distanceBetween([merchantLat, merchantLng], center);

        // Filter by exact radius (geohash boxes are approximate)
        if (distance > radiusKm) {
          continue;
        }

        // Apply currency filters
        if (filters.onlySol && !data.acceptsSol) {
          continue;
        }

        if (filters.onlyUsdc && !data.acceptsUsdc) {
          continue;
        }

        // Apply category filter
        if (filters.category && data.category !== filters.category) {
          continue;
        }

        // Add merchant to results
        merchants.push({
          id: docId,
          walletAddress: data.walletAddress,
          name: data.name,
          category: data.category,
          description: data.description || "",
          openingHours: data.openingHours || "",
          photoUrl: data.photoUrl || "",
          lat: merchantLat,
          lng: merchantLng,
          geoHash: data.geoHash,
          acceptsSol: data.acceptsSol,
          acceptsUsdc: data.acceptsUsdc,
          isActive: data.isActive,
          totalPaymentsCount: data.totalPaymentsCount || 0,
          totalVolumeSOL: data.totalVolumeSOL || 0,
          totalVolumeUSDC: data.totalVolumeUSDC || 0,
          averageRating: data.averageRating || 0,
          ratingCount: data.ratingCount || 0,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        });
      }

      // Sort by distance (closest first)
      merchants.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      console.log(`Returning ${merchants.length} merchants after filtering`);

      return {
        merchants,
        center: {lat, lng},
        radiusKm,
      };
    } catch (error: any) {
      console.error("Failed to get nearby merchants:", error);
      throw new functions.https.HttpsError("internal", `Failed to get nearby merchants: ${error.message}`);
    }
  }
);
