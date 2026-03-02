import { useState, useEffect } from "react";
import { View, Text, ScrollView, Image, ActivityIndicator, StyleSheet } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/services/firebase";
import type { Merchant } from "@/types";

export default function BusinessDetailsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMerchantData();
  }, [user]);

  const loadMerchantData = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Query merchants collection by userId
      const merchantsQuery = query(
        collection(db, "merchants"),
        where("userId", "==", user.uid),
        limit(1)
      );

      const merchantSnapshot = await getDocs(merchantsQuery);

      if (merchantSnapshot.empty) {
        console.log("No merchant found for user:", user.uid);
        setLoading(false);
        return;
      }

      const merchantDoc = merchantSnapshot.docs[0];
      const merchantData = merchantDoc.data();

      setMerchant({
        id: merchantDoc.id,
        walletAddress: merchantData.walletAddress,
        name: merchantData.name || "My Business",
        category: merchantData.category || "General",
        description: merchantData.description || "",
        openingHours: merchantData.openingHours || "",
        photoUrl: merchantData.photoUrl || "",
        lat: merchantData.lat ?? 0,
        lng: merchantData.lng ?? 0,
        geoHash: merchantData.geoHash || "",
        acceptsSol: merchantData.acceptsSol ?? true,
        acceptsUsdc: merchantData.acceptsUsdc ?? false,
        isActive: merchantData.active !== undefined ? merchantData.active : true,
        totalPaymentsCount: merchantData.totalPaymentsCount || 0,
        totalVolumeSOL: merchantData.totalVolumeSOL || 0,
        totalVolumeUSDC: merchantData.totalVolumeUSDC || 0,
        averageRating: merchantData.averageRating || 0,
        ratingCount: merchantData.ratingCount || 0,
      });
    } catch (error: any) {
      console.error("Failed to load merchant data:", error);
      setError(error.message || "Failed to load business details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Screen className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">Loading details...</Text>
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
        <Button onPress={loadMerchantData}>
          <Text className="text-white font-bold">Try Again</Text>
        </Button>
      </Screen>
    );
  }

  if (!merchant) {
    return (
      <Screen className="flex-1 justify-center items-center px-6">
        <Text className="text-6xl mb-4">🏪</Text>
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          No Business Registered
        </Text>
        <Text className="text-center text-gray-600 dark:text-gray-400 mb-6">
          You haven't registered a business yet.
        </Text>
        <Button onPress={() => navigation.navigate("RegisterMerchant")}>
          <Text className="text-white font-bold">Register Business</Text>
        </Button>
      </Screen>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString();
    } catch {
      return "N/A";
    }
  };

  return (
    <View style={styles.container}>
      <Screen>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-6 pb-24">
            {/* Header */}
            <View className="mb-6">
              <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Business Details
              </Text>
              <Text className="text-base text-gray-600 dark:text-gray-400">
                Complete information about your registered business
              </Text>
            </View>

            {/* Business Photo */}
            {merchant.photoUrl && (
              <View className="mb-6">
                <View style={styles.photoCard}>
                  <Image
                    source={{ uri: merchant.photoUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                </View>
              </View>
            )}

            {/* Basic Information */}
            <View style={styles.card} className="mb-4">
              <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Basic Information
              </Text>

              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Business Name
                </Text>
                <Text className="text-base text-gray-900 dark:text-white font-medium">
                  {merchant.name}
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Category
                </Text>
                <View className="bg-purple-100 dark:bg-purple-900/30 px-3 py-2 rounded-lg self-start">
                  <Text className="text-base font-medium text-purple-700 dark:text-purple-300">
                    {merchant.category}
                  </Text>
                </View>
              </View>

              {merchant.description && (
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Description
                  </Text>
                  <Text className="text-base text-gray-900 dark:text-white">
                    {merchant.description}
                  </Text>
                </View>
              )}

              {merchant.openingHours && (
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Opening Hours
                  </Text>
                  <Text className="text-base text-gray-900 dark:text-white">
                    {merchant.openingHours}
                  </Text>
                </View>
              )}

              <View>
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Email
                </Text>
                <Text className="text-base text-gray-900 dark:text-white">
                  {user?.email || "N/A"}
                </Text>
              </View>
            </View>

            {/* Payment Methods */}
            <View style={styles.card} className="mb-4">
              <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Payment Methods
              </Text>

              <View className="flex-row gap-3">
                {merchant.acceptsSol && (
                  <View style={styles.paymentBadge} className="flex-1">
                    <Text className="text-3xl mb-2">₿</Text>
                    <Text className="text-base font-bold text-gray-900 dark:text-white">
                      Solana (SOL)
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      Accepted
                    </Text>
                  </View>
                )}

                {merchant.acceptsUsdc && (
                  <View style={styles.paymentBadge} className="flex-1">
                    <Text className="text-3xl mb-2">💵</Text>
                    <Text className="text-base font-bold text-gray-900 dark:text-white">
                      USDC
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      Accepted
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Location Information */}
            <View style={styles.card} className="mb-4">
              <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Location
              </Text>

              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Coordinates
                </Text>
                <Text className="text-base text-gray-900 dark:text-white font-mono">
                  {merchant.lat && merchant.lng
                    ? `${merchant.lat.toFixed(6)}, ${merchant.lng.toFixed(6)}`
                    : "Location not set"}
                </Text>
              </View>

              <View className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <Text className="text-sm text-blue-700 dark:text-blue-300">
                  📍 Your business is visible on the map to nearby customers
                </Text>
              </View>
            </View>

            {/* Status Information */}
            <View style={styles.card} className="mb-6">
              <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Status
              </Text>

              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-base text-gray-900 dark:text-white">
                  Business Status
                </Text>
                <View className={`px-4 py-2 rounded-full ${merchant.isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <Text className={`text-sm font-bold ${merchant.isActive ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {merchant.isActive ? '🟢 Open' : '🔴 Closed'}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-base text-gray-900 dark:text-white">
                  Verification Status
                </Text>
                <View className="px-4 py-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                  <Text className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                    ⏳ Pending
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Button */}
            <View style={styles.buttonContainer}>
              <Button onPress={() => navigation.navigate("RegisterMerchant")}>
                <Text className="text-white font-bold text-base">✏️ Edit Business Info</Text>
              </Button>
            </View>
          </View>
        </ScrollView>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFF',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  photoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  photo: {
    width: '100%',
    height: 200,
  },
  paymentBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonContainer: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
