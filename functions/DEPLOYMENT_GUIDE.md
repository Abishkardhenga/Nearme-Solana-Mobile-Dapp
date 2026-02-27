# Firebase Cloud Functions Deployment Guide

## Important: Do NOT Paste Code in Firebase Console

You **do NOT** need to paste this code into firebase.com. Firebase Cloud Functions are deployed from your local machine using the Firebase CLI.

## Prerequisites

1. **Firebase CLI installed globally:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project created:**
   - Go to https://console.firebase.google.com/
   - Create a new project or use existing one
   - Note your project ID

3. **Firebase initialized in your project:**
   ```bash
   # Run this from /Users/abhiskardhenga/Desktop/Project 2026/Nearme/
   firebase login
   firebase init
   ```

   When prompted:
   - Select "Functions" (use spacebar to select)
   - Choose "Use an existing project" and select your Firebase project
   - Choose "TypeScript" as the language
   - Say "Yes" to ESLint
   - Say "Yes" to install dependencies

## Step-by-Step Deployment

### Step 1: Install Dependencies

```bash
cd /Users/abhiskardhenga/Desktop/Project\ 2026/Nearme/functions
npm install
```

### Step 2: Configure Solana Private Key

You need to set your Solana keypair for signing on-chain transactions:

```bash
# Get your Solana keypair as JSON array
cat ~/.config/solana/id.json

# Set it in Firebase config (replace [...] with your actual keypair array)
firebase functions:config:set solana.private_key='[123,45,67,...]'
```

**For local testing:**
- The functions will automatically use `~/.config/solana/id.json` if the config is not set
- No need to set the config for local development

### Step 3: Build the Functions

```bash
npm run build
```

This compiles your TypeScript code to JavaScript in the `lib/` directory.

### Step 4: Test Locally (Optional but Recommended)

```bash
npm run serve
```

This starts the Firebase Emulator Suite. Your functions will be available at:
- http://localhost:5001/YOUR-PROJECT-ID/us-central1/registerMerchant
- http://localhost:5001/YOUR-PROJECT-ID/us-central1/getNearbyMerchants
- http://localhost:5001/YOUR-PROJECT-ID/us-central1/createPaymentRequest
- http://localhost:5001/YOUR-PROJECT-ID/us-central1/fulfillPaymentRequest

Update your mobile app to point to these URLs for testing:
```typescript
// In src/services/firebase.ts
const functions = getFunctions(app);
if (__DEV__) {
  connectFunctionsEmulator(functions, "localhost", 5001);
}
```

### Step 5: Deploy to Firebase

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:registerMerchant
firebase deploy --only functions:getNearbyMerchants
firebase deploy --only functions:createPaymentRequest
firebase deploy --only functions:fulfillPaymentRequest
firebase deploy --only functions:expirePaymentRequests
```

**First deployment takes 5-10 minutes.** Subsequent deployments are faster.

### Step 6: Create Firestore Indexes

After deployment, create required database indexes:

1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index" and add:

**Index 1: Payment Requests Expiry**
- Collection ID: `paymentRequests`
- Fields:
  - `status` (Ascending)
  - `expiresAt` (Ascending)

**Index 2: Transaction History**
- Collection ID: `transactions`
- Fields:
  - `senderWallet` (Ascending)
  - `createdAt` (Descending)

**Index 3: Transaction History with Currency Filter**
- Collection ID: `transactions`
- Fields:
  - `senderWallet` (Ascending)
  - `currency` (Ascending)
  - `createdAt` (Descending)

**Index 4: Merchant Transactions**
- Collection ID: `transactions`
- Fields:
  - `merchantId` (Ascending)
  - `createdAt` (Descending)

Or use the Firebase CLI to create indexes automatically:

```bash
firebase deploy --only firestore:indexes
```

This will read from `firestore.indexes.json` in your project root.

### Step 7: Update Firestore Security Rules

Add these rules to Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Merchants collection
    match /merchants/{merchantId} {
      allow read: if true; // Anyone can read merchant data
      allow write: if request.auth != null && request.auth.uid == merchantId;
    }

    // Payment requests
    match /paymentRequests/{requestId} {
      allow read: if true; // Anyone can read to scan QR codes
      allow write: if false; // Only Cloud Functions can write
    }

    // Transactions
    match /transactions/{transactionId} {
      allow read: if request.auth != null &&
                     (resource.data.senderWallet == request.auth.uid ||
                      resource.data.merchantId == request.auth.uid);
      allow write: if false; // Only Cloud Functions can write
    }

    // Users collection (if you have one)
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Deployed Functions Overview

After deployment, you'll have these Cloud Functions:

### 1. registerMerchant (HTTPS Callable)
**Purpose:** Register new merchant with GPS verification and on-chain proof

**Called from mobile app:**
```typescript
const registerMerchant = httpsCallable(functions, 'registerMerchant');
await registerMerchant({name, category, walletAddress, location, acceptedCurrencies});
```

### 2. getNearbyMerchants (HTTPS Callable)
**Purpose:** Find merchants within radius using GeoFirestore

**Called from mobile app:**
```typescript
const getNearbyMerchants = httpsCallable(functions, 'getNearbyMerchants');
await getNearbyMerchants({latitude, longitude, radiusKm: 5, currency: 'SOL'});
```

### 3. createPaymentRequest (HTTPS Callable)
**Purpose:** Create QR code payment request with 10-min expiry

**Called from mobile app:**
```typescript
const createPaymentRequest = httpsCallable(functions, 'createPaymentRequest');
await createPaymentRequest({merchantId, amount: 0.5, currency: 'SOL'});
```

### 4. fulfillPaymentRequest (HTTPS Callable)
**Purpose:** Verify transaction on Solana and mark payment complete

**Called from mobile app:**
```typescript
const fulfillPaymentRequest = httpsCallable(functions, 'fulfillPaymentRequest');
await fulfillPaymentRequest({requestId, txSignature, senderWallet});
```

### 5. expirePaymentRequests (Scheduled - runs every 1 minute)
**Purpose:** Automatically expire old payment requests

**Runs automatically, no manual call needed**

## View Deployed Functions

After deployment, view your functions at:
https://console.firebase.google.com/project/YOUR-PROJECT-ID/functions/list

## Update Mobile App URLs

After deployment, your mobile app will automatically use the production URLs:

```typescript
// In src/services/firebase.ts
import {getFunctions} from 'firebase/functions';

