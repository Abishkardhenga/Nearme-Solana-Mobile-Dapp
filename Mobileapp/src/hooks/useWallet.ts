import { useState, useCallback } from "react";
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
import { useWalletStore } from "@/store";

const APP_IDENTITY = {
  name: "NearMe",
  uri: "https://nearme.app",
  icon: "favicon.ico",
};

export function useWallet() {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const { setWalletPublicKey, disconnectWallet } = useWalletStore();

  const cluster = "devnet";
  const connection = new Connection(clusterApiUrl(cluster), "confirmed");

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const authResult = await transact(
        async (wallet: Web3MobileWallet) => {
          const result = await wallet.authorize({
            cluster: `solana:${cluster}`,
            identity: APP_IDENTITY,
          });
          return result;
        }
      );

      const pubkey = new PublicKey(
        Buffer.from(authResult.accounts[0].address, "base64")
      );
      setPublicKey(pubkey);
      setWalletPublicKey(pubkey.toBase58());
      return pubkey;
    } catch (error: any) {
      console.error("Connect failed:", error);
      throw error;
    } finally {
      setConnecting(false);
    }
  }, [cluster, setWalletPublicKey]);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    disconnectWallet();
  }, [disconnectWallet]);

  const getBalance = useCallback(async () => {
    if (!publicKey) return 0;
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  }, [publicKey, connection]);

  const sendSOL = useCallback(
    async (toAddress: string, amountSOL: number) => {
      if (!publicKey) throw new Error("Wallet not connected");

      setSending(true);
      try {
        const toPublicKey = new PublicKey(toAddress);
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: toPublicKey,
            lamports: Math.round(amountSOL * LAMPORTS_PER_SOL),
          })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        const txSignature = await transact(
          async (wallet: Web3MobileWallet) => {
            await wallet.authorize({
              cluster: `solana:${cluster}`,
              identity: APP_IDENTITY,
            });

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
