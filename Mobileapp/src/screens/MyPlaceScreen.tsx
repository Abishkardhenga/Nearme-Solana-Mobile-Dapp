import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';

export default function MyPlaceScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isMerchant, setIsMerchant] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkMerchantStatus();
  }, [user?.uid]);

  const checkMerchantStatus = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Check if user has a merchant account
      const merchantDocRef = doc(db, 'merchants', user.uid);
      const merchantDoc = await getDoc(merchantDocRef);

      if (merchantDoc.exists()) {
        setIsMerchant(true);
        // Auto-navigate to merchant dashboard
        navigation.navigate('MerchantDashboard' as never);
        return;
      }

      // Also check by userId field
      const merchantsQuery = query(
        collection(db, 'merchants'),
        where('userId', '==', user.uid),
        limit(1)
      );

      const merchantSnapshot = await getDocs(merchantsQuery);

      if (!merchantSnapshot.empty) {
        setIsMerchant(true);
        navigation.navigate('MerchantDashboard' as never);
      } else {
        setIsMerchant(false);
      }
    } catch (error: any) {
      console.error('Error checking merchant status:', error);
      setError(error.message || 'Failed to load merchant status');
      setIsMerchant(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Screen className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">Loading...</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen className="flex-1 justify-center items-center px-6">
        <Text className="text-6xl mb-4">⚠️</Text>
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          Error Loading Data
        </Text>
        <Text className="text-center text-gray-600 dark:text-gray-400 mb-6">
          {error}
        </Text>
        <Button onPress={checkMerchantStatus}>
          <Text className="text-white font-bold">Try Again</Text>
        </Button>
      </Screen>
    );
  }

  // Show register prompt for non-merchants
  return (
    <View style={styles.container}>
      <Screen className="flex-1 px-6 pt-16">
        {/* Header */}
        <View className="items-center mb-10">
          <View style={styles.iconContainer}>
            <Text className="text-6xl">🏪</Text>
          </View>
          <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2 mt-6 text-center">
            Become a Merchant
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400 text-center px-6">
            Join thousands of businesses accepting crypto payments
          </Text>
        </View>

        {/* Benefits Cards */}
        <View className="gap-3 mb-8">
          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Text className="text-2xl">💰</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Zero Fees
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Accept SOL and USDC with no transaction fees
              </Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Text className="text-2xl">⚡</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Instant Payments
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Generate QR codes and receive payments instantly
              </Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Text className="text-2xl">📊</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Track Everything
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Real-time analytics and payment history
              </Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Text className="text-2xl">🗺️</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Get Discovered
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Appear on the map for nearby crypto users
              </Text>
            </View>
          </View>
        </View>

        {/* CTA Button */}
        <View style={styles.buttonContainer}>
          <Button onPress={() => navigation.navigate('RegisterMerchant' as never)}>
            <Text className="text-white font-bold text-base">Register as Merchant</Text>
          </Button>
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  benefitCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  buttonContainer: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 'auto',
    paddingBottom: 20,
  },
});
