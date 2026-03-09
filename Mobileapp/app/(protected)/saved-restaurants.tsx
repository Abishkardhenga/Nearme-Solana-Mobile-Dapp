import {useState, useEffect} from "react";
import {View, Text, TouchableOpacity, FlatList, RefreshControl, Alert, Image} from "react-native";
import {Screen} from "@/components/ui/Screen";
import {useAuth} from "@/hooks/useAuth";
import {useLocation} from "@/hooks/useLocation";
import {doc, getDoc, collection, query, where, getDocs} from "firebase/firestore";
import {db} from "@/services/firebase";
import {useNavigation} from "@react-navigation/native";
import type {Merchant} from "@/types";

export default function SavedRestaurantsScreen() {
  const navigation = useNavigation<any>();
  const {user} = useAuth();
  const {location} = useLocation();

  const [savedMerchants, setSavedMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadSavedMerchants();
  }, [user]);

  // Update distances when location changes
  useEffect(() => {
    if (location && savedMerchants.length > 0) {
      updateDistances();
    }
  }, [location]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in km
  };

  const updateDistances = () => {
    if (!location) return;

    setSavedMerchants((prev) =>
      prev.map((merchant) => ({
        ...merchant,
        distance: calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          merchant.lat,
          merchant.lng
        ),
      }))
    );
  };

  const loadSavedMerchants = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      // Get saved merchant IDs from user document
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        setSavedMerchants([]);
        setLoading(false);
        return;
      }

      const savedMerchantIds = userDoc.data()?.savedMerchants || [];

      if (savedMerchantIds.length === 0) {
        setSavedMerchants([]);
        setLoading(false);
        return;
      }

      // Fetch merchant details in batches (Firestore 'in' query limit is 10)
      const merchants: Merchant[] = [];
      const batchSize = 10;

      for (let i = 0; i < savedMerchantIds.length; i += batchSize) {
        const batch = savedMerchantIds.slice(i, i + batchSize);
        const q = query(collection(db, "merchants"), where("__name__", "in", batch));
        const snapshot = await getDocs(q);

        snapshot.forEach((doc) => {
          const data = doc.data();
          merchants.push({
            id: doc.id,
            walletAddress: data.walletAddress,
            name: data.name,
            category: data.category,
            description: data.description || "",
            openingHours: data.openingHours || "",
            photoUrl: data.photoUrl || "",
            lat: data.lat,
            lng: data.lng,
            geoHash: data.geoHash,
            acceptsSol: data.acceptsSol,
            acceptsUsdc: data.acceptsUsdc,
            isActive: data.isActive,
            totalPaymentsCount: data.totalPaymentsCount || 0,
            totalVolumeSOL: data.totalVolumeSOL || 0,
            totalVolumeUSDC: data.totalVolumeUSDC || 0,
            averageRating: data.averageRating || 0,
            ratingCount: data.ratingCount || 0,
          });
        });
      }

      // Calculate distances if location is available
      if (location) {
        merchants.forEach((merchant) => {
          merchant.distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            merchant.lat,
            merchant.lng
          );
        });

        // Sort by distance (closest first)
        merchants.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      setSavedMerchants(merchants);
    } catch (error) {
      console.error("Failed to load saved merchants:", error);
      Alert.alert("Error", "Failed to load saved restaurants");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSavedMerchants();
    setRefreshing(false);
  };

  const handleNavigate = (merchant: Merchant) => {
    // Navigate to Discover tab with the merchant location
    navigation.navigate("Discover", {
      screen: "MapHome",
      params: {
        focusMerchant: JSON.stringify(merchant),
      },
    });
  };

  const handleMerchantPress = (merchant: Merchant) => {
    navigation.navigate("MerchantDetail", {
      merchantData: JSON.stringify(merchant),
    });
  };

  const renderMerchant = ({item}: {item: Merchant}) => (
    <TouchableOpacity
      onPress={() => handleMerchantPress(item)}
      className="bg-white dark:bg-gray-800 rounded-xl mb-3 overflow-hidden border border-gray-100 dark:border-gray-700"
      style={{elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 4}}
    >
      <View className="flex-row">
        {/* Photo */}
        <View className="w-28 h-28 bg-gray-200 dark:bg-gray-700">
          {item.photoUrl ? (
            <Image source={{uri: item.photoUrl}} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Text className="text-4xl">🏪</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View className="flex-1 p-4">
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-base font-bold text-gray-900 dark:text-white flex-1" numberOfLines={1}>
              {item.name}
            </Text>
            {item.distance !== undefined && (
              <View className="bg-blue-100 dark:bg-blue-900/30 px-2.5 py-1 rounded-full ml-2">
                <Text className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {item.distance.toFixed(1)} km
                </Text>
              </View>
            )}
          </View>

          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2.5">{item.category}</Text>

          <View className="flex-row gap-1.5 mb-3">
            {item.acceptsSol && (
              <View className="bg-purple-100 dark:bg-purple-900/30 px-2.5 py-1 rounded-full">
                <Text className="text-xs font-medium text-purple-700 dark:text-purple-300">SOL</Text>
              </View>
            )}
            {item.acceptsUsdc && (
              <View className="bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-full">
                <Text className="text-xs font-medium text-green-700 dark:text-green-300">USDC</Text>
              </View>
            )}
          </View>

          {/* Navigate Button */}
          <TouchableOpacity
            onPress={() => handleNavigate(item)}
            className="bg-blue-600 rounded-lg px-3 py-2 self-start"
          >
            <Text className="text-xs text-white font-semibold">🗺️ Navigate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <Screen className="flex-1 justify-center items-center">
        <Text className="text-gray-600 dark:text-gray-400">Loading saved restaurants...</Text>
      </Screen>
    );
  }

  return (
    <Screen className="bg-gray-50 dark:bg-gray-900">
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <View className="bg-pink-600 rounded-2xl p-6 mb-4">
            <Text className="text-pink-100 text-sm font-medium mb-1">Your Favorites</Text>
            <Text className="text-white text-3xl font-bold">Saved Restaurants</Text>
            <View className="bg-pink-700 px-3 py-1 rounded-full self-start mt-3">
              <Text className="text-white text-sm font-semibold">
                {savedMerchants.length} saved
              </Text>
            </View>
          </View>
        </View>

        {savedMerchants.length === 0 ? (
          <View className="flex-1 justify-center items-center px-6 -mt-20">
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 items-center">
              <Text className="text-6xl mb-4">❤️</Text>
              <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                No Saved Restaurants
              </Text>
              <Text className="text-center text-gray-600 dark:text-gray-400 mb-6">
                Start exploring and save your favorite crypto-accepting restaurants!
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Discover")}
                className="bg-blue-600 rounded-xl px-6 py-3"
              >
                <Text className="text-white font-bold">Explore Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="flex-1 px-6">
            <FlatList
              data={savedMerchants}
              renderItem={renderMerchant}
              keyExtractor={(item) => item.id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{paddingBottom: 100}}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}
