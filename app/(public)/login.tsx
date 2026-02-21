import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      // NavigationGuard will handle redirect
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable className="px-6 pt-12">
      <Text className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
        Welcome Back
      </Text>
      <Text className="text-base text-gray-600 dark:text-gray-400 mb-8">
        Sign in to continue
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
          autoComplete="password"
          error={error}
        />
      </View>

      <Button onPress={handleLogin} loading={loading}>
        Sign In
      </Button>

      <View className="mt-6 items-center">
        <Text className="text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Text
            onPress={() => router.push('/(public)/signup')}
            className="text-blue-600 dark:text-blue-400 font-semibold"
          >
            Sign Up
          </Text>
        </Text>
      </View>
    </Screen>
  );
}
