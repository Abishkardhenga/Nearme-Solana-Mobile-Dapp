import { create } from 'zustand';

interface WalletState {
  walletPublicKey: string | null;
  isConnected: boolean;
  setWalletPublicKey: (key: string) => void;
  disconnectWallet: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  walletPublicKey: null,
  isConnected: false,
  setWalletPublicKey: (key: string) => {
    console.log("💾 GLOBAL STORE - setWalletPublicKey called with:", key);
    set({ walletPublicKey: key, isConnected: true });
    console.log("✅ GLOBAL STORE - Wallet saved successfully");
  },
  disconnectWallet: () => {
    console.log("🔌 GLOBAL STORE - disconnectWallet called");
    set({ walletPublicKey: null, isConnected: false });
    console.log("✅ GLOBAL STORE - Wallet cleared");
  },
}));
