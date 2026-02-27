import {useState, useEffect, useRef} from "react";
import {View, Text, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image} from "react-native";
import {Screen} from "@/components/ui/Screen";
import {Button} from "@/components/ui/Button";
import {useAuth} from "@/hooks/useAuth";
import {router} from "expo-router";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import MapView, {Marker, PROVIDER_GOOGLE} from "react-native-maps";
import {httpsCallable} from "firebase/functions";
import {ref, uploadBytes, getDownloadURL} from "firebase/storage";
import {functions, storage} from "@/services/firebase";

interface MerchantFormData {
  name: string;
  category: string;
  description: string;
  openingHours: string;
  acceptsSol: boolean;
  acceptsUsdc: boolean;
}

const CATEGORIES = [
  "Restaurant",
  "Cafe",
  "Bar",
  "Shop",
  "Service",
  "Other",
];

export default function RegisterMerchantScreen() {
  const {user} = useAuth();

  // Form state
  const [formData, setFormData] = useState<MerchantFormData>({
    name: "",
    category: CATEGORIES[0],
    description: "",
    openingHours: "9:00 AM - 5:00 PM",
    acceptsSol: true,
    acceptsUsdc: true,
  });

  // Location state
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [claimedLocation, setClaimedLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(true);

  // Photo state
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const mapRef = useRef<MapView>(null);

  // Request location permission and get current location
  useEffect(() => {
    (async () => {
      const {status} = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to register as a merchant. Please enable it in your device settings."
        );
        setLoadingLocation(false);
        return;
      }

      setLocationPermission(true);

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setCurrentLocation(location);
        setClaimedLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setLoadingLocation(false);
      } catch (error) {
        console.error("Failed to get location:", error);
        Alert.alert("Error", "Failed to get your current location. Please try again.");
        setLoadingLocation(false);
      }
    })();
  }, []);

  const handlePickPhoto = async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Please grant photo library access to upload a photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoUri) return null;

    try {
      const response = await fetch(photoUri);
      const blob = await response.blob();

      const filename = `merchants/${user?.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      return downloadUrl;
    } catch (error) {
      console.error("Failed to upload photo:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert("Validation Error", "Please enter your business name.");
      return;
    }

    if (!currentLocation || !claimedLocation) {
      Alert.alert("Location Required", "Please enable location services and ensure GPS signal is strong.");
      return;
    }

    if (!locationPermission) {
      Alert.alert("Permission Required", "Location permission is required to register.");
      return;
    }

    if (!user?.uid) {
      Alert.alert("Error", "You must be logged in to register as a merchant.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload photo if one was selected
      let photoUrl: string | null = null;
      if (photoUri) {
        photoUrl = await uploadPhoto();
      }

      // Prepare data for Cloud Function
      const registrationData = {
        // GPS data
        actualLat: currentLocation.coords.latitude,
        actualLng: currentLocation.coords.longitude,
        claimedLat: claimedLocation.latitude,
        claimedLng: claimedLocation.longitude,
        accuracy: currentLocation.coords.accuracy || 0,
        mocked: currentLocation.mocked || false,

        // Merchant data
        walletAddress: user.uid, // Using Firebase UID as wallet address for now
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim(),
        openingHours: formData.openingHours.trim(),
        acceptsSol: formData.acceptsSol,
        acceptsUsdc: formData.acceptsUsdc,
        photoUrl: photoUrl || "",
      };

      console.log("Submitting merchant registration...", registrationData);

      // Call Cloud Function
      const registerMerchant = httpsCallable(functions, "registerMerchant");
      const result = await registerMerchant(registrationData);

      console.log("Registration successful:", result.data);

      Alert.alert(
        "Success!",
        "Your business has been registered successfully! Your location proof has been recorded on-chain.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(protected)/"),
          },
        ]
      );
    } catch (error: any) {
      console.error("Registration failed:", error);

      let errorMessage = "Failed to register merchant. Please try again.";

      if (error.code === "unauthenticated") {
        errorMessage = "You must be logged in to register.";
      } else if (error.code === "failed-precondition") {
        errorMessage = error.message;
      } else if (error.code === "already-exists") {
        errorMessage = "You have already registered as a merchant.";
      }

      Alert.alert("Registration Failed", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingLocation) {
    return (
      <Screen className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">Getting your location...</Text>
      </Screen>
    );
  }

  if (!locationPermission || !currentLocation || !claimedLocation) {
    return (
      <Screen className="flex-1 justify-center items-center px-6">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">Location Required</Text>
        <Text className="text-center text-gray-600 dark:text-gray-400 mb-6">
          You need to enable location services to register as a merchant. This helps verify that you are physically
          present at your business location.
        </Text>
        <Button
          onPress={async () => {
            setLoadingLocation(true);
            const {status} = await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
              const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
              });
              setCurrentLocation(location);
              setClaimedLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              });
              setLocationPermission(true);
            }
            setLoadingLocation(false);
          }}
        >
          Enable Location
        </Button>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-24">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Register Your Business</Text>
          <Text className="text-base text-gray-600 dark:text-gray-400 mb-6">
            Mark your business location on the map and provide details
          </Text>

          {/* Map Section */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Location</Text>
            <View className="h-64 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={{flex: 1}}
                initialRegion={{
                  latitude: claimedLocation.latitude,
                  longitude: claimedLocation.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                showsUserLocation
                showsMyLocationButton
              >
                <Marker
                  coordinate={claimedLocation}
                  draggable
                  onDragEnd={(e) => setClaimedLocation(e.nativeEvent.coordinate)}
                  title="Your Business"
                  description="Drag to adjust location"
                />
              </MapView>
            </View>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Drag the pin to your exact business location. You must be within 50 metres to register.
            </Text>
          </View>

          {/* Business Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Name *</Text>
            <TextInput
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="e.g., Joe's Coffee Shop"
              placeholderTextColor="#9ca3af"
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
            />
          </View>

          {/* Category */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setFormData({...formData, category: cat})}
                  className={`px-4 py-2 rounded-full border ${
                    formData.category === cat
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  }`}
                >
                  <Text
                    className={
                      formData.category === cat ? "text-white font-medium" : "text-gray-700 dark:text-gray-300"
                    }
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</Text>
            <TextInput
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="Tell customers about your business..."
              placeholderTextColor="#9ca3af"
              value={formData.description}
              onChangeText={(text) => setFormData({...formData, description: text})}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Opening Hours */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opening Hours</Text>
            <TextInput
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="e.g., Mon-Fri 9:00 AM - 5:00 PM"
              placeholderTextColor="#9ca3af"
              value={formData.openingHours}
              onChangeText={(text) => setFormData({...formData, openingHours: text})}
            />
          </View>

          {/* Photo Upload */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Photo</Text>
            <TouchableOpacity
              onPress={handlePickPhoto}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 items-center"
            >
              {photoUri ? (
                <Image source={{uri: photoUri}} className="w-full h-48 rounded-lg" resizeMode="cover" />
              ) : (
                <View className="items-center">
                  <Text className="text-blue-600 dark:text-blue-400 font-medium">📷 Upload Photo</Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tap to select a photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Payment Methods */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Accept Payments In:</Text>
            <View className="gap-2">
              <TouchableOpacity
                onPress={() => setFormData({...formData, acceptsSol: !formData.acceptsSol})}
                className="flex-row items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4"
              >
                <View
                  className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                    formData.acceptsSol ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-700"
                  }`}
                >
                  {formData.acceptsSol && <Text className="text-white text-xs">✓</Text>}
                </View>
                <Text className="text-gray-900 dark:text-white font-medium">SOL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFormData({...formData, acceptsUsdc: !formData.acceptsUsdc})}
                className="flex-row items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4"
              >
                <View
                  className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                    formData.acceptsUsdc ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-700"
                  }`}
                >
                  {formData.acceptsUsdc && <Text className="text-white text-xs">✓</Text>}
                </View>
                <Text className="text-gray-900 dark:text-white font-medium">USDC</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* GPS Accuracy Info */}
          {currentLocation && (
            <View className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Text className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">GPS Status</Text>
              <Text className="text-xs text-blue-700 dark:text-blue-300">
                Accuracy: ±{Math.round(currentLocation.coords.accuracy || 0)} metres
                {currentLocation.mocked && " ⚠️ Mock location detected"}
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <Button onPress={handleSubmit} disabled={isSubmitting} className="mb-6">
            {isSubmitting ? "Registering..." : "Register Business"}
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}
