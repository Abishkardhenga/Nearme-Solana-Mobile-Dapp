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
