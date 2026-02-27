# Phase 4 Setup & Testing Guide

## Overview
Phase 4 implements the complete payment flow - merchants generate QR codes, customers scan and pay with SOL or USDC via Mobile Wallet Adapter. All payments are direct wallet-to-wallet transfers (no smart contract).

---

## What Was Built

### ✅ Cloud Functions
1. **`createPaymentRequest`** - Creates payment request with 10-minute expiry
2. **`fulfillPaymentRequest`** - Verifies transaction on Solana RPC and updates Firestore
3. **`expirePaymentRequests`** - Scheduled function (runs every minute) to expire old requests

### ✅ Mobile App Services
1. **`payment.ts`** - SOL and USDC transfer functions using MWA
   - `payWithSOL()` - Direct SOL transfer via SystemProgram
   - `payWithUSDC()` - SPL Token transfer (6 decimals)
   - Price fetching from CoinGecko API

### ✅ Mobile App Screens
1. **Merchant Dashboard** - Stats, open/closed toggle, recent transactions
2. **Request Payment** - Amount input, SOL/USDC tabs, live USD conversion, QR generation
3. **Scan QR** - Camera scanner, payment confirmation, MWA integration
4. **Payment Success** - Animated success screen, Solana Explorer link
5. **Transaction History** - Paginated list with SOL/USDC filters

---

## Prerequisites

Before starting Phase 4, ensure:
- ✅ Phase 2 complete (merchant registration)
- ✅ Phase 3 complete (map discovery)
- ✅ Mobile Wallet Adapter configured
- ✅ Devnet SOL in merchant and customer wallets
- ✅ (Optional) Devnet USDC for testing USDC payments

---

## Step 1: Deploy Cloud Functions

1. **Install dependencies** (if not already done)
   ```bash
   cd functions
   npm install @solana/web3.js
   ```

2. **Build functions**
   ```bash
   npm run build
   ```

3. **Deploy to Firebase**
   ```bash
   firebase deploy --only functions
   ```

   This deploys:
   - `createPaymentRequest`
   - `fulfillPaymentRequest`
   - `expirePaymentRequests` (scheduled)

4. **Verify deployment**
   ```bash
   firebase functions:log
   ```

---

## Step 2: Configure Firestore Indexes

Create composite indexes for efficient queries:

1. **Go to Firebase Console** → Firestore Database → Indexes

2. **Create Index for Transaction History:**
   ```
   Collection: transactions
   Fields:
     - senderWallet (Ascending)
     - createdAt (Descending)
   ```

3. **Create Index for Filtered Transactions:**
   ```
   Collection: transactions
   Fields:
     - senderWallet (Ascending)
     - currency (Ascending)
     - createdAt (Descending)
   ```

4. **Create Index for Merchant Transactions:**
   ```
   Collection: transactions
   Fields:
     - merchantId (Ascending)
     - createdAt (Descending)
   ```

---

## Step 3: Update Firestore Security Rules

Add rules for payment requests and transactions:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Merchants collection
    match /merchants/{merchantId} {
      allow read: if resource.data.isActive == true;
      allow update: if request.auth != null && resource.data.walletAddress == request.auth.uid;
    }

    // Payment requests (readable by anyone, writable by Cloud Functions only)
    match /paymentRequests/{requestId} {
      allow read: if request.auth != null;
      allow write: if false; // Only Cloud Functions can write
    }

    // Transactions (readable by participants, writable by Cloud Functions only)
    match /transactions/{txId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.senderWallet ||
         request.auth.uid == resource.data.merchantWallet);
      allow write: if false; // Only Cloud Functions can write
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

---

## Step 4: Get Devnet USDC (Optional)

To test USDC payments, you need Devnet USDC:

### Option A: Use Solana Faucet
```bash
spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
spl-token mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU 100 <YOUR_TOKEN_ACCOUNT>
```

### Option B: Use Phantom Wallet Devnet Faucet
1. Switch Phantom to Devnet
2. Request SOL from faucet
3. Some devnet faucets also provide USDC

---

## Step 5: Testing the Complete Flow

### Test Setup

**You need:**
- 2 devices or 1 device + simulator
  - Device 1: Merchant (generates QR)
  - Device 2: Customer (scans and pays)
- Both devices must have:
  - Phantom or Solflare wallet installed
  - Devnet SOL (for gas fees)
  - Devnet USDC (optional, for USDC payments)

### Test Case 1: Merchant Dashboard

1. **Open app as Merchant**
   ```
   Sign in → Navigate to Merchant Dashboard
   ```

2. **Verify Dashboard Loads**
   - Shows merchant name
   - Stats display (total payments, SOL/USDC volume, rating)
   - Open/Closed toggle
   - Recent transactions (empty initially)

