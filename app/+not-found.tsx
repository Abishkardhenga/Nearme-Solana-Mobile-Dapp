import { Link } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <Screen className="items-center justify-center px-6">
      <View className="items-center">
        <Text className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
          404
        </Text>
        <Text className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Page Not Found
        </Text>
        <Text className="text-base text-gray-600 dark:text-gray-400 mb-8 text-center">
          The page you're looking for doesn't exist.
        </Text>
        <Link href="/(protected)" className="text-blue-600 dark:text-blue-400 font-semibold">
          Go to Home
        </Link>
      </View>
    </Screen>
  );
}
