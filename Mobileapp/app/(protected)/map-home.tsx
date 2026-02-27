import {useState, useEffect, useRef} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import MapView, {Marker, PROVIDER_GOOGLE, Region} from "react-native-maps";
import {useLocation} from "@/hooks/useLocation";
import {httpsCallable} from "firebase/functions";
import {functions} from "@/services/firebase";
import {router} from "expo-router";
import type {Merchant, MapFilters} from "@/types";

const {width, height} = Dimensions.get("window");

const CATEGORIES = ["All", "Restaurant", "Cafe", "Bar", "Shop", "Service", "Other"];

// Pin colors based on accepted payment methods
const getPinColor = (merchant: Merchant): string => {
  if (merchant.acceptsSol && merchant.acceptsUsdc) {
    return "#0D9488"; // Teal - both
  } else if (merchant.acceptsSol) {
    return "#7C3AED"; // Purple - SOL only
  } else if (merchant.acceptsUsdc) {
    return "#059669"; // Green - USDC only
  }
  return "#6B7280"; // Gray - fallback
};

export default function MapHomeScreen() {
  const {location, loading: locationLoading, hasPermission} = useLocation();

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<MapFilters>({
    onlySol: false,
    onlyUsdc: false,
    category: undefined,
    searchQuery: "",
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region | null>(null);

  // Load nearby merchants when location is available
  useEffect(() => {
    if (location && hasPermission) {
      loadNearbyMerchants();
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [location, hasPermission]);

  // Apply filters whenever merchants or filter state changes
  useEffect(() => {
    applyFilters();
  }, [merchants, filters]);

  const loadNearbyMerchants = async () => {
    if (!location) return;

    setLoading(true);
    setError(null);

    try {
      const getNearbyMerchants = httpsCallable(functions, "getNearbyMerchants");
      const result = await getNearbyMerchants({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        radiusKm: 5,
        filters: {
          onlySol: filters.onlySol,
          onlyUsdc: filters.onlyUsdc,
          category: filters.category !== "All" ? filters.category : undefined,
        },
      });

      const data = result.data as {merchants: Merchant[]};
      setMerchants(data.merchants);
      console.log(`Loaded ${data.merchants.length} nearby merchants`);
    } catch (err: any) {
      console.error("Failed to load merchants:", err);
      setError("Failed to load nearby merchants");
      Alert.alert("Error", "Failed to load nearby merchants. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...merchants];

    // Apply search query filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(query));
    }

    // Currency filters are already applied on the server
    // But we can also filter client-side for the search query

    setFilteredMerchants(filtered);
  };

  const handleMarkerPress = (merchant: Merchant) => {
    router.push({
      pathname: "/(protected)/merchant-detail",
      params: {merchantData: JSON.stringify(merchant)},
    });
  };

  const handleRefresh = () => {
    loadNearbyMerchants();
  };

  const handleFilterApply = () => {
    setShowFilters(false);
    loadNearbyMerchants();
  };

  if (locationLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">Getting your location...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-white dark:bg-gray-900">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">Location Required</Text>
        <Text className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Please enable location services to discover nearby merchants.
        </Text>
      </View>
    );
  }

  if (!location || !region) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">Loading map...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{width, height}}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
        onRegionChangeComplete={setRegion}
      >
        {filteredMerchants.map((merchant) => (
          <Marker
            key={merchant.id}
            coordinate={{latitude: merchant.lat, longitude: merchant.lng}}
            pinColor={getPinColor(merchant)}
            onPress={() => handleMarkerPress(merchant)}
            title={merchant.name}
            description={`${merchant.distance?.toFixed(2)}km • ${merchant.category}`}
          />
        ))}
      </MapView>

      {/* Search Bar */}
      <View className="absolute top-12 left-4 right-4 bg-white dark:bg-gray-800 rounded-full shadow-lg px-4 py-3 flex-row items-center">
        <Text className="text-gray-400 mr-2">🔍</Text>
        <TextInput
          className="flex-1 text-gray-900 dark:text-white"
          placeholder="Search for merchants..."
          placeholderTextColor="#9ca3af"
          value={filters.searchQuery}
          onChangeText={(text) => setFilters({...filters, searchQuery: text})}
        />
        {filters.searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setFilters({...filters, searchQuery: ""})}>
            <Text className="text-gray-400">✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter FAB */}
      <TouchableOpacity
        onPress={() => setShowFilters(true)}
        className="absolute top-32 right-4 bg-blue-600 rounded-full w-14 h-14 items-center justify-center shadow-lg"
        style={{elevation: 5}}
      >
        <Text className="text-white text-2xl">⚙️</Text>
      </TouchableOpacity>

      {/* Refresh FAB */}
      <TouchableOpacity
        onPress={handleRefresh}
        className="absolute top-52 right-4 bg-white dark:bg-gray-800 rounded-full w-14 h-14 items-center justify-center shadow-lg"
        style={{elevation: 5}}
      >
        <Text className="text-gray-900 dark:text-white text-2xl">🔄</Text>
      </TouchableOpacity>

      {/* Saved Restaurants FAB */}
      <TouchableOpacity
        onPress={() => router.push("/(protected)/saved-restaurants")}
        className="absolute bottom-24 right-4 bg-teal-600 rounded-full w-14 h-14 items-center justify-center shadow-lg"
        style={{elevation: 5}}
      >
        <Text className="text-white text-2xl">❤️</Text>
      </TouchableOpacity>

      {/* Results Count */}
      <View className="absolute bottom-8 left-4 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg">
        <Text className="text-sm font-medium text-gray-900 dark:text-white">
          {filteredMerchants.length} merchants nearby
        </Text>
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View className="absolute inset-0 bg-black/20 justify-center items-center">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="mt-2 text-gray-900 dark:text-white">Loading...</Text>
          </View>
        </View>
      )}

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-900 rounded-t-3xl p-6" style={{maxHeight: height * 0.75}}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Text className="text-gray-500 text-2xl">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Payment Method Filters */}
              <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Payment Methods</Text>
                <View className="gap-3">
                  <TouchableOpacity
                    onPress={() => setFilters({...filters, onlySol: !filters.onlySol})}
                    className="flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
                  >
                    <View
                      className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                        filters.onlySol ? "bg-purple-600 border-purple-600" : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {filters.onlySol && <Text className="text-white text-xs">✓</Text>}
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 dark:text-white font-medium">SOL Only</Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">Show merchants accepting SOL</Text>
                    </View>
                    <View className="w-3 h-3 rounded-full bg-purple-600" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setFilters({...filters, onlyUsdc: !filters.onlyUsdc})}
                    className="flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
                  >
                    <View
                      className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                        filters.onlyUsdc ? "bg-green-600 border-green-600" : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {filters.onlyUsdc && <Text className="text-white text-xs">✓</Text>}
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 dark:text-white font-medium">USDC Only</Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">Show merchants accepting USDC</Text>
                    </View>
                    <View className="w-3 h-3 rounded-full bg-green-600" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Category Filter */}
              <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Category</Text>
                <View className="flex-row flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() =>
                        setFilters({
                          ...filters,
                          category: cat === "All" ? undefined : cat,
                        })
                      }
                      className={`px-4 py-2 rounded-full border ${
                        (cat === "All" && !filters.category) || filters.category === cat
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                      }`}
                    >
                      <Text
                        className={
                          (cat === "All" && !filters.category) || filters.category === cat
                            ? "text-white font-medium"
                            : "text-gray-700 dark:text-gray-300"
                        }
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Legend */}
              <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Pin Colors</Text>
                <View className="gap-2">
                  <View className="flex-row items-center gap-3">
                    <View className="w-4 h-4 rounded-full bg-purple-600" />
                    <Text className="text-gray-700 dark:text-gray-300">SOL only</Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <View className="w-4 h-4 rounded-full bg-green-600" />
                    <Text className="text-gray-700 dark:text-gray-300">USDC only</Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <View className="w-4 h-4 rounded-full bg-teal-600" />
                    <Text className="text-gray-700 dark:text-gray-300">Both SOL & USDC</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Apply Button */}
            <TouchableOpacity
              onPress={handleFilterApply}
              className="bg-blue-600 rounded-lg py-4 items-center mt-4"
            >
              <Text className="text-white font-bold text-base">Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
