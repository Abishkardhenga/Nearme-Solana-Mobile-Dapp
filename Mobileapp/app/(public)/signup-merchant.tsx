import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';

export default function SignupMerchantScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signUp } = useAuth();

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !businessName) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await signUp(email, password);

      // Create merchant profile in Firestore
      await setDoc(doc(db, 'merchants', userCredential.user.uid), {
        userId: userCredential.user.uid,
        businessName,
        email,
        createdAt: new Date(),
        status: 'pending',
        isMerchant: true,
      });

      // Create user profile with merchant flag
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        isMerchant: true,
        merchantId: userCredential.user.uid,
        createdAt: new Date(),
      });

      // NavigationGuard will handle redirect
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Screen scrollable className="px-6 pt-16 pb-20">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header with icon */}
          <View className="items-center mb-8">
            <View style={styles.iconContainer}>
              <Text className="text-5xl">🏪</Text>
            </View>
            <Text className="text-4xl font-bold text-gray-900 dark:text-white mb-2 mt-4">
              Merchant Registration
            </Text>
            <Text className="text-base text-gray-600 dark:text-gray-400 text-center px-4">
              Start accepting crypto payments at your business
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard} className="mb-6">
            <View className="gap-4">
              <Input
                label="Business Name"
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Your Business Name"
                autoComplete="off"
              />

              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@example.com"
                autoComplete="email"
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="At least 6 characters"
                autoComplete="password-new"
              />

              <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Re-enter your password"
                autoComplete="password-new"
                error={error}
              />
            </View>
          </View>

          {/* Sign Up Button */}
          <View style={styles.buttonContainer} className="mb-6">
            <Button onPress={handleSignup} loading={loading}>
              <Text className="text-white font-bold text-base">Create Merchant Account</Text>
            </Button>
          </View>

          {/* Footer */}
          <View className="items-center py-4">
            <Text className="text-gray-600 dark:text-gray-400 text-base">
              Already have an account?{' '}
              <Text
                onPress={() => navigation.navigate('Login')}
                style={styles.linkText}
                className="font-bold"
              >
                Sign In
              </Text>
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFF',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  buttonContainer: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  linkText: {
    color: '#7C3AED',
  },
});
