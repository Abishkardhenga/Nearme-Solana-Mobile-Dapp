import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useOnboarding } from '@/hooks/useOnboarding';

const STEPS = [
  {
    title: 'Welcome to the App',
    description: 'Build faster with this production-ready SaaS starter template',
  },
  {
    title: 'Everything You Need',
    description: 'Authentication, navigation, and beautiful UI components out of the box',
  },
  {
    title: 'Ready to Ship',
    description: 'Clone, configure, and start building your next idea',
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const { completeOnboarding } = useOnboarding();
  const router = useRouter();

  const isLastStep = step === STEPS.length - 1;

  const handleNext = async () => {
    if (isLastStep) {
      await completeOnboarding();
      router.replace('/(public)/signup');
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
    router.replace('/(public)/signup');
  };

  return (
    <Screen className="px-6 justify-center">
      <View className="items-center mb-12">
        <Text className="text-4xl font-bold text-gray-900 dark:text-white mb-4 text-center">
          {STEPS[step].title}
        </Text>
        <Text className="text-lg text-gray-600 dark:text-gray-400 text-center">
          {STEPS[step].description}
        </Text>
      </View>

      {/* Step indicators */}
      <View className="flex-row justify-center mb-8 gap-2">
        {STEPS.map((_, idx) => (
          <View
            key={idx}
            className={`h-2 w-8 rounded-full ${
              idx === step ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
            }`}
          />
        ))}
      </View>

      <Button onPress={handleNext}>
        {isLastStep ? 'Get Started' : 'Next'}
      </Button>

      {!isLastStep && (
        <Button variant="outline" onPress={handleSkip} className="mt-4">
          Skip
        </Button>
      )}
    </Screen>
  );
}
