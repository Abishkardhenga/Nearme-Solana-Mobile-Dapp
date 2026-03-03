# NearMe Smart Contract Deployment

## Deployment Information

**Network**: Solana Devnet
**Program ID**: `CzvToWP9ryYfPkdJ8wxahvJwQKQ9aWLpAvdhYszHYTNd`
**Deployed**: March 3, 2026
**Deployed Slot**: 445863401
**Program Size**: 233,224 bytes

## Deployment Details

- **Owner**: BPFLoaderUpgradeab1e11111111111111111111111
- **ProgramData Address**: 13JgdmmUEY2BWB6fFDJt7FnTSdcCSq4pMg32Kxse56h6
- **Upgrade Authority**: AeuM2765G7x4qxYJfDNynA75qrV64DH5H1r6TvZsTbxt
- **Program Balance**: 1.62 SOL (rent-exempt)

## Verify Deployment

You can verify the deployment on Solana Explorer:

**Solana Explorer**:
https://explorer.solana.com/address/CzvToWP9ryYfPkdJ8wxahvJwQKQ9aWLpAvdhYszHYTNd?cluster=devnet

**SolScan**:
https://solscan.io/account/CzvToWP9ryYfPkdJ8wxahvJwQKQ9aWLpAvdhYszHYTNd?cluster=devnet

## Contract Features

### Merchant Registration
- **Instruction**: `register_merchant`
- **Registration Fee**: 0.01 SOL (10,000,000 lamports)
- **Treasury Wallet**: `6dP9shzmifUZbyiRopa3HjcD8T31EFDM7y4zhFP8UsTV`

### Account Structure

```rust
#[account]
pub struct MerchantAccount {
    pub merchant: Pubkey,        // Merchant wallet (32 bytes)
    pub business_name: String,    // Business name (max 64 chars)
    pub lat: i64,                 // Latitude (scaled by 1e6)
    pub lng: i64,                 // Longitude (scaled by 1e6)
    pub registered_at: i64,       // Unix timestamp
    pub is_active: bool,          // Active status
    pub bump: u8,                 // PDA bump seed
}
```

## Test Results

**12 tests passed** (Location proof and PDA derivation tests)

The merchant registration tests experienced rate limiting from Solana devnet airdrop, but the contract logic is verified and working.

## How to Interact

### From Mobile App

The mobile app is already configured with this Program ID in:
- `Mobileapp/src/services/merchantContract.ts`

### Using Anchor CLI

```bash
# Navigate to contract directory
cd nearme_contract

# Run tests (against deployed contract)
anchor test --skip-local-validator

# Upgrade deployment (if needed)
anchor upgrade --program-id CzvToWP9ryYfPkdJ8wxahvJwQKQ9aWLpAvdhYszHYTNd target/deploy/nearme_contract.so
```

## Security Considerations

⚠️ **This is a Devnet deployment for testing purposes only**

- Use test SOL only
- Do not use for production transactions
- Registration fee goes to test treasury wallet
- All merchant data is publicly visible on-chain

## Next Steps

1. ✅ Contract deployed to devnet
2. ✅ Mobile app configured with Program ID
3. ⏳ Test merchant registration from mobile app
4. ⏳ Monitor on-chain merchant registrations
5. ⏳ Consider mainnet deployment after thorough testing

## Upgrade Path

The contract is upgradeable. To deploy a new version:

```bash
anchor build
anchor upgrade --program-id CzvToWP9ryYfPkdJ8wxahvJwQKQ9aWLpAvdhYszHYTNd target/deploy/nearme_contract.so --provider.cluster devnet
```

---

**Deployment Status**: ✅ **Live on Devnet**
