import { User } from 'firebase/auth';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface OnboardingContextType {
  completed: boolean;
  loading: boolean;
  completeOnboarding: () => Promise<void>;
}

export type ColorScheme = 'light' | 'dark';

export interface Merchant {
  id: string;
  walletAddress: string;
  name: string;
  category: string;
  description: string;
  openingHours: string;
  photoUrl: string;
  lat: number;
  lng: number;
  geoHash: string;
  acceptsSol: boolean;
  acceptsUsdc: boolean;
  isActive: boolean;
  totalPaymentsCount: number;
  totalVolumeSOL: number;
  totalVolumeUSDC: number;
  averageRating: number;
  ratingCount: number;
  distance?: number; // Distance in km
}

export interface MapFilters {
  onlySol: boolean;
  onlyUsdc: boolean;
  category?: string;
  searchQuery: string;
}
