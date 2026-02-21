import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signUp } = useAuth();
  const router = useRouter();

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
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
      await signUp(email, password);
      // NavigationGuard will handle redirect
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable className="px-6 pt-12">
      <Text className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
        Create Account
      </Text>
      <Text className="text-base text-gray-600 dark:text-gray-400 mb-8">
        Sign up to get started
      </Text>

      <View className="gap-4 mb-6">
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
          placeholder="••••••••"
          autoComplete="password-new"
        />

        <Input
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="••••••••"
          autoComplete="password-new"
          error={error}
        />
      </View>

      <Button onPress={handleSignup} loading={loading}>
        Sign Up
      </Button>

      <View className="mt-6 items-center">
        <Text className="text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Text
            onPress={() => router.push('/(public)/login')}
            className="text-blue-600 dark:text-blue-400 font-semibold"
          >
            Sign In
          </Text>
        </Text>
      </View>
    </Screen>
  );
}
