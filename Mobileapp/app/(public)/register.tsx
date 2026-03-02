import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';

export default function RegisterScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Screen className="flex-1 px-6 pt-16 pb-8">
        {/* Header Section */}
        <View className="mb-12">
          <View style={styles.brandContainer} className="mb-6">
            <View style={styles.brandBadge}>
              <Text className="text-4xl font-bold text-white">NearMe</Text>
            </View>
            <View className="flex-row items-center mt-3">
              <View style={styles.dot} />
              <Text className="text-xs text-gray-600 dark:text-gray-400 tracking-wider uppercase font-semibold mx-2">
                Powered by Solana
              </Text>
              <View style={styles.dot} />
            </View>
          </View>

          <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center">
            Join NearMe
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400 text-center px-4">
            Choose how you want to get started
          </Text>
        </View>

        {/* Selection Cards */}
        <View className="gap-5 flex-1">
          {/* Customer Card */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Signup')}
            activeOpacity={0.85}
            style={styles.customerCard}
          >
            <View className="items-center mb-4">
              <Text className="text-6xl mb-4">🛍️</Text>
            </View>
            <Text className="text-3xl font-bold text-white mb-3 text-center">
              I'm a Customer
            </Text>
            <Text className="text-purple-100 text-base text-center leading-6">
              Find and pay at nearby merchants with crypto
            </Text>
          </TouchableOpacity>

          {/* Merchant Card */}
          <TouchableOpacity
            onPress={() => navigation.navigate('SignupMerchant')}
            activeOpacity={0.85}
            style={styles.merchantCard}
          >
            <View className="items-center mb-4">
              <Text className="text-6xl mb-4">🏪</Text>
            </View>
            <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center">
              I'm a Merchant
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-base text-center leading-6">
              Accept crypto payments at your business
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="mt-auto pt-6 items-center">
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
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  brandContainer: {
    alignItems: 'center',
  },
  brandBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C3AED',
  },
  customerCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  merchantCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    borderWidth: 3,
    borderColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  linkText: {
    color: '#7C3AED',
  },
});
