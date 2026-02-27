import {View, Text, TouchableOpacity, Linking, Animated} from "react-native";
import {Screen} from "@/components/ui/Screen";
import {Button} from "@/components/ui/Button";
import {useLocalSearchParams, router} from "expo-router";
import {useEffect, useRef} from "react";

export default function PaymentSuccessScreen() {
  const {txSignature, amount, currency, merchantName} = useLocalSearchParams();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate checkmark
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleViewOnExplorer = () => {
    const url = `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`;
    Linking.openURL(url);
  };

  const handleBackToMap = () => {
    router.replace("/(protected)/map-home");
  };

  return (
    <Screen>
      <View className="flex-1 justify-center items-center px-6">
        {/* Animated Checkmark */}
        <Animated.View
          style={{
            transform: [{scale: scaleAnim}],
          }}
        >
          <View className="w-32 h-32 bg-green-500 rounded-full items-center justify-center mb-6">
            <Text className="text-white text-6xl">✓</Text>
          </View>
        </Animated.View>

        {/* Success Message */}
        <Animated.View style={{opacity: fadeAnim}} className="items-center">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</Text>
          <Text className="text-lg text-gray-600 dark:text-gray-400 mb-8 text-center">
            Your payment has been confirmed on the blockchain
          </Text>

          {/* Payment Details */}
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full mb-6">
            <View className="items-center mb-4">
              <Text className="text-5xl font-bold text-gray-900 dark:text-white mb-1">{amount}</Text>
              <Text className="text-xl text-gray-600 dark:text-gray-400">{currency}</Text>
            </View>

            <View className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <View className="flex-row justify-between mb-3">
                <Text className="text-gray-600 dark:text-gray-400">Paid to:</Text>
                <Text className="text-gray-900 dark:text-white font-medium">{merchantName}</Text>
              </View>

              <View className="mb-3">
                <Text className="text-gray-600 dark:text-gray-400 mb-1">Transaction:</Text>
                <TouchableOpacity onPress={handleViewOnExplorer}>
                  <Text className="text-blue-600 dark:text-blue-400 text-xs font-mono" numberOfLines={1}>
                    {txSignature}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="w-full gap-3">
            <Button onPress={handleViewOnExplorer}>🔗 View on Solana Explorer</Button>

            <Button onPress={handleBackToMap} variant="outline">
              🗺️ Back to Map
            </Button>
          </View>
        </Animated.View>
      </View>
    </Screen>
  );
}