3. **Toggle Business Status**
   - Tap Open/Closed switch
   - Should show success alert
   - Verify isActive field updated in Firestore

### Test Case 2: Request Payment (Merchant)

1. **Tap "Request Payment" Button**

2. **Select Currency**
   - Tap SOL tab (should show current SOL price)
   - Tap USDC tab (should show ~$1.00)

3. **Enter Amount**
   - Type: 0.5 (for 0.5 SOL)
   - Should show USD equivalent (e.g., "≈ $95.00 USD")

4. **Use Quick Amount Buttons**
   - Tap "0.1 SOL" quick button
   - Amount should auto-fill

5. **Generate QR Code**
   - Tap "Generate QR Code"
   - Should see full-screen QR code
   - Should show countdown timer (starts at 10:00)
   - Should display amount and currency

6. **Verify Firestore**
   - Check `paymentRequests` collection
   - Should see new document with:
     - status: "pending"
     - expiresAt: ~10 minutes from now
     - amount, currency, merchantId

### Test Case 3: Scan QR and Pay (Customer)

1. **Open app as Customer**
   ```
   Sign in → Navigate to Map → Find merchant → View details
   OR
   Navigate to Scan QR screen directly
   ```

2. **Grant Camera Permission**
   - Should prompt for camera access
   - Grant permission

3. **Scan Merchant QR Code**
   - Point camera at merchant's QR on other device
   - Should auto-scan and fetch payment details

4. **Verify Payment Confirmation Screen**
   - Shows: Amount (0.5), Currency (SOL)
   - Shows: Merchant name
   - Shows: Payment method badge (purple for SOL)
   - "Confirm and Pay" button visible

5. **Execute Payment**
   - Tap "Confirm and Pay"
   - Mobile Wallet Adapter should open
   - Phantom/Solflare wallet prompts for approval
   - Approve transaction

6. **Wait for Confirmation**
   - Should show "Processing payment..." indicator
   - Transaction confirms on Solana (few seconds)

7. **Payment Success Screen**
   - Should navigate to success screen
   - Shows: Checkmark animation
   - Shows: Amount paid
   - Shows: Merchant name
   - Shows: Transaction signature (truncated)

8. **View on Explorer**
   - Tap "View on Solana Explorer"
   - Should open browser to Solana Explorer
   - Shows transaction details on Devnet

### Test Case 4: Transaction Verification

1. **Check Firestore (paymentRequests)**
   ```
   Status should be: "paid"
   paidAt: timestamp
   txSignature: <signature>
   senderWallet: <customer wallet>
   ```

2. **Check Firestore (transactions)**
   ```
   New document with:
   - merchantId, merchantName
   - senderWallet
   - amount, currency
   - txSignature
   - blockTime
   ```

3. **Check Firestore (merchants)**
   ```
   totalPaymentsCount: incremented by 1
   totalVolumeSOL or totalVolumeUSDC: incremented by amount
   ```

4. **Check Merchant Dashboard**
   - Stats should update immediately
   - Recent transactions should show new payment
   - Can tap transaction to view on Explorer

### Test Case 5: Transaction History (Customer)

1. **Navigate to Transaction History**

2. **Verify Transaction List**
   - Shows recent payment at top
   - Displays: merchant name, amount, currency, date/time
   - Displays: truncated transaction signature

3. **Test Filters**
   - Tap "ALL" - shows all transactions
   - Tap "SOL" - shows only SOL payments
   - Tap "USDC" - shows only USDC payments

4. **Test Pull-to-Refresh**
   - Pull down to refresh
   - Should reload transactions

5. **Test View Transaction**
   - Tap any transaction
   - Should open Solana Explorer

### Test Case 6: USDC Payment (Optional)

Repeat Test Case 2-4 but with USDC:

1. Merchant selects USDC tab
2. Enters amount (e.g., $10)
3. Generates QR
4. Customer scans and pays with USDC
5. Verify transaction completes successfully

**Note:** Customer must have USDC token account with balance!

### Test Case 7: QR Expiration

1. **Merchant generates QR code**

2. **Wait 10 minutes** (or adjust expiry in Cloud Function for faster testing)

3. **Try to scan expired QR**
   - Should show error: "Payment request has expired"

4. **Verify Scheduled Function Works**
   - Check `paymentRequests` collection
   - Expired request should have status: "expired"
   - `expirePaymentRequests` runs every 1 minute

### Test Case 8: Edge Cases

**Test: Scan already-paid QR**
- Generate QR, pay once
- Try to scan same QR again
- Should fail with "Payment request is paid"

