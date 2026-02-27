import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@app_onboarding_completed';

export const getOnboardingStatus = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Failed to get onboarding status:', error);
    return false;
  }
};

export const setOnboardingStatus = async (completed: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, completed.toString());
  } catch (error) {
    console.error('Failed to set onboarding status:', error);
    throw error;
  }
};

export const clearOnboardingStatus = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch (error) {
    console.error('Failed to clear onboarding status:', error);
    throw error;
  }
};
