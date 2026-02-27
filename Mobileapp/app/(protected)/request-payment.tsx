import {useState, useEffect, useRef} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import {Screen} from "@/components/ui/Screen";
import {Button} from "@/components/ui/Button";
import {useLocalSearchParams, router} from "expo-router";
import {httpsCallable} from "firebase/functions";
import {functions} from "@/services/firebase";
import QRCode from "react-native-qrcode-svg";
import {getSOLPriceUSD, getUSDCPriceUSD} from "@/services/payment";

const {width} = Dimensions.get("window");

export default function RequestPaymentScreen() {
  const {merchantId} = useLocalSearchParams();

  const [currency, setCurrency] = useState<"SOL" | "USDC">("SOL");
  const [amount, setAmount] = useState<string>("");
  const [usdValue, setUsdValue] = useState<string>("0.00");
  const [loading, setLoading] = useState<boolean>(false);

  // QR Code state
  const [showQR, setShowQR] = useState<boolean>(false);
  const [requestId, setRequestId] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Price state
  const [solPrice, setSolPrice] = useState<number>(0);
  const [usdcPrice, setUsdcPrice] = useState<number>(1.0);
  const [loadingPrice, setLoadingPrice] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadPrices();
  }, []);

  useEffect(() => {
    updateUSDValue();
  }, [amount, currency, solPrice, usdcPrice]);

  useEffect(() => {
    if (showQR && expiresAt > 0) {
      startTimer();
    } else {
      stopTimer();
    }

    return () => {
      stopTimer();
    };
  }, [showQR, expiresAt]);

  const loadPrices = async () => {
    setLoadingPrice(true);
    try {
      const [sol, usdc] = await Promise.all([getSOLPriceUSD(), getUSDCPriceUSD()]);
      setSolPrice(sol);
      setUsdcPrice(usdc);
    } catch (error) {
      console.error("Failed to load prices:", error);
    } finally {
      setLoadingPrice(false);
    }
  };

  const updateUSDValue = () => {
    const amountNum = parseFloat(amount) || 0;
    if (amountNum === 0) {
      setUsdValue("0.00");
      return;
    }

    const price = currency === "SOL" ? solPrice : usdcPrice;
    const usd = amountNum * price;
    setUsdValue(usd.toFixed(2));
  };

  const startTimer = () => {
    stopTimer();

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        stopTimer();
        Alert.alert("QR Code Expired", "This payment request has expired. Please generate a new one.", [
          {text: "OK", onPress: () => setShowQR(false)},
        ]);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleGenerateQR = async () => {
    if (!merchantId) {
      Alert.alert("Error", "Merchant ID not found");
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (amountNum > 1000000) {
      Alert.alert("Amount Too Large", "Maximum amount is 1,000,000");
      return;
    }

    setLoading(true);

    try {
      const createPaymentRequest = httpsCallable(functions, "createPaymentRequest");
      const result = await createPaymentRequest({
        merchantId: merchantId as string,
        amount: amountNum,
        currency,
      });

      const data = result.data as {requestId: string; expiresAt: number};

      setRequestId(data.requestId);
      setExpiresAt(data.expiresAt);
      setShowQR(true);

      console.log(`Payment request created: ${data.requestId}`);
    } catch (error: any) {
      console.error("Failed to create payment request:", error);
      Alert.alert("Error", error.message || "Failed to create payment request");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseQR = () => {
    setShowQR(false);
    setRequestId("");
    setExpiresAt(0);
    setTimeRemaining(0);
    stopTimer();
  };

  return (
    <Screen>
      <View className="flex-1 px-6 pt-6">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Request Payment</Text>
        <Text className="text-base text-gray-600 dark:text-gray-400 mb-6">
          Generate a QR code for customers to scan and pay
        </Text>

        {/* Currency Tabs */}
        <View className="flex-row gap-2 mb-6">
          <TouchableOpacity
            onPress={() => setCurrency("SOL")}
            className={`flex-1 py-3 rounded-lg border-2 ${
              currency === "SOL"
                ? "bg-purple-600 border-purple-600"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            }`}
          >
            <Text
              className={`text-center font-bold ${
                currency === "SOL" ? "text-white" : "text-gray-700 dark:text-gray-300"
              }`}
            >
              SOL
            </Text>
            {currency === "SOL" && solPrice > 0 && (
              <Text className="text-center text-xs text-white/80 mt-1">${solPrice.toFixed(2)}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCurrency("USDC")}
            className={`flex-1 py-3 rounded-lg border-2 ${
              currency === "USDC"
                ? "bg-green-600 border-green-600"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            }`}
          >
            <Text
              className={`text-center font-bold ${
                currency === "USDC" ? "text-white" : "text-gray-700 dark:text-gray-300"
              }`}
            >
              USDC
            </Text>
            {currency === "USDC" && (
              <Text className="text-center text-xs text-white/80 mt-1">${usdcPrice.toFixed(2)}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</Text>
          <View className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-4 flex-row items-center">
            <TextInput
              className="flex-1 text-4xl font-bold text-gray-900 dark:text-white"
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <Text className="text-2xl font-bold text-gray-500 dark:text-gray-400 ml-2">{currency}</Text>
          </View>

          {/* USD Equivalent */}
          <View className="mt-2 flex-row justify-between items-center">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {loadingPrice ? "Loading price..." : `≈ $${usdValue} USD`}
            </Text>
            <TouchableOpacity onPress={loadPrices}>
              <Text className="text-sm text-blue-600 dark:text-blue-400">Refresh Price</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Generate QR Button */}
        <Button onPress={handleGenerateQR} disabled={loading || !amount || parseFloat(amount) <= 0}>
          {loading ? "Generating..." : "Generate QR Code"}
        </Button>

        {/* Quick Amount Buttons */}
        <View className="mt-6">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Amounts</Text>
          <View className="flex-row flex-wrap gap-2">
            {currency === "SOL"
              ? [0.1, 0.5, 1, 2, 5].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => setAmount(amt.toString())}
                    className="bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full"
                  >
                    <Text className="text-purple-700 dark:text-purple-300 font-medium">{amt} SOL</Text>
                  </TouchableOpacity>
                ))
              : [5, 10, 20, 50, 100].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => setAmount(amt.toString())}
                    className="bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full"
                  >
                    <Text className="text-green-700 dark:text-green-300 font-medium">${amt}</Text>
                  </TouchableOpacity>
                ))}
          </View>
        </View>
      </View>

      {/* QR Code Modal */}
      <Modal visible={showQR} animationType="slide" onRequestClose={handleCloseQR}>
        <View className="flex-1 bg-white dark:bg-gray-900 justify-center items-center p-6">
          {/* Close Button */}
          <TouchableOpacity onPress={handleCloseQR} className="absolute top-12 right-6 z-10">
            <Text className="text-3xl text-gray-500">✕</Text>
          </TouchableOpacity>

          {/* Content */}
          <View className="items-center">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Scan to Pay</Text>
            <Text className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              {amount} {currency}
            </Text>

            {/* QR Code */}
            {requestId && (
              <View className="bg-white p-6 rounded-2xl mb-6">
                <QRCode value={requestId} size={width * 0.7} />
              </View>
            )}

            {/* Timer */}
            {timeRemaining > 0 && (
              <View className="bg-blue-100 dark:bg-blue-900/30 px-6 py-3 rounded-full mb-4">
                <Text className="text-blue-700 dark:text-blue-300 font-bold text-lg">
                  ⏱️ Expires in {formatTimeRemaining(timeRemaining)}
                </Text>
              </View>
            )}

            <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Customer will scan this QR code{"\n"}to complete the payment
            </Text>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