**Test: Invalid amount**
- Enter 0 or negative amount
- Generate QR button should be disabled
- Entering >1,000,000 should show error

**Test: Insufficient balance**
- Try to pay with more SOL than you have
- MWA should show error
- Payment should fail gracefully

**Test: Cancel payment**
- Scan QR
- Tap "Cancel" button instead of "Confirm and Pay"
- Should return to previous screen

---

## Expected Behavior

### Payment Request Flow

```
Merchant Dashboard
↓
[Tap "Request Payment"]
↓
Request Payment Screen
  ├─ Select SOL/USDC tab
  ├─ Enter amount
  ├─ See live USD conversion
  └─ Tap "Generate QR"
↓
Call createPaymentRequest Cloud Function
  └─ Creates paymentRequests/{id} in Firestore
  └─ Sets expiresAt = now + 10 min
↓
Show QR Code (full screen)
  ├─ QR contains: requestId
  ├─ Countdown timer: 10:00 → 00:00
  └─ Auto-hide on expiry
```

### Payment Execution Flow

```
Customer opens Scan QR screen
↓
Grant camera permission
↓
Scan merchant's QR code
↓
Read requestId from QR
↓
Fetch paymentRequests/{requestId} from Firestore
↓
Validate:
  ├─ status === "pending"
  ├─ expiresAt > now
  └─ All fields present
↓
Show confirmation screen
  ├─ Amount + currency
  ├─ Merchant name
  └─ Payment method badge
↓
Tap "Confirm and Pay"
↓
Execute wallet-to-wallet transfer via MWA:
  ├─ SOL: SystemProgram.transfer
  └─ USDC: SPL Token createTransferInstruction
↓
Wait for transaction confirmation
↓
Call fulfillPaymentRequest Cloud Function
  ├─ Verify tx on Solana RPC
  ├─ Batch write:
  │   ├─ Update paymentRequest (status: "paid")
  │   ├─ Create transaction doc
  │   └─ Update merchant stats
  └─ Return success
↓
Navigate to Payment Success screen
  ├─ Animated checkmark
  ├─ Amount, merchant name, tx signature
  └─ "View on Explorer" button
```

---

## Troubleshooting

### QR Code Not Generating

**Problem:** Tap "Generate QR" but nothing happens

**Solutions:**
1. Check Cloud Function logs: `firebase functions:log`
2. Ensure merchant has `acceptsSol` or `acceptsUsdc` set to true
3. Verify user is authenticated
4. Check amount is valid (0 < amount <= 1,000,000)

### Camera Not Working

**Problem:** "Camera Permission Required" even after granting

**Solutions:**
1. Restart app
2. Check device Settings → App → Permissions → Camera
3. On iOS, check Info.plist has camera usage description
4. Rebuild app: `npx expo run:ios` or `npx expo run:android`

### Payment Fails with MWA Error

**Problem:** "Wallet adapter error" or transaction fails

**Solutions:**
1. Ensure wallet (Phantom/Solflare) is installed
2. Switch wallet to Devnet
3. Check wallet has sufficient SOL for gas fees
4. For USDC: Verify token account exists and has balance
5. Check Solana RPC is not rate-limiting (use paid RPC for production)

### Transaction Not Confirming

**Problem:** "Processing payment..." hangs forever

**Solutions:**
1. Check Solana network status: https://status.solana.com
2. Increase timeout in payment service
3. Check transaction on Explorer manually
4. Retry payment with fresh QR code

### USD Price Not Showing

**Problem:** Shows "$0.00 USD" or "Loading price..."

**Solutions:**
1. Check internet connection
2. CoinGecko API may be rate-limited (free tier)
3. Use fallback prices or paid API for production
4. Check CORS if testing on web

### Merchant Stats Not Updating

**Problem:** Payment succeeds but dashboard stats don't change

**Solutions:**
1. Pull to refresh dashboard
2. Check Cloud Function logs for errors in `fulfillPaymentRequest`
3. Verify batch write succeeded in Firestore
4. Ensure merchant document has correct `totalVolumeSOL` field

---

## Performance Optimization

### Reduce QR Generation Latency

1. **Pre-warm Cloud Function**
   - Set min instances: `functions.runWith({minInstances: 1})`
   - Costs more but eliminates cold starts

2. **Cache Price Data**
   - Store SOL/USDC prices in Firestore
   - Update every 5 minutes via scheduled function
   - Reduces CoinGecko API calls

### Improve Transaction Confirmation Speed

1. **Use Paid Solana RPC**
   - Helius, QuickNode, or Alchemy
   - Faster confirmation times
   - Higher rate limits

2. **Optimize MWA Settings**
   ```typescript
   preflightCommitment: "processed" // Faster than "confirmed"
   ```

