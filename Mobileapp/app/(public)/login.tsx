import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn } = useAuth();

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
    <View style={styles.container}>
      <Screen scrollable className="px-6 pt-16 pb-20">
        {/* Header with icon */}
        <View className="items-center mb-8">
          <View style={styles.iconContainer}>
            <Text className="text-5xl">👋</Text>
          </View>
          <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2 mt-4">
            Welcome Back
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400">
            Sign in to continue your journey
          </Text>
        </View>

        {/* Form */}
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

        {/* Sign In Button */}
        <View style={styles.buttonContainer} className="mb-6">
          <Button onPress={handleLogin} loading={loading}>
            <Text className="text-white font-bold text-base">Sign In</Text>
          </Button>
        </View>

        {/* Footer */}
        <View className="items-center py-4">
          <Text className="text-gray-600 dark:text-gray-400 text-base">
            Don't have an account?{' '}
            <Text
              onPress={() => navigation.navigate('Register')}
              style={styles.linkText}
              className="font-bold"
            >
              Sign Up
            </Text>
          </Text>
        </View>
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
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContainer: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  linkText: {
    color: '#7C3AED',
  },
});