const functions = getFunctions(app);
// Functions automatically point to production after deployment
```

## Monitoring and Logs

View function logs:
```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only registerMerchant

# Tail logs in real-time
firebase functions:log --only createPaymentRequest --follow
```

Or view in Firebase Console:
https://console.firebase.google.com/project/YOUR-PROJECT-ID/functions/logs

## Troubleshooting

### Error: "Failed to configure Solana keypair"
**Solution:** Set the private key config:
```bash
firebase functions:config:set solana.private_key='[...]'
firebase deploy --only functions
```

### Error: "Missing index" in Firestore queries
**Solution:** Click the link in the error message or manually create the index in Firebase Console

### Error: "Insufficient permissions"
**Solution:** Update Firestore security rules (see Step 7 above)

### Function timeout (>60s)
**Solution:** Increase timeout in functions/src/index.ts:
```typescript
export const functionName = functions
  .runWith({timeoutSeconds: 120})
  .https.onCall(async (data, context) => {
    // ...
  });
```

### High costs warning
**Monitor usage:**
- Firebase Console → Functions → Usage tab
- Set up budget alerts in Google Cloud Console

## Cost Optimization

Free tier includes:
- 2 million function invocations/month
- 400,000 GB-seconds of compute time
- 200,000 CPU-seconds of compute time

Tips:
- Use Firestore offline persistence in mobile app to reduce reads
- Cache frequently accessed data
- Use scheduled functions sparingly (expirePaymentRequests runs 1,440 times/day)

## Production Checklist

Before going live:

- [ ] Deploy all functions successfully
- [ ] Create all Firestore indexes
- [ ] Update Firestore security rules
- [ ] Set Solana private key config
- [ ] Test all functions with mobile app
- [ ] Monitor function logs for errors
- [ ] Set up billing alerts
- [ ] Switch Solana RPC to mainnet (in functions/src/config.ts)
- [ ] Update USDC mint address to mainnet
- [ ] Test with real SOL/USDC on devnet first

## Updating Functions

When you make changes:

```bash
cd functions
npm run build
firebase deploy --only functions
```

Only changed functions will be redeployed.

## Environment Variables

Current config stored in Firebase:
```bash
# View all config
firebase functions:config:get

# Set new config
firebase functions:config:set key.subkey='value'

# Remove config
firebase functions:config:unset key.subkey
```

## Support

- Firebase Documentation: https://firebase.google.com/docs/functions
- Solana Web3.js: https://solana-labs.github.io/solana-web3.js/
- GeoFirestore: https://github.com/MichaelSolati/geofirestore-js

## Summary

**You deploy from your local machine, NOT from firebase.com:**

1. `cd functions && npm install`
2. `firebase functions:config:set solana.private_key='[...]'`
3. `npm run build`
4. `firebase deploy --only functions`
5. Create Firestore indexes in console
6. Update security rules
7. Test with mobile app

That's it! Your Cloud Functions are now live and callable from your mobile app.