3. **Parallel Processing**
   - Don't wait for Cloud Function response
   - Show success immediately after on-chain confirmation
   - Cloud Function updates Firestore async

---

## Security Considerations

### ✅ Implemented Security

1. **Server-Side TX Verification**: fulfillPaymentRequest verifies transaction on Solana RPC
2. **Expiry Mechanism**: Payment requests auto-expire after 10 minutes
3. **Firestore Security Rules**: Only Cloud Functions can write transactions
4. **Idempotency**: Cannot fulfill same request twice (status check)
5. **Amount Validation**: Min/max amount checks on server

### ⚠️ Known Limitations

1. **No Rate Limiting**: createPaymentRequest can be spammed
   - Add rate limiting per merchant (e.g., 10 requests/minute)

2. **No Refund Mechanism**: Payments are irreversible
   - Implement dispute resolution in Phase 5

3. **QR Code Replay Prevention**: Relies on expiry only
   - Consider adding nonce or one-time use flag

4. **Price Oracle Trust**: Uses CoinGecko (centralized)
   - For large amounts, use Pyth Network or Switchboard

---

## Production Checklist

Before going to mainnet:

- [ ] Replace Devnet RPC with Mainnet RPC in payment.ts
- [ ] Update USDC mint address to mainnet USDC
- [ ] Set up paid Solana RPC (Helius/QuickNode)
- [ ] Implement rate limiting on Cloud Functions
- [ ] Add error monitoring (Sentry)
- [ ] Enable Firebase App Check
- [ ] Test with real SOL/USDC on mainnet-beta
- [ ] Add transaction fee estimates
- [ ] Implement refund/dispute flow
- [ ] Add push notifications for payment success
- [ ] Set up Firestore backups
- [ ] Configure Cloud Function alerts

---

## File Structure

```
functions/src/
├── paymentFunctions.ts          # Payment Cloud Functions
└── index.ts                     # Export all functions

Mobileapp/
├── app/(protected)/
│   ├── merchant-dashboard.tsx   # Merchant stats & controls
│   ├── request-payment.tsx      # QR generation
│   ├── scan-qr.tsx             # Camera scanner & payment
│   ├── payment-success.tsx      # Success animation
│   └── transaction-history.tsx  # Paginated tx list
└── src/services/
    └── payment.ts              # SOL & USDC transfers via MWA
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     PAYMENT FLOW                        │
└─────────────────────────────────────────────────────────┘

MERCHANT SIDE:
┌─────────────┐
│  Merchant   │
│  Dashboard  │
└──────┬──────┘
       │
       ├─ Request Payment
       │   ├─ Enter amount
       │   ├─ Select SOL/USDC
       │   └─ Generate QR
       │
       ├─ createPaymentRequest()
       │   └─ Firestore: paymentRequests/{id}
       │        ├─ status: "pending"
       │        ├─ expiresAt: now + 10min
       │        └─ amount, currency, merchantWallet
       │
       └─ Show QR Code
            └─ QR contains: requestId only

CUSTOMER SIDE:
┌─────────────┐
│   Customer  │
│   Scan QR   │
└──────┬──────┘
       │
       ├─ Camera opens
       │   └─ Scan QR → get requestId
       │
       ├─ Fetch paymentRequests/{requestId}
       │   └─ Validate: pending & not expired
       │
       ├─ Confirm Payment
       │   ├─ Show amount, merchant name
       │   └─ Tap "Confirm and Pay"
       │
       ├─ Execute Payment (MWA)
       │   ├─ SOL: SystemProgram.transfer
       │   ├─ USDC: SPL Token transfer
       │   └─ Get txSignature
       │
       ├─ fulfillPaymentRequest(requestId, txSignature)
       │   ├─ Verify TX on Solana RPC
       │   ├─ Batch write:
       │   │   ├─ Update paymentRequest → "paid"
       │   │   ├─ Create transaction doc
       │   │   └─ Update merchant stats
       │   └─ Return success
       │
       └─ Payment Success Screen
            ├─ Animated checkmark ✓
            └─ View on Explorer link

SCHEDULED TASKS:
┌─────────────────────────┐
│ expirePaymentRequests() │ ← Runs every 1 minute
└─────────────────────────┘
       │
       └─ Find pending requests where expiresAt < now
            └─ Update status: "expired"
```

---

**Phase 4 Complete! 🎉💸**

You now have a fully functional crypto payment system with:
- QR code payment requests with expiry
- Direct wallet-to-wallet transfers (SOL & USDC)
- Real-time transaction verification
- Merchant dashboard with stats
- Complete transaction history
- Animated success screens

Ready for Phase 5: Reviews & Ratings! ⭐
