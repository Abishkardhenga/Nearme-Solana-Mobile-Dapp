# NearMe - Solana Mobile DApp 🗺️

A decentralized location-based merchant discovery platform built on Solana blockchain with React Native.

> Google Maps for Solana - Discover nearby merchants and pay with SOL/USDC

## Features

- 🗺️ **Discover Nearby Merchants** - Find crypto-accepting businesses near you
- 💰 **Instant Payments** - Pay with SOL or USDC directly from your mobile wallet
- 🏪 **Merchant Registration** - Register your business on-chain with 0.01 SOL fee
- 🔐 **Blockchain Verified** - All merchants are verified through smart contract
- 📱 **Mobile Wallet Integration** - Connect with Phantom, Solflare, or any Solana wallet
- 🎯 **Real-time GPS** - Accurate location tracking and verification

## Tech Stack

- **Frontend**: React Native + Expo
- **Blockchain**: Solana (Devnet)
- **Smart Contracts**: Anchor Framework (Rust)
- **Wallet**: Solana Mobile Wallet Adapter
- **Backend**: Firebase (Firestore + Storage)
- **Maps**: Google Maps API

## Screenshots

### Onboarding & Authentication
<img src="screenshots/onboarding.png" width="250"> <img src="screenshots/login.png" width="250"> <img src="screenshots/signup.png" width="250">

### Discover Merchants
<img src="screenshots/map-home.png" width="250"> <img src="screenshots/merchant-detail.png" width="250">

### Merchant Dashboard
<img src="screenshots/register-merchant.png" width="250"> <img src="screenshots/merchant-dashboard.png" width="250"> <img src="screenshots/business-details.png" width="250">

### Payments
<img src="screenshots/scan-qr.png" width="250"> <img src="screenshots/request-payment.png" width="250"> <img src="screenshots/payment-success.png" width="250">

### Profile
<img src="screenshots/profile.png" width="250"> <img src="screenshots/saved-restaurants.png" width="250">

## Project Structure

```
Nearme/
├── Mobileapp/              # React Native mobile application
│   ├── app/               # App screens and navigation
│   ├── src/               # Source code (components, hooks, services)
│   └── package.json       # Mobile app dependencies
├── nearme_contract/       # Solana smart contract
│   ├── programs/          # Anchor program source (Rust)
│   ├── tests/             # Smart contract tests
│   └── Anchor.toml        # Anchor configuration
└── functions/             # Firebase Cloud Functions
```

## Smart Contract

**Program ID**: `CzvToWP9ryYfPkdJ8wxahvJwQKQ9aWLpAvdhYszHYTNd` (Devnet)

The NearMe smart contract handles:
- Merchant registration with 0.01 SOL anti-spam fee
- Location verification and GPS coordinate storage
- Immutable on-chain merchant records

## Installation

### Prerequisites
- Node.js 18+
- Expo CLI
- Solana CLI
- Anchor Framework

### Setup

```bash
# Clone repository
git clone https://github.com/Abishkardhenga/Nearme-Solana-Mobile-Dapp
cd Nearme

# Mobile App
cd Mobileapp
npm install
npx expo start

# Smart Contract
cd ../nearme_contract
anchor build
anchor deploy --provider.cluster devnet
```

## Configuration

Create `.env` in `Mobileapp/`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
```

## How It Works

**For Customers:**
1. Connect Solana wallet
2. Browse nearby merchants on map
3. Scan QR code and pay with SOL/USDC

**For Merchants:**
1. Pay 0.01 SOL registration fee (on-chain)
2. Add business details and location
3. Generate QR codes for payments
4. Track transactions in dashboard

## Testing

```bash
# Smart Contract (23 tests)
cd nearme_contract
anchor test
```

## License

MIT License

---

**⚠️ Currently on Solana Devnet - Use test SOL only**
