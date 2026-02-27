import { useState, useEffect } from 'react';
import { getOnboardingStatus, setOnboardingStatus } from '@/services/storage';

export function useOnboarding() {
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOnboardingStatus();
  }, []);

  const loadOnboardingStatus = async () => {
    try {
      const status = await getOnboardingStatus();
      setCompleted(status);
    } catch (error) {
      console.error('Failed to load onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await setOnboardingStatus(true);
      setCompleted(true);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      throw error;
    }
  };

  return { completed, loading, completeOnboarding };
}
