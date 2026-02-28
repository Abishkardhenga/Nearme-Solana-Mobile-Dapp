
import "../polyfills"

import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {transact} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";

// Devnet USDC mint address
const USDC_MINT_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// Devnet RPC endpoint
const DEVNET_RPC = "https://api.devnet.solana.com";
const connection = new Connection(DEVNET_RPC, "confirmed");

export interface PaymentResult {
  txSignature: string;
  success: boolean;
  error?: string;
}

/**
 * Pay with SOL using Mobile Wallet Adapter
 *
 * Creates a direct wallet-to-wallet transfer transaction
 *
 * @param senderPubkey - The sender's public key (from MWA)
 * @param merchantWallet - The merchant's wallet address (string)
 * @param amountSOL - Amount in SOL (will be converted to lamports)
 * @returns Transaction signature
 */
export async function payWithSOL(
  senderPubkey: PublicKey,
  merchantWallet: string,
  amountSOL: number
): Promise<PaymentResult> {
  try {
    const merchantPubkey = new PublicKey(merchantWallet);
    const lamports = Math.round(amountSOL * LAMPORTS_PER_SOL);

    console.log(`Initiating SOL transfer: ${amountSOL} SOL (${lamports} lamports) to ${merchantWallet}`);

    const txSignature = await transact(async (wallet) => {
      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: senderPubkey,
        toPubkey: merchantPubkey,
        lamports,
      });

      // Create transaction
      const transaction = new Transaction().add(transferInstruction);

      // Get recent blockhash
      const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPubkey;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      // Sign and send transaction using MWA
      const signedTransactions = await wallet.signTransactions({
        transactions: [transaction],
      });

      const serialized = signedTransactions[0].serialize();
      const signature = await connection.sendRawTransaction(serialized, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      console.log(`SOL transfer transaction sent: ${signature}`);

      // Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return signature;
    });

    return {
      txSignature,
      success: true,
    };
  } catch (error: any) {
    console.error("SOL payment failed:", error);
    return {
      txSignature: "",
      success: false,
      error: error.message || "Payment failed",
    };
  }
}

/**
 * Pay with USDC using Mobile Wallet Adapter
 *
 * Creates an SPL Token transfer transaction
 * USDC has 6 decimal places
 *
 * @param senderPubkey - The sender's public key (from MWA)
 * @param merchantWallet - The merchant's wallet address (string)
 * @param amountUSDC - Amount in USDC (will be converted to micro-USDC)
 * @returns Transaction signature
 */
export async function payWithUSDC(
  senderPubkey: PublicKey,
  merchantWallet: string,
  amountUSDC: number
): Promise<PaymentResult> {
  try {
    const merchantPubkey = new PublicKey(merchantWallet);
    const microUSDC = Math.round(amountUSDC * 1_000_000); // 6 decimals

    console.log(`Initiating USDC transfer: ${amountUSDC} USDC (${microUSDC} micro-USDC) to ${merchantWallet}`);

    const txSignature = await transact(async (wallet) => {
      // Get associated token accounts
      const senderATA = await getAssociatedTokenAddress(USDC_MINT_DEVNET, senderPubkey);

      const merchantATA = await getAssociatedTokenAddress(USDC_MINT_DEVNET, merchantPubkey);

      // Check if sender has USDC token account
      const senderAccount = await connection.getAccountInfo(senderATA);
      if (!senderAccount) {
        throw new Error("You don't have a USDC token account. Please acquire some USDC first.");
      }

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        senderATA, // source
        merchantATA, // destination
        senderPubkey, // owner
        microUSDC, // amount
        [], // multisigners
        TOKEN_PROGRAM_ID
      );

      // Create transaction
      const transaction = new Transaction().add(transferInstruction);

      // Get recent blockhash
      const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPubkey;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      // Sign and send transaction using MWA
      const signedTransactions = await wallet.signTransactions({
        transactions: [transaction],
      });

      const serialized = signedTransactions[0].serialize();
      const signature = await connection.sendRawTransaction(serialized, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      console.log(`USDC transfer transaction sent: ${signature}`);

      // Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return signature;
    });

    return {
      txSignature,
      success: true,
    };
  } catch (error: any) {
    console.error("USDC payment failed:", error);
    return {
      txSignature: "",
      success: false,
      error: error.message || "Payment failed",
    };
  }
}

/**
 * Get SOL balance for a wallet
 */
export async function getSOLBalance(pubkey: PublicKey): Promise<number> {
  try {
    const balance = await connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("Failed to get SOL balance:", error);
    return 0;
  }
}

/**
 * Get USDC balance for a wallet
 */
export async function getUSDCBalance(pubkey: PublicKey): Promise<number> {
  try {
    const ata = await getAssociatedTokenAddress(USDC_MINT_DEVNET, pubkey);
    const account = await connection.getAccountInfo(ata);

    if (!account) {
      return 0;
    }

    // Parse token account data (simplified - in production use @solana/spl-token's getAccount)
    // For now, return 0 as placeholder
    return 0;
  } catch (error) {
    console.error("Failed to get USDC balance:", error);
    return 0;
  }
}

/**
 * Get current SOL price in USD from CoinGecko
 */
export async function getSOLPriceUSD(): Promise<number> {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const data = await response.json();
    return data.solana?.usd || 0;
  } catch (error) {
    console.error("Failed to fetch SOL price:", error);
    return 0;
  }
}

/**
 * Get current USDC price in USD (should always be ~$1)
 */
export async function getUSDCPriceUSD(): Promise<number> {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd");
    const data = await response.json();
    return data["usd-coin"]?.usd || 1.0;
  } catch (error) {
    console.error("Failed to fetch USDC price:", error);
    return 1.0; // Default to $1
  }
}
