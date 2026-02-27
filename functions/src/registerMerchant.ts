import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import * as geofire from "geofire-common";
import {BN} from "@project-serum/anchor";
import {sendAndConfirmTransaction, SystemProgram, Transaction} from "@solana/web3.js";
import {haversineMetres, getCountryFromIp, getCountryFromCoords} from "./utils/geo";
import {getConnection, getLocationProofPDA, getProgram, loadServerKeypair} from "./utils/anchor";

const db = admin.firestore();

export interface RegisterMerchantData {
  // GPS data
  actualLat: number;
  actualLng: number;
  claimedLat: number;
  claimedLng: number;
  accuracy: number;
  mocked: boolean;

  // Merchant data
  walletAddress: string;
  name: string;
  category: string;
  description?: string;
  openingHours?: string;
  acceptsSol: boolean;
  acceptsUsdc: boolean;
  photoUrl?: string;
}

/**
 * Cloud Function to register a new merchant with GPS verification and on-chain proof
 *
 * GPS Defense Layers:
 * 1. Mock detection - reject fake GPS apps
 * 2. Accuracy check - reject weak signals
 * 3. Distance check - verify merchant is within 50m of claimed location
 * 4. IP vs GPS country cross-check - log anomalies
 */
export const registerMerchant = functions.https.onCall(
  async (data: RegisterMerchantData, context: functions.https.CallableContext) => {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated to register as merchant");
    }

    const {
      actualLat,
      actualLng,
      claimedLat,
      claimedLng,
      accuracy,
      mocked,
      walletAddress,
      name,
      category,
      description,
      openingHours,
      acceptsSol,
      acceptsUsdc,
      photoUrl,
    } = data;

    // Validate required fields
    if (!walletAddress || !name || !category) {
      throw new HttpsError("invalid-argument", "Missing required fields: walletAddress, name, category");
    }

    if (!actualLat || !actualLng || !claimedLat || !claimedLng) {
      throw new HttpsError("invalid-argument", "Missing GPS coordinates");
    }

    // Check if merchant already exists for this wallet
    const existingMerchant = await db
      .collection("merchants")
      .where("walletAddress", "==", walletAddress)
      .limit(1)
      .get();

    if (!existingMerchant.empty) {
      throw new HttpsError("already-exists", "Merchant already registered for this wallet address");
    }

    // ===== GPS VERIFICATION LAYER 1: Mock Detection =====
    if (mocked === true) {
      throw new HttpsError("failed-precondition", "Fake GPS detected. Please disable mock location apps.");
    }

    // ===== GPS VERIFICATION LAYER 2: Accuracy Check =====
    if (accuracy <= 0 || accuracy > 100) {
      throw new HttpsError(
        "failed-precondition",
        "GPS signal too weak or unavailable. Please go outside and ensure you have a clear view of the sky, then retry."
      );
    }

    // ===== GPS VERIFICATION LAYER 3: Distance Check =====
    const distance = haversineMetres({lat: actualLat, lng: actualLng}, {lat: claimedLat, lng: claimedLng});

    if (distance > 50) {
      throw new HttpsError(
        "failed-precondition",
        `You are ${Math.round(distance)} metres from the marked location. You must be within 50 metres of your business to register.`
      );
    }

    // ===== GPS VERIFICATION LAYER 4: IP vs GPS Country Cross-Check =====
    // This is a soft check - we log anomalies but don't block registration
    // Helps detect VPN/proxy usage and potential fraud
    try {
      const ipAddress = context.rawRequest.ip;
      const [ipCountry, gpsCountry] = await Promise.all([
        getCountryFromIp(ipAddress),
        getCountryFromCoords(claimedLat, claimedLng),
      ]);

      if (ipCountry && gpsCountry && ipCountry !== gpsCountry) {
        // Log suspicious registration for manual review
        await db.collection("suspiciousRegistrations").add({
          walletAddress,
          ipCountry,
          gpsCountry,
          ipAddress,
          lat: claimedLat,
          lng: claimedLng,
          flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
          reason: "IP country mismatch with GPS country",
        });

        console.warn(
          `Suspicious registration detected: IP country (${ipCountry}) != GPS country (${gpsCountry}) for wallet ${walletAddress}`
        );
      }
    } catch (error) {
      // Don't block registration if country check fails
      console.error("Country cross-check failed:", error);
    }

    // ===== ALL GPS CHECKS PASSED - Proceed with Registration =====

    // Generate Firebase merchant ID first (needed for PDA derivation)
    const merchantRef = db.collection("merchants").doc();
    const merchantId = merchantRef.id;

    try {
      // ===== CREATE ON-CHAIN LOCATION PROOF =====

      // Convert lat/lng to on-chain format (multiply by 1,000,000 for 6 decimal precision)
      const latOnChain = Math.round(claimedLat * 1_000_000);
      const lngOnChain = Math.round(claimedLng * 1_000_000);

      // Get server keypair and connection
      const serverKeypair = loadServerKeypair();
      const connection = getConnection();
      const program = await getProgram();

      // Derive PDA for this merchant's location proof
      const [proofPda, bump] = await getLocationProofPDA(merchantId);

      console.log(
        `Creating location proof PDA: ${proofPda.toString()} for merchant ${merchantId}`
      );

      // Build create_location_proof instruction
      const ix = await program.methods
        .createLocationProof(new BN(latOnChain), new BN(lngOnChain), merchantId)
        .accounts({
          proof: proofPda,
          payer: serverKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      // Create and send transaction
      const tx = new Transaction().add(ix);
      const signature = await sendAndConfirmTransaction(connection, tx, [serverKeypair], {
        commitment: "confirmed",
      });

      console.log(
        `Location proof created on-chain. Signature: ${signature}`
      );

      // ===== WRITE TO FIRESTORE =====

      // Calculate geohash for spatial queries
      const geoHash = geofire.geohashForLocation([claimedLat, claimedLng]);

      const merchantData = {
        // Wallet and identity
        walletAddress,
        name,
        category,
        description: description || "",
        openingHours: openingHours || "",
        photoUrl: photoUrl || "",

        // Location data
        lat: claimedLat,
        lng: claimedLng,
        geoHash,
        gpsAccuracyMetres: accuracy,

        // On-chain proof
        proofPdaAddress: proofPda.toString(),
        onChainTxSignature: signature,
        bump,

        // Payment settings
        acceptsSol,
        acceptsUsdc,

        // Status
        isActive: false, // Starts as closed

        // Metrics
        totalPaymentsCount: 0,
        totalVolumeSOL: 0,
        totalVolumeUSDC: 0,
        averageRating: 0,
        ratingCount: 0,

        // Timestamps
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await merchantRef.set(merchantData);

      // Update user document to mark as merchant
      await db
        .collection("users")
        .doc(walletAddress)
        .set(
          {
            isMerchant: true,
            merchantId,
          },
          {merge: true}
        );

      console.log(
        `Merchant ${merchantId} registered successfully for wallet ${walletAddress}`
      );

      return {
        success: true,
        merchantId,
        proofPdaAddress: proofPda.toString(),
        txSignature: signature,
        message: "Merchant registered successfully!",
      };
    } catch (error: any) {
      console.error("Failed to register merchant:", error);

      // Clean up merchant doc if it was created
      try {
        await merchantRef.delete();
      } catch (deleteError) {
        console.error("Failed to clean up merchant doc:", deleteError);
      }

      throw new HttpsError(
        "internal",
        `Failed to register merchant: ${error.message || "Unknown error"}`
      );
    }
  }
);
