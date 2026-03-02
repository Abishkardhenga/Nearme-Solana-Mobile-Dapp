import { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useOnboarding } from '@/hooks/useOnboarding';

const { width, height } = Dimensions.get('window');

const STEPS = [
  {
    emoji: '🗺️',
    title: 'Discover Nearby',
    subtitle: 'Find crypto-friendly merchants',
    description: 'Explore restaurants, cafes, and shops that accept Solana payments near you',
    color: '#7C3AED',
    lightColor: '#EDE9FE',
    darkColor: '#5B21B6',
  },
  {
    emoji: '⚡',
    title: 'Lightning Fast',
    subtitle: 'Pay in seconds with Solana',
    description: 'Instant transactions with SOL and USDC. No fees, no delays',
    color: '#EC4899',
    lightColor: '#FCE7F3',
    darkColor: '#BE185D',
  },
  {
    emoji: '🔐',
    title: 'Secure & Simple',
    subtitle: 'Self-custody, full control',
    description: 'Your wallet, your keys, your money. Connect with Mobile Wallet Adapter',
    color: '#06B6D4',
    lightColor: '#CFFAFE',
    darkColor: '#0E7490',
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const [step, setStep] = useState(0);
  const { completeOnboarding } = useOnboarding();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const isLastStep = step === STEPS.length - 1;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.8);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  const handleNext = async () => {
    if (isLastStep) {
      await completeOnboarding();
      navigation.replace('Register');
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
    navigation.replace('Register');
  };

  const currentStep = STEPS[step];

  return (
    <View style={[styles.container, { backgroundColor: currentStep.lightColor }]}>
      <Screen className="flex-1">
        <View className="flex-1 px-6 pt-12 pb-8">
          {/* Brand Header */}
          <View className="items-center mb-6">
            <View
              style={[styles.brandBadge, { backgroundColor: currentStep.color }]}
            >
              <Text className="text-3xl font-bold text-white">
                NearMe
              </Text>
            </View>
            <View className="flex-row items-center mt-3">
              <View style={[styles.dot, { backgroundColor: currentStep.color }]} />
              <Text className="text-xs text-gray-700 tracking-wider uppercase font-semibold mx-2">
                Powered by Solana
              </Text>
              <View style={[styles.dot, { backgroundColor: currentStep.color }]} />
            </View>
          </View>

          {/* Main Content with Animation */}
          <Animated.View
            style={{
              flex: 1,
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }}
            className="justify-center items-center"
          >
            {/* Icon Circle */}
            <View className="mb-8">
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: currentStep.color,
                    shadowColor: currentStep.color,
                  }
                ]}
              >
                <Text className="text-7xl">
                  {currentStep.emoji}
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text className="text-4xl font-bold text-gray-900 mb-4 text-center px-4">
              {currentStep.title}
            </Text>

            {/* Subtitle */}
            <View
              style={[styles.subtitleBadge, { backgroundColor: currentStep.color }]}
              className="mb-6"
            >
              <Text className="text-lg font-semibold text-white text-center">
                {currentStep.subtitle}
              </Text>
            </View>

            {/* Description Text */}
            <Text className="text-base text-gray-700 text-center leading-6 px-8">
              {currentStep.description}
            </Text>
          </Animated.View>

          {/* Bottom Navigation */}
          <View className="mt-auto">
            {/* Step indicators */}
            <View className="flex-row justify-center mb-8 gap-3">
              {STEPS.map((s, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.indicator,
                    {
                      width: idx === step ? 32 : 8,
                      backgroundColor: idx === step ? currentStep.color : '#D1D5DB',
                    }
                  ]}
                />
              ))}
            </View>

            {/* Buttons */}
            <View className="gap-4">
              <View style={[styles.buttonGradient, { backgroundColor: currentStep.color }]}>
                <Button
                  onPress={handleNext}
                  className="bg-transparent"
                >
                  <Text className="text-white font-bold text-lg">
                    {isLastStep ? '🚀 Get Started' : 'Next →'}
                  </Text>
                </Button>
              </View>

              {!isLastStep && (
                <Button
                  variant="outline"
                  onPress={handleSkip}
                  style={{ borderColor: currentStep.color, borderWidth: 2 }}
                >
                  <Text style={{ color: currentStep.color }} className="font-semibold">
                    Skip for now
                  </Text>
                </Button>
              )}
            </View>
          </View>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  brandBadge: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  subtitleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  buttonGradient: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
});
