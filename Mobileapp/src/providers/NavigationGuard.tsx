import { useEffect, useState, ReactNode } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useWalletStore } from '@/store';
import { View } from 'react-native';
import { Loader } from '@/components/ui/Loader';

interface NavigationGuardProps {
  children: ReactNode;
}

export function NavigationGuard({ children }: NavigationGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { completed, loading: onboardingLoading } = useOnboarding();
  const { isConnected } = useWalletStore();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    if (authLoading || onboardingLoading) return;

    const inProtected = segments[0] === '(protected)';
    const inPublic = segments[0] === '(public)';

    // Routing logic
    if (isConnected && segments[1] !== 'map-home') {
      router.replace('/(protected)/map-home');
    } else if (!completed && !inPublic) {
      router.replace('/(public)/onboarding');
    } else if (completed && !user && !inPublic) {
      router.replace('/(public)/login');
    } else if (user && !inProtected) {
      router.replace('/(protected)');
    }

    setIsNavigationReady(true);
  }, [user, completed, authLoading, onboardingLoading, segments, isConnected]);

  // Show splash while determining route
  if (!isNavigationReady) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <Loader />
      </View>
    );
  }

  return <>{children}</>;
}
