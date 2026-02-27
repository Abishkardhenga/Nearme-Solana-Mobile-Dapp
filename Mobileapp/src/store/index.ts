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
  setWalletPublicKey: (key: string) =>
    set({ walletPublicKey: key, isConnected: true }),
  disconnectWallet: () => set({ walletPublicKey: null, isConnected: false }),
}));
