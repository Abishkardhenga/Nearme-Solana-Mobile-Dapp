import { useState, useCallback, useEffect } from "react";
import {
  transact,
  Web3MobileWallet,
} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import { useWalletStore as useWalletNetworkStore } from "../store/wallet-store";
import { useWalletStore } from "@/store";

const APP_IDENTITY = {
  name: "Nearme",
  uri: "https://nearme.io",
  icon: "favicon.ico",
};

export function useWallet() {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const isDevnet = useWalletNetworkStore((s) => s.isDevnet);
  const { walletPublicKey: storedWalletKey, setWalletPublicKey, disconnectWallet: disconnectGlobalWallet } = useWalletStore();

  const cluster = isDevnet ? "devnet" : "testnet";
  const connection = new Connection(clusterApiUrl(cluster), "confirmed");

  // Initialize publicKey from stored wallet on mount
  useEffect(() => {
    if (storedWalletKey && !publicKey) {
      try {
        const pubkey = new PublicKey(storedWalletKey);
        setPublicKey(pubkey);
        console.log("✅ Wallet loaded from store:", pubkey.toBase58());
      } catch (error) {
        console.error("❌ Failed to initialize wallet from store:", error);
      }
    }
  }, [storedWalletKey, publicKey]);

  // ============================================
  // CONNECT — Ask Phantom to authorize our app
  // ============================================
  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const authResult = await transact(
        async (wallet: Web3MobileWallet) => {
          // This opens Phantom, shows an "Authorize" dialog
          // User taps "Approve" → we get their public key
          const result = await wallet.authorize({
            chain: `solana:${cluster}`,
            identity: APP_IDENTITY,
          });
          return result;
        }
      );

      // authResult.accounts[0].address is a base64 public key
      const pubkey = new PublicKey(
        Buffer.from(authResult.accounts[0].address, "base64")
      );
      const pubkeyString = pubkey.toBase58();

      console.log("✅ Wallet connected successfully!");
      console.log("📍 Public Key:", pubkeyString);
      console.log("🔄 About to save to global store...");
      console.log("  setWalletPublicKey function type:", typeof setWalletPublicKey);
      console.log("  setWalletPublicKey function:", setWalletPublicKey);

      setPublicKey(pubkey);
      setWalletPublicKey(pubkeyString); // Save to global wallet store

      console.log("💾 setWalletPublicKey() called with:", pubkeyString);
      console.log("✅ Should be saved to global store now!");

      return pubkey;
    } catch (error: any) {
      console.error("Connect failed:", error);
      throw error;
    } finally {
      setConnecting(false);
    }
  }, [cluster, setWalletPublicKey]);

  // ============================================
  // DISCONNECT
  // ============================================
  const disconnect = useCallback(() => {
    console.log("🔌 Disconnecting wallet...");
    setPublicKey(null);
    disconnectGlobalWallet(); // Clear from global wallet store
    console.log("✅ Wallet disconnected from global store");
  }, [disconnectGlobalWallet]);

  // ============================================
  // GET BALANCE
  // ============================================
  const getBalance = useCallback(async () => {
    if (!publicKey) return 0;
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  }, [publicKey, connection]);

  // ============================================
  // SEND SOL — Build, sign, and send a transaction
  // ============================================
  const sendSOL = useCallback(
    async (toAddress: string, amountSOL: number) => {
      if (!publicKey) throw new Error("Wallet not connected");

      setSending(true);
      try {
        // Step 1: Build the transaction
        const toPublicKey = new PublicKey(toAddress);
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: toPublicKey,
            lamports: Math.round(amountSOL * LAMPORTS_PER_SOL),
          })
        );

        // Step 2: Get recent blockhash (needed for transaction)
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Step 3: Send to Phantom for signing + submission
        const txSignature = await transact(
          async (wallet: Web3MobileWallet) => {
            // Re-authorize (Phantom needs this each session)
            await wallet.authorize({
              chain: `solana:${cluster}`,
              identity: APP_IDENTITY,
            });

            // Sign and send — Phantom shows the transaction details
            // User approves → Phantom signs → sends to network
            const signatures = await wallet.signAndSendTransactions({
              transactions: [transaction],
            });

            return signatures[0];
          }
        );

        return txSignature;
      } finally {
        setSending(false);
      }
    },
    [publicKey, connection, cluster]
  );

  return {
    publicKey,
    connected: !!publicKey,
    connecting,
    sending,
    connect,
    disconnect,
    getBalance,
    sendSOL,
    connection,
  };
}