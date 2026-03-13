# NearMe - Discover Crypto-Friendly Merchants 🗺️💰

<p align="center">
  <img src="https://img.shields.io/badge/Solana-Devnet-9945FF?style=for-the-badge&logo=solana" alt="Solana">
  <img src="https://img.shields.io/badge/React_Native-Expo-61DAFB?style=for-the-badge&logo=react" alt="React Native">
  <img src="https://img.shields.io/badge/Anchor-Framework-FF6B6B?style=for-the-badge" alt="Anchor">
  <img src="https://img.shields.io/badge/Firebase-Backend-FFCA28?style=for-the-badge&logo=firebase" alt="Firebase">
</p>

---

## 🎬 Resources

|                     |                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **▶ Live Demo**     | [Watch the full product demo on Loom]


Consumer flow/ demo  :  [View Demo ]( https://www.loom.com/share/8070ff68d02f4acb8fde1496827b52dd  )

Merchant flow / demo : [View Demo ]( https://www.loom.com/share/bc53995feac24803ad02f091bf479044 )




|
| **📊 Presentation** | [View the project presentation on Google Drive](https://drive.google.com/file/d/1Y64HRiFlg3xJJ3w5qR8gvp7mdHW5dpwH/view) |

---

## 🎯 The Problem

**You have crypto, but where can you spend it?**

Cryptocurrency adoption is growing, but finding physical businesses that accept SOL or USDC for everyday purchases remains a challenge:

- 🔍 **Discovery Gap**: No easy way to find nearby cafes, restaurants, or shops that accept crypto payments
- 🤝 **Trust Issues**: How do you know if a merchant genuinely accepts crypto before visiting?
- 📍 **Location Barrier**: Existing crypto payment solutions don't help you discover merchants based on your location
- 🏪 **Merchant Onboarding**: Small businesses struggle to signal crypto acceptance to potential customers

## 💡 The Solution

**NearMe** is a decentralized, location-based discovery platform that bridges the gap between crypto holders and merchants:

### For Crypto Holders:

- 🗺️ **Find Crypto Merchants Near You** - Open the map and instantly see all SOL/USDC accepting cafes, restaurants, and shops in your area
- 💳 **Pay Seamlessly** - Scan QR codes and pay directly from your Solana mobile wallet (Phantom, Solflare, etc.)
- ✅ **Verified Merchants** - Every merchant is verified on-chain with a registration fee, preventing fake listings

### For Business Owners:

- 🚀 **Easy Registration** - List your business on-chain by paying a small 0.01 SOL registration fee
- 📈 **Attract Crypto Customers** - Get discovered by nearby crypto holders actively looking to spend
- 📊 **Dashboard Analytics** - Track payments, manage business details, and monitor your crypto transactions
- 🌐 **Global Visibility** - Your business becomes part of the decentralized merchant network

## ✨ Key Features

### 🔐 Blockchain-Verified Registration

- Anti-spam 0.01 SOL registration fee recorded on Solana
- Immutable merchant records stored on-chain
- Location coordinates verified and stored via smart contract

### 📱 Mobile-First Experience

- Native mobile app built with React Native + Expo
- Solana Mobile Wallet Adapter integration
- Real-time GPS tracking and location verification
- Seamless wallet connection (Phantom, Solflare, etc.)

### 💰 Multi-Token Support

- Accept payments in SOL
- Accept payments in USDC
- QR code-based payment system
- Instant transaction confirmations

### 🗺️ Google Maps Integration

- Interactive map showing all verified merchants
- Filter by category (Restaurant, Cafe, Bar, Shop, Service)
- Distance-based merchant discovery
- In-app directions to merchant locations

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (React Native)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Discover   │  │   Payments   │  │   Merchant   │      │
│  │   Merchants  │  │   (QR Code)  │  │   Dashboard  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Solana Mobile Wallet Adapter                │
└─────────────────────────────────────────────────────────────┘
          │                                      │
          ▼                                      ▼
┌──────────────────────┐            ┌──────────────────────────┐
│   Firebase Backend   │            │   Solana Smart Contract  │
│  ┌────────────────┐  │            │  ┌────────────────────┐  │
│  │   Firestore    │  │            │  │ Merchant Registry  │  │
│  │  (Merchant DB) │  │            │  │  (On-chain Proof) │  │
│  └────────────────┘  │            │  └────────────────────┘  │
│  ┌────────────────┐  │            │   Program ID:            │
│  │ Storage (Photos)│  │            │   CzvToWP...YTNd         │
│  └────────────────┘  │            │   (Devnet)               │
└──────────────────────┘            └──────────────────────────┘
```

## 📸 Screenshots

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

## 🛠️ Tech Stack

### Frontend

- **React Native** - Cross-platform mobile framework
- **Expo** - Development tooling and build system
- **React Navigation** - Navigation system
- **Zustand** - State management
- **Google Maps API** - Interactive maps

### Blockchain

- **Solana** - High-performance blockchain (Devnet)
- **Anchor Framework** - Rust-based smart contract framework
- **Solana Mobile Wallet Adapter** - Mobile wallet integration
- **@solana/web3.js** - JavaScript SDK for Solana

### Backend

- **Firebase Firestore** - NoSQL database for merchant data
- **Firebase Storage** - Image storage for business photos
- **Firebase Authentication** - User authentication

### Smart Contract Details

- **Language**: Rust (Anchor Framework)
- **Program ID**: `CzvToWP9ryYfPkdJ8wxahvJwQKQ9aWLpAvdhYszHYTNd` (Devnet)
- **Registration Fee**: 0.01 SOL (10,000,000 lamports)
- **Account Type**: PDA (Program Derived Address) for each merchant

## 📂 Project Structure

```
Nearme/
├── Mobileapp/                    # React Native mobile application
│   ├── app/
│   │   ├── (public)/            # Public screens (login, signup, onboarding)
│   │   └── (protected)/         # Protected screens (map, dashboard, payments)
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── hooks/               # Custom React hooks (useAuth, useWallet)
│   │   ├── services/            # Service layer (Firebase, blockchain)
│   │   │   ├── firebase.ts      # Firebase configuration
│   │   │   └── merchantContract.ts  # Smart contract interaction
│   │   ├── store/               # Zustand state management
│   │   └── navigation/          # Navigation configuration
│   └── package.json
│
├── nearme_contract/             # Solana smart contract
│   ├── programs/
│   │   └── nearme_contract/
│   │       └── src/
│   │           └── lib.rs       # Main contract logic
│   ├── tests/
│   │   └── nearme_contract.ts   # Contract test suite (23 tests)
│   └── Anchor.toml              # Anchor configuration
│
└── functions/                   # Firebase Cloud Functions
    └── index.js                 # Backend serverless functions
```

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Expo CLI**: `npm install -g expo-cli`
- **Solana CLI**: Follow [Solana installation guide](https://docs.solana.com/cli/install-solana-cli-tools)
- **Anchor Framework**: `cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install latest && avm use latest`
- **Rust**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/Abishkardhenga/Nearme-Solana-Mobile-Dapp
cd Nearme
```

2. **Setup Mobile App**

```bash
cd Mobileapp
npm install
```

3. **Configure Environment Variables**

Create a `.env` file in `Mobileapp/`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

4. **Run the Mobile App**

```bash
npx expo start
```

5. **Setup Smart Contract** (Optional - already deployed)

```bash
cd ../nearme_contract
anchor build
anchor deploy --provider.cluster devnet
```

## 🔗 Smart Contract

### Program ID (Devnet)

```
CzvToWP9ryYfPkdJ8wxahvJwQKQ9aWLpAvdhYszHYTNd
```

### Contract Features

#### Merchant Registration Instruction

```rust
pub fn register_merchant(
    ctx: Context<RegisterMerchant>,
    merchant_id: String,
    business_name: String,
    lat: i64,
    lng: i64,
) -> Result<()>
```

**What it does:**

- ✅ Validates business name (1-64 characters)
- ✅ Validates GPS coordinates
- ✅ Collects 0.01 SOL registration fee
- ✅ Creates immutable merchant account (PDA)
- ✅ Stores location data on-chain
- ✅ Emits `MerchantRegisteredEvent`

**Account Structure:**

```rust
#[account]
pub struct MerchantAccount {
    pub merchant: Pubkey,        // Merchant wallet address
    pub business_name: String,    // Business name (max 64 chars)
    pub lat: i64,                 // Latitude (scaled by 1e6)
    pub lng: i64,                 // Longitude (scaled by 1e6)
    pub registered_at: i64,       // Unix timestamp
    pub is_active: bool,          // Active status
    pub bump: u8,                 // PDA bump seed
}
```

### Why On-Chain Registration?

1. **Prevents Spam**: 0.01 SOL fee makes it costly to create fake listings
2. **Immutability**: Once registered, merchant records can't be altered
3. **Transparency**: Anyone can verify merchant registration on Solana explorer
4. **Decentralization**: No central authority controls merchant listings

## 🎮 How to Use

### For Customers

1. **Download & Setup**
   - Install the NearMe app
   - Connect your Solana wallet (Phantom, Solflare, etc.)

2. **Discover Merchants**
   - Open the map to see nearby crypto-accepting merchants
   - Filter by category (Restaurant, Cafe, Bar, Shop, Service)
   - View business details, hours, and accepted tokens

3. **Make Payment**
   - Visit the merchant
   - Scan their QR code
   - Confirm payment in your wallet
   - Instant transaction confirmation

### For Merchants

1. **Register Your Business**
   - Sign up and connect your Solana wallet
   - Navigate to "Register as Merchant"
   - Pay 0.01 SOL registration fee (one-time)

2. **Complete Business Profile**
   - Add business name, category, description
   - Upload business photo
   - Set opening hours
   - Mark location on map (GPS verified)
   - Select accepted tokens (SOL/USDC)

3. **Start Accepting Payments**
   - Access your merchant dashboard
   - Generate payment QR codes
   - Track transactions in real-time
   - Monitor payment volume and statistics

## 🧪 Testing

### Smart Contract Tests

Run the comprehensive test suite (23 tests):

```bash
cd nearme_contract
anchor test
```

**Test Coverage:**

- ✅ Merchant registration with valid data
- ✅ Registration fee payment verification
- ✅ Duplicate registration prevention
- ✅ Input validation (business name, coordinates)
- ✅ PDA derivation correctness
- ✅ Event emission verification
- ✅ Location proof functionality (12 tests)

## 🌟 What Makes NearMe Special?

### 1. **Real-World Utility**

Unlike many crypto projects, NearMe solves an actual problem: connecting crypto holders with businesses that accept their tokens for real-world purchases.

### 2. **Blockchain-Verified Trust**

The 0.01 SOL registration fee creates skin in the game. Merchants must commit funds on-chain, ensuring only serious businesses register.

### 3. **Mobile-First Design**

Built specifically for mobile with Solana Mobile Wallet Adapter, providing a seamless experience for on-the-go crypto payments.

### 4. **Decentralized Architecture**

Merchant registrations live permanently on Solana's blockchain, making the merchant directory censorship-resistant and globally accessible.

### 5. **Low-Friction Onboarding**

For merchants: One 0.01 SOL payment and you're listed. For customers: Connect wallet and start discovering.

## 🎯 Future Roadmap

- [ ] **Mainnet Deployment** - Move from devnet to mainnet-beta
- [ ] **Loyalty Programs** - NFT-based loyalty cards for repeat customers
- [ ] **Review System** - On-chain reviews and ratings
- [ ] **Merchant Analytics** - Detailed transaction analytics dashboard
- [ ] **Multi-Chain Support** - Expand to other blockchains (Ethereum L2s, Base, etc.)
- [ ] **Merchant Verification Tiers** - Premium verification for established businesses
- [ ] **Push Notifications** - Alert users of nearby merchants and special offers
- [ ] **In-App Chat** - Direct messaging between customers and merchants

## 👥 Team

Built with ❤️ by developers passionate about crypto adoption and real-world blockchain utility.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support & Contact

- **GitHub Issues**: [Report bugs or request features](https://github.com/Abishkardhenga/Nearme-Solana-Mobile-Dapp/issues)
- **Email**: support@nearme.io (Coming soon)

## 🏆 Hackathon Submission

This project demonstrates:

- ✅ **Real-world problem solving** - Bridging crypto and physical commerce
- ✅ **Blockchain innovation** - On-chain merchant verification using Solana
- ✅ **Mobile-first approach** - Native mobile app with Solana Mobile Wallet Adapter
- ✅ **Complete full-stack** - Smart contract, mobile app, and backend integration
- ✅ **Working prototype** - Fully functional on Solana devnet

---

<p align="center">
  <strong>⚠️ Currently deployed on Solana Devnet - Use test SOL only</strong>
</p>

<p align="center">
  Made with 💜 for the Solana ecosystem
</p>
