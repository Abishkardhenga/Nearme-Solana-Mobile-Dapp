import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {Connection, PublicKey} from "@solana/web3.js";

const db = admin.firestore();
const DEVNET_RPC = "https://api.devnet.solana.com";
const connection = new Connection(DEVNET_RPC, "confirmed");

export interface CreatePaymentRequestData {
  merchantId: string;
  amount: number;
  currency: "SOL" | "USDC";
}

export interface FulfillPaymentRequestData {
  requestId: string;
  txSignature: string;
  senderWallet: string;
}

/**
 * Cloud Function to create a payment request
 *
 * Creates a Firestore document with payment details and 10-minute expiry
 */
export const createPaymentRequest = functions.https.onCall(
  async (data: CreatePaymentRequestData, context: functions.https.CallableContext) => {
    const {merchantId, amount, currency} = data;

    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    // Validate inputs
    if (!merchantId || !amount || !currency) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
    }

    if (amount <= 0 || amount > 1000000) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid amount");
    }

    if (currency !== "SOL" && currency !== "USDC") {
      throw new functions.https.HttpsError("invalid-argument", "Currency must be SOL or USDC");
    }

    try {
      // Get merchant details
      const merchantDoc = await db.collection("merchants").doc(merchantId).get();

      if (!merchantDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Merchant not found");
      }

      const merchantData = merchantDoc.data()!;

      // Verify the requesting user owns this merchant
      if (merchantData.walletAddress !== context.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You do not have permission to create payment requests for this merchant"
        );
      }

      // Verify merchant accepts this currency
      if (currency === "SOL" && !merchantData.acceptsSol) {
        throw new functions.https.HttpsError("failed-precondition", "Merchant does not accept SOL");
      }

      if (currency === "USDC" && !merchantData.acceptsUsdc) {
        throw new functions.https.HttpsError("failed-precondition", "Merchant does not accept USDC");
      }

      // Create payment request document
      const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000); // 10 minutes

      const paymentRequest = {
        merchantId,
        merchantName: merchantData.name,
        merchantWallet: merchantData.walletAddress,
        amount,
        currency,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
        paidAt: null,
        txSignature: null,
        senderWallet: null,
      };

      const requestRef = await db.collection("paymentRequests").add(paymentRequest);

      console.log(`Payment request created: ${requestRef.id} for ${amount} ${currency}`);

      return {
        requestId: requestRef.id,
        expiresAt: expiresAt.toMillis(),
      };
    } catch (error: any) {
      console.error("Failed to create payment request:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError("internal", `Failed to create payment request: ${error.message}`);
    }
  }
);

/**
 * Cloud Function to fulfill a payment request
 *
 * Verifies the transaction on Solana RPC and updates Firestore
 */
export const fulfillPaymentRequest = functions.https.onCall(
  async (data: FulfillPaymentRequestData, context: functions.https.CallableContext) => {
    const {requestId, txSignature, senderWallet} = data;

    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    // Validate inputs
    if (!requestId || !txSignature || !senderWallet) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
    }

    try {
      // Get payment request
      const requestRef = db.collection("paymentRequests").doc(requestId);
      const requestDoc = await requestRef.get();

      if (!requestDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Payment request not found");
      }

      const request = requestDoc.data()!;

      // Validate request status
      if (request.status !== "pending") {
        throw new functions.https.HttpsError("failed-precondition", `Payment request is ${request.status}`);
      }

      // Check expiration
      const now = admin.firestore.Timestamp.now();
      if (request.expiresAt.toMillis() < now.toMillis()) {
        // Mark as expired
        await requestRef.update({status: "expired"});
        throw new functions.https.HttpsError("failed-precondition", "Payment request has expired");
      }

      // Verify transaction on Solana RPC
      console.log(`Verifying transaction: ${txSignature}`);

      let txDetails;
      try {
        txDetails = await connection.getTransaction(txSignature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
      } catch (error) {
        console.error("Failed to fetch transaction:", error);
        throw new functions.https.HttpsError("not-found", "Transaction not found on Solana network");
      }

      if (!txDetails) {
        throw new functions.https.HttpsError("not-found", "Transaction not found on Solana network");
      }

      // Verify transaction succeeded
      if (txDetails.meta?.err) {
        throw new functions.https.HttpsError("failed-precondition", "Transaction failed on chain");
      }

      // Verify sender
      const senderPubkey = new PublicKey(senderWallet);
      const feePayer = txDetails.transaction.message.getAccountKeys().get(0);

      if (!feePayer || !feePayer.equals(senderPubkey)) {
        throw new functions.https.HttpsError("failed-precondition", "Transaction sender mismatch");
      }

      // Verify recipient (merchant wallet)
      const merchantPubkey = new PublicKey(request.merchantWallet);
      const accountKeys = txDetails.transaction.message.getAccountKeys();

      let recipientFound = false;
      for (let i = 0; i < accountKeys.length; i++) {
        if (accountKeys.get(i)?.equals(merchantPubkey)) {
          recipientFound = true;
          break;
        }
      }

      if (!recipientFound) {
        throw new functions.https.HttpsError("failed-precondition", "Transaction recipient mismatch");
      }

      // All verifications passed - update database using batch write
      const batch = db.batch();

      // 1. Mark payment request as paid
      batch.update(requestRef, {
        status: "paid",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        txSignature,
        senderWallet,
      });

      // 2. Create transaction record
      const transactionRef = db.collection("transactions").doc(txSignature);
      batch.set(transactionRef, {
        requestId,
        merchantId: request.merchantId,
        merchantName: request.merchantName,
        merchantWallet: request.merchantWallet,
        senderWallet,
        amount: request.amount,
        currency: request.currency,
        txSignature,
        blockTime: txDetails.blockTime,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 3. Update merchant stats
      const merchantRef = db.collection("merchants").doc(request.merchantId);
      const statsUpdate: any = {
        totalPaymentsCount: admin.firestore.FieldValue.increment(1),
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (request.currency === "SOL") {
        statsUpdate.totalVolumeSOL = admin.firestore.FieldValue.increment(request.amount);
      } else {
        statsUpdate.totalVolumeUSDC = admin.firestore.FieldValue.increment(request.amount);
      }

      batch.update(merchantRef, statsUpdate);

      // Commit batch
      await batch.commit();

      console.log(`Payment fulfilled: ${requestId} - ${txSignature}`);

      return {
        success: true,
        txSignature,
        blockTime: txDetails.blockTime,
      };
    } catch (error: any) {
      console.error("Failed to fulfill payment request:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError("internal", `Failed to fulfill payment request: ${error.message}`);
    }
  }
);

/**
 * Scheduled function to expire old payment requests
 *
 * Runs every minute and marks expired pending requests
 */
export const expirePaymentRequests = functions.pubsub.schedule("every 1 minutes").onRun(async (context) => {
  const now = admin.firestore.Timestamp.now();

  try {
    // Query for pending requests that have expired
    const expiredRequests = await db
      .collection("paymentRequests")
      .where("status", "==", "pending")
      .where("expiresAt", "<", now)
      .limit(100)
      .get();

    if (expiredRequests.empty) {
      console.log("No expired payment requests found");
      return null;
    }

    // Batch update expired requests
    const batch = db.batch();
    let count = 0;

    expiredRequests.forEach((doc) => {
      batch.update(doc.ref, {status: "expired"});
      count++;
    });

    await batch.commit();

    console.log(`Expired ${count} payment requests`);

    return null;
  } catch (error) {
    console.error("Failed to expire payment requests:", error);
    return null;
  }
});
