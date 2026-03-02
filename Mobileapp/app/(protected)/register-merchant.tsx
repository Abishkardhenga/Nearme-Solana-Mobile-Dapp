import {useState, useEffect, useRef} from "react";
import {View, Text, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image} from "react-native";
import {Screen} from "@/components/ui/Screen";
import {Button} from "@/components/ui/Button";
import {useAuth} from "@/hooks/useAuth";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import MapView, {Marker, PROVIDER_GOOGLE} from "react-native-maps";
import {ref, uploadBytes, getDownloadURL} from "firebase/storage";
import {collection, addDoc, setDoc, doc, serverTimestamp} from "firebase/firestore";
import {db, storage} from "@/services/firebase";
import {useWalletStore} from "@/store";
import {PublicKey} from "@solana/web3.js";
import {
  registerMerchantOnChain,
  REGISTRATION_FEE_SOL,
  REGISTRATION_FEE_LAMPORTS,
} from "@/services/merchantContract";

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

export default function RegisterMerchantScreen({ navigation }: any) {
  const {user} = useAuth();
  const {walletPublicKey: walletPublicKeyString} = useWalletStore();

  // Convert string to PublicKey object
  const walletPublicKey = walletPublicKeyString ? new PublicKey(walletPublicKeyString) : null;

  useEffect(() => {
    console.log("this is wallet key ", walletPublicKey?.toBase58())
  },[walletPublicKey])
  // Log wallet status when screen loads
  useEffect(() => {
    console.log("🏪 Registration Screen - Wallet Status Check:");
    console.log("  📦 Wallet from store (string):", walletPublicKeyString);
    console.log("  🔑 Wallet PublicKey:", walletPublicKey ? walletPublicKey.toBase58() : "null");
    console.log("  ✅ Connected:", walletPublicKey !== null);
  }, [walletPublicKeyString, walletPublicKey]);

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

    console.log("💳 Checking wallet before registration:");
    console.log("  📦 Wallet from store:", walletPublicKeyString);
    console.log("  🔑 Wallet PublicKey object:", walletPublicKey);
    console.log("  ✅ Is wallet connected?", walletPublicKey !== null);

    if (!walletPublicKey) {
      console.log("❌ Wallet check FAILED - showing alert");
      Alert.alert(
        "Wallet Required",
        "Please connect your Solana wallet to register as a merchant. A registration fee of 0.01 SOL is required."
      );
      return;
    }

    console.log("✅ Wallet check PASSED - proceeding with registration");
    console.log("📍 Using wallet:", walletPublicKey.toBase58());

    // Confirm registration fee
    Alert.alert(
      "Registration Fee",
      `Registering as a merchant requires a one-time fee of ${REGISTRATION_FEE_SOL} SOL (${REGISTRATION_FEE_LAMPORTS} lamports).\n\nThis fee is recorded on the Solana blockchain and ensures verified merchant registration.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Pay & Register",
          onPress: () => processRegistration(),
        },
      ]
    );
  };

  const processRegistration = async () => {
    setIsSubmitting(true);

    try {
      console.log("Starting merchant registration process...");

      // Step 1: Register on blockchain (pay registration fee)
      console.log("Step 1: Registering on blockchain...");
      const onChainResult = await registerMerchantOnChain({
        merchantWalletPubkey: walletPublicKey,
        merchantId: user.uid,
        businessName: formData.name.trim(),
        latitude: claimedLocation!.latitude,
        longitude: claimedLocation!.longitude,
      });

      if (!onChainResult.success) {
        throw new Error(onChainResult.error || "Failed to register on blockchain");
      }

      console.log("Blockchain registration successful! Signature:", onChainResult.signature);

      // Step 2: Upload photo if one was selected
      console.log("Step 2: Uploading photo...");
      let photoUrl: string | null = null;
      if (photoUri) {
        photoUrl = await uploadPhoto();
      }

      // Step 3: Save merchant data to Firestore
      console.log("Step 3: Saving to Firestore...");
      const merchantData = {
        // GPS data
        actualLat: currentLocation!.coords.latitude,
        actualLng: currentLocation!.coords.longitude,
        claimedLat: claimedLocation!.latitude,
        claimedLng: claimedLocation!.longitude,
        accuracy: currentLocation!.coords.accuracy || 0,
        mocked: currentLocation!.mocked || false,

        // Merchant data
        walletAddress: walletPublicKey.toBase58(),
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim(),
        openingHours: formData.openingHours.trim(),
        acceptsSol: formData.acceptsSol,
        acceptsUsdc: formData.acceptsUsdc,
        photoUrl: photoUrl || "",

        // Blockchain data
        blockchainRegistered: true,
        registrationTxSignature: onChainResult.signature,
        registrationFeeSOL: REGISTRATION_FEE_SOL,

        // Metadata
        userId: user.uid,
        userEmail: user.email,
        lat: claimedLocation!.latitude,
        lng: claimedLocation!.longitude,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        verified: true, // Mark as verified since they paid the fee
        active: true,
        totalPaymentsCount: 0,
        totalVolumeSOL: 0,
        totalVolumeUSDC: 0,
        averageRating: 0,
        ratingCount: 0,
      };

      // Use user.uid as the document ID for easy lookup
      const merchantDocRef = doc(db, "merchants", user.uid);
      await setDoc(merchantDocRef, merchantData);

      console.log("Registration successful for user:", user.uid);

      Alert.alert(
        "Success!",
        `Your business has been registered successfully on the Solana blockchain!\n\nTransaction: ${onChainResult.signature?.slice(0, 8)}...`,
        [
          {
            text: "View Dashboard",
            onPress: () => navigation.navigate("MerchantDashboard"),
          },
        ]
      );
    } catch (error: any) {
      console.error("❌❌❌ REGISTRATION SCREEN - Registration failed ❌❌❌");
      console.error("  Error type:", error.constructor?.name);
      console.error("  Error message:", error.message);
      console.error("  Error code:", error.code);
      console.error("  Full error:", error);
      console.error("  Error stack:", error.stack);

      let errorTitle = "Registration Failed";
      let errorMessage = "Failed to register merchant. Please check the console for details.";

      // Network errors
      if (error.message?.includes("Network request failed") || error.message?.includes("network")) {
        errorTitle = "Network Error";
        errorMessage = `Unable to connect to Solana network.\n\nPossible causes:\n• No internet connection\n• Solana devnet is down\n• Firewall blocking connection\n\nError: ${error.message}`;
      }
      // Wallet errors
      else if (error.message?.includes("Wallet signing failed") || error.message?.includes("User rejected")) {
        errorTitle = "Wallet Error";
        errorMessage = `Transaction was not approved in your wallet.\n\nPlease:\n• Make sure your wallet app is open\n• Approve the transaction when prompted\n• Check you have enough SOL\n\nError: ${error.message}`;
      }
      // Already registered
      else if (error.message?.includes("Merchant already registered") || error.message?.includes("already registered")) {
        errorTitle = "Already Registered";
        errorMessage = "You have already registered as a merchant on the blockchain. Please go to your dashboard to manage your business.";
      }
      // Insufficient funds
      else if (error.message?.includes("insufficient") || error.message?.includes("balance")) {
        errorTitle = "Insufficient Funds";
        errorMessage = `You don't have enough SOL in your wallet.\n\nRequired:\n• ${REGISTRATION_FEE_SOL} SOL registration fee\n• ~0.005 SOL for transaction costs\n• Total: ~${REGISTRATION_FEE_SOL + 0.005} SOL\n\nError: ${error.message}`;
      }
      // Blockchain/Transaction errors
      else if (error.message?.includes("blockchain") || error.message?.includes("transaction") || error.message?.includes("blockhash")) {
        errorTitle = "Blockchain Error";
        errorMessage = `The blockchain transaction failed.\n\nThis could be due to:\n• Network congestion\n• Expired transaction\n• Smart contract error\n\nError: ${error.message}\n\nPlease try again in a moment.`;
      }
      // Auth errors
      else if (error.code === "unauthenticated" || error.message?.includes("auth")) {
        errorTitle = "Authentication Error";
        errorMessage = "You must be logged in to register. Please sign in and try again.";
      }
      // Generic error with message
      else if (error.message) {
        errorMessage = `${error.message}\n\nIf this persists, please check:\n• Your internet connection\n• Your wallet has enough SOL\n• The console logs for more details`;
      }

      Alert.alert(errorTitle, errorMessage, [
        {text: "OK", style: "cancel"},
        {text: "View Logs", onPress: () => console.log("📋 Error details shown in console above")},
      ]);
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

          {/* Registration Fee Info */}
          <View className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <Text className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
              📝 Registration Fee
            </Text>
            <Text className="text-xs text-purple-700 dark:text-purple-300 mb-2">
              One-time fee: {REGISTRATION_FEE_SOL} SOL ({REGISTRATION_FEE_LAMPORTS.toLocaleString()} lamports)
            </Text>
            <Text className="text-xs text-purple-600 dark:text-purple-400">
              This fee is recorded on the Solana blockchain and ensures verified merchant status. Make sure you have
              connected your wallet and have sufficient SOL balance.
            </Text>
            {!walletPublicKey && (
              <Text className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                ⚠️ Wallet not connected! Please connect your wallet to register.
              </Text>
            )}
            {walletPublicKey && (
              <Text className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                ✓ Wallet connected: {walletPublicKey.toBase58().slice(0, 8)}...
              </Text>
            )}
          </View>

          {/* Submit Button */}
          <Button onPress={handleSubmit} disabled={isSubmitting || !walletPublicKey} className="mb-6">
            {isSubmitting ? "Registering..." : "Pay Fee & Register Business"}
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}
