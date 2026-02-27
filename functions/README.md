# NearMe Cloud Functions

Firebase Cloud Functions for merchant management and discovery.

## Functions

### `registerMerchant`

HTTPS callable function that:
1. Verifies merchant's GPS location using 4-layer defense system
2. Creates immutable on-chain location proof using Solana/Anchor
3. Writes merchant data to Firestore

### `getNearbyMerchants`

HTTPS callable function that:
1. Uses GeoFirestore queries for efficient spatial search
2. Returns merchants within specified radius (default 5km)
3. Filters by payment methods (SOL/USDC) and category
4. Calculates exact distances using Haversine formula
5. Returns sorted results (closest first)

### `createPaymentRequest`

HTTPS callable function that:
1. Creates payment request document in Firestore
2. Sets 10-minute expiry time
3. Validates merchant permissions and accepted currencies
4. Returns requestId for QR code generation

### `fulfillPaymentRequest`

HTTPS callable function that:
1. Verifies transaction signature on Solana RPC
2. Validates sender, recipient, and transaction status
3. Batch writes: marks request paid, creates transaction record, updates merchant stats
4. Returns success confirmation

### `expirePaymentRequests`

Scheduled function (runs every 1 minute) that:
1. Queries for pending payment requests past expiry time
2. Updates expired requests to status: "expired"
3. Prevents usage of stale QR codes

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Solana keypair:
   ```bash
   # Get your keypair as JSON array
   cat ~/.config/solana/id.json

   # Set Firebase config
   firebase functions:config:set solana.private_key='[1,2,3,...]'
   ```

3. Build:
   ```bash
   npm run build
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

## Local Testing

```bash
npm run serve
```

Then call the function from your mobile app using the local emulator URL.

## Environment Variables

- `SOLANA_PRIVATE_KEY`: Server keypair for signing on-chain transactions (production)
- Falls back to `~/.config/solana/id.json` if not set (local development)

## GPS Verification Layers

1. **Mock Detection**: Rejects fake GPS apps
2. **Accuracy Check**: Rejects GPS accuracy > 100m or <= 0
3. **Distance Check**: Rejects if merchant is > 50m from claimed location
4. **IP Cross-Check**: Logs IP country ≠ GPS country (no block)

## Dependencies

- `@solana/web3.js`: Solana blockchain interaction
- `@project-serum/anchor`: Anchor program interaction
- `geofire-common`: Geohashing for spatial queries
- `firebase-admin`: Firestore database
- `firebase-functions`: Cloud Functions framework
- `node-fetch`: HTTP requests for geolocation APIs
