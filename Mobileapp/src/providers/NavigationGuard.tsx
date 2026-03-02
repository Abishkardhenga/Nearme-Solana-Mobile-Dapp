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
    if (authLoading || onboardingLoading) {
      return;
    }

    const inProtected = segments[0] === '(protected)';
    const inPublic = segments[0] === '(public)';

    // If user is not logged in, redirect to public routes
    if (!user) {
      if (!completed && !inPublic) {
        router.replace('/(public)/onboarding');
        return;
      }

      if (completed && !inPublic) {
        router.replace('/(public)/login');
        return;
      }
    }

    // User is logged in, handle protected routes
    if (user) {
      // If wallet is connected, go to map-home
      if (isConnected && inProtected && segments[1] !== 'map-home') {
        router.replace('/(protected)/map-home');
        return;
      }

      // If not in protected routes, redirect to protected
      if (!inProtected) {
        router.replace('/(protected)');
        return;
      }
    }

    // Only set navigation ready if no redirect occurred
    if (!isNavigationReady) {
      setIsNavigationReady(true);
    }
  }, [user, completed, authLoading, onboardingLoading, segments, isConnected]);

  // Show splash while determining route
  if (authLoading || onboardingLoading || !isNavigationReady) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <Loader />
      </View>
    );
  }

  return <>{children}</>;
}
