import {useState, useEffect} from "react";
import {View, Text, Image, ScrollView, TouchableOpacity, Alert, Linking, Platform} from "react-native";
import {Screen} from "@/components/ui/Screen";
import {Button} from "@/components/ui/Button";
import {useLocalSearchParams, router} from "expo-router";
import {useAuth} from "@/hooks/useAuth";
import {doc, updateDoc, arrayUnion, arrayRemove, getDoc} from "firebase/firestore";
import {db} from "@/services/firebase";
import type {Merchant} from "@/types";

export default function MerchantDetailScreen() {
  const {merchantData} = useLocalSearchParams();
  const {user} = useAuth();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (merchantData) {
      try {
        const parsed = JSON.parse(merchantData as string) as Merchant;
        setMerchant(parsed);
        checkIfSaved(parsed.id);
      } catch (error) {
        console.error("Failed to parse merchant data:", error);
        Alert.alert("Error", "Failed to load merchant details");
        router.back();
      }
    }
  }, [merchantData]);

  const checkIfSaved = async (merchantId: string) => {
    if (!user?.uid) return;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const savedMerchants = userDoc.data()?.savedMerchants || [];
        setIsSaved(savedMerchants.includes(merchantId));
      }
    } catch (error) {
      console.error("Failed to check if merchant is saved:", error);
    }
  };

  const handleSaveToggle = async () => {
    if (!user?.uid || !merchant) return;

    setLoading(true);

    try {
      const userRef = doc(db, "users", user.uid);

      if (isSaved) {
        // Remove from saved
        await updateDoc(userRef, {
          savedMerchants: arrayRemove(merchant.id),
        });
        setIsSaved(false);
        Alert.alert("Removed", `${merchant.name} has been removed from your saved restaurants`);
      } else {
        // Add to saved
        await updateDoc(userRef, {
          savedMerchants: arrayUnion(merchant.id),
        });
        setIsSaved(true);
        Alert.alert("Saved!", `${merchant.name} has been added to your saved restaurants`);
      }
    } catch (error: any) {
      console.error("Failed to toggle save:", error);
      Alert.alert("Error", "Failed to save restaurant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGetDirections = () => {
    if (!merchant) return;

    const scheme = Platform.select({
      ios: "maps:",
      android: "geo:",
    });

    const url = Platform.select({
      ios: `${scheme}${merchant.lat},${merchant.lng}?q=${encodeURIComponent(merchant.name)}`,
      android: `${scheme}${merchant.lat},${merchant.lng}?q=${encodeURIComponent(merchant.name)}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Failed to open maps");
      });
    }
  };

  const truncateAddress = (address: string): string => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} className="text-yellow-400 text-lg">
          {i <= rating ? "★" : "☆"}
        </Text>
      );
    }
    return <View className="flex-row">{stars}</View>;
  };

  if (!merchant) {
    return (
      <Screen>
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600 dark:text-gray-400">Loading...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View className="w-full h-64 bg-gray-200 dark:bg-gray-800">
          {merchant.photoUrl ? (
            <Image source={{uri: merchant.photoUrl}} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Text className="text-6xl">🏪</Text>
              <Text className="text-gray-500 dark:text-gray-400 mt-2">No photo available</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View className="px-6 pt-6 pb-24">
          {/* Name and Category */}
          <View className="mb-4">
            <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{merchant.name}</Text>
            <Text className="text-base text-gray-600 dark:text-gray-400">{merchant.category}</Text>
          </View>

          {/* Rating and Distance */}
          <View className="flex-row items-center mb-6">
            {renderStars(Math.round(merchant.averageRating))}
            <Text className="ml-2 text-gray-600 dark:text-gray-400">
              {merchant.averageRating > 0
                ? `${merchant.averageRating.toFixed(1)} (${merchant.ratingCount} reviews)`
                : "No reviews yet"}
            </Text>
            {merchant.distance !== undefined && (
              <View className="ml-auto bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                <Text className="text-blue-700 dark:text-blue-300 font-medium">{merchant.distance.toFixed(2)} km</Text>
              </View>
            )}
          </View>

          {/* Payment Methods */}
          <View className="flex-row gap-2 mb-6">
            {merchant.acceptsSol && (
              <View className="bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-purple-600 mr-2" />
                <Text className="text-purple-700 dark:text-purple-300 font-medium">Accepts SOL</Text>
              </View>
            )}
            {merchant.acceptsUsdc && (
              <View className="bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-green-600 mr-2" />
                <Text className="text-green-700 dark:text-green-300 font-medium">Accepts USDC</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {merchant.description && (
            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">About</Text>
              <Text className="text-gray-600 dark:text-gray-400 leading-6">{merchant.description}</Text>
            </View>
          )}

          {/* Opening Hours */}
          {merchant.openingHours && (
            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hours</Text>
              <Text className="text-gray-600 dark:text-gray-400">{merchant.openingHours}</Text>
            </View>
          )}

          {/* Stats */}
          <View className="mb-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Transaction Stats</Text>
            <View className="flex-row justify-between">
              <View>
                <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                  {merchant.totalPaymentsCount}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">Total Payments</Text>
              </View>
              {merchant.totalVolumeSOL > 0 && (
                <View>
                  <Text className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {merchant.totalVolumeSOL.toFixed(2)}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">SOL Volume</Text>
                </View>
              )}
              {merchant.totalVolumeUSDC > 0 && (
                <View>
                  <Text className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${merchant.totalVolumeUSDC.toFixed(2)}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">USDC Volume</Text>
                </View>
              )}
            </View>
          </View>

          {/* Wallet Address */}
          <View className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <Text className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">Merchant Wallet</Text>
            <Text className="text-sm text-blue-700 dark:text-blue-300 font-mono">
              {truncateAddress(merchant.walletAddress)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <Button onPress={handleSaveToggle} disabled={loading} className="bg-teal-600">
              {isSaved ? "❤️ Saved" : "🤍 Save Restaurant"}
            </Button>

            <Button onPress={handleGetDirections} variant="outline">
              🗺️ Get Directions
            </Button>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
