import { View, Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      // NavigationGuard will handle redirect
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable className="px-6 pt-8">
      <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Profile
      </Text>

      <View className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
          Email
        </Text>
        <Text className="text-base text-gray-900 dark:text-white mb-4">
          {user?.email}
        </Text>

        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
          User ID
        </Text>
        <Text className="text-base text-gray-900 dark:text-white font-mono">
          {user?.uid}
        </Text>
      </View>

      <View className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
          Account Created
        </Text>
        <Text className="text-base text-gray-900 dark:text-white">
          {user?.metadata.creationTime
            ? new Date(user.metadata.creationTime).toLocaleDateString()
            : 'N/A'}
        </Text>
      </View>

      <Button onPress={handleSignOut} loading={loading} variant="outline">
        Sign Out
      </Button>
    </Screen>
  );
}
