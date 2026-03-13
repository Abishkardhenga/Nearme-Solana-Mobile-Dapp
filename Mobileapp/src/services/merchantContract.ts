import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import {transact} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";

// Treasury wallet that receives registration fees
const TREASURY_WALLET = new PublicKey("6dP9shzmifUZbyiRopa3HjcD8T31EFDM7y4zhFP8UsTV");

// Registration fee
export const REGISTRATION_FEE_LAMPORTS = 10_000_000; // 0.01 SOL
export const REGISTRATION_FEE_SOL = 0.01;

// App identity for wallet authorization
const APP_IDENTITY = {
  name: "NearMe",
  uri: "https://nearme.app",
  icon: "favicon.ico",
};

interface RegisterMerchantParams {
  merchantWalletPubkey: PublicKey;
  merchantId: string;
  businessName: string;
  latitude: number;
  longitude: number;
}

/**
 * Register a merchant by paying registration fee directly to treasury
 * Simple native SOL transfer - no smart contract needed!
 *
 * @returns Transaction signature on success
 */
export async function registerMerchantOnChain(
  params: RegisterMerchantParams
): Promise<{success: boolean; signature?: string; error?: string}> {
  console.log("💰 Starting merchant registration payment...");
  console.log("  Business:", params.businessName);
  console.log("  Amount:", REGISTRATION_FEE_SOL, "SOL");
  console.log("  Treasury:", TREASURY_WALLET.toBase58());

  try {
    const connection = new Connection(clusterApiUrl("testnet"), "confirmed");

    // Create simple transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: params.merchantWalletPubkey,
        toPubkey: TREASURY_WALLET,
        lamports: REGISTRATION_FEE_LAMPORTS,
      })
    );

    // Get latest blockhash
    const {blockhash} = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = params.merchantWalletPubkey;

    console.log("📱 Opening wallet to sign payment...");

    // Sign transaction via Mobile Wallet Adapter (faster, no timeout)
    const signedTransaction = await transact(async (wallet) => {
      console.log("🔐 Authorizing wallet...");

      // Authorize wallet
      const authResult = await wallet.authorize({
        identity: APP_IDENTITY,
        chain: "solana:testnet",
      });

      console.log("✅ Wallet authorized:", authResult.accounts[0].address);

      // Sign transaction only (don't send from wallet to avoid timeout)
      console.log("📝 Requesting transaction signature...");
      const signedTxs = await wallet.signTransactions({
        transactions: [transaction],
      });

      console.log("✅ Transaction signed!");
      return signedTxs[0];
    });

    console.log("📤 Sending signed transaction to network...");

    // Send the signed transaction ourselves (much faster)
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      }
    );

    console.log("✅ Transaction sent! Signature:", signature);
    console.log("⏳ Waiting for confirmation...");

    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    console.log("✅ Payment confirmed!");
    console.log("  Signature:", signature);

    return {
      success: true,
      signature,
    };
  } catch (error: any) {
    console.error("❌ Payment failed:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return {
      success: false,
      error: error.message || "Failed to send registration payment",
    };
  }
}

/**
 * Check if a merchant is registered
 * Note: With simple payments, registration tracking happens in your backend/database
 */
export async function isMerchantRegisteredOnChain(_merchantWalletPubkey: PublicKey): Promise<boolean> {
  // Without smart contract, you'll track registration in your backend after payment
  console.log("Note: Registration check should be done via your backend/database");
  return false;
}

/**
 * Get merchant account data
 * Note: With simple payments, merchant data is stored in your backend/database
 */
export async function getMerchantAccountData(_merchantWalletPubkey: PublicKey): Promise<any | null> {
  // Without smart contract, merchant data should come from your backend
  console.log("Note: Merchant data should be fetched from your backend/database");
  return null;
}
