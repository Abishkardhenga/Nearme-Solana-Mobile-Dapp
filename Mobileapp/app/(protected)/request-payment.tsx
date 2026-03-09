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
import {useRoute} from "@react-navigation/native";
import {httpsCallable} from "firebase/functions";
import {functions} from "@/services/firebase";
import QRCode from "react-native-qrcode-svg";
import {getSOLPriceUSD, getUSDCPriceUSD} from "@/services/payment";

const {width} = Dimensions.get("window");

export default function RequestPaymentScreen() {
  const route = useRoute<any>();
  const {merchantId} = route.params || {};

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
    <Screen className="bg-gray-50 dark:bg-gray-900">
      <View className="flex-1 px-6 pt-6 pb-24">
        {/* Header */}
        <View className="bg-teal-600 rounded-2xl p-6 mb-6">
          <Text className="text-teal-100 text-sm font-medium mb-1">Merchant Tools</Text>
          <Text className="text-white text-3xl font-bold">Request Payment</Text>
          <Text className="text-teal-50 text-sm mt-2">
            Generate a QR code for customers to scan and pay
          </Text>
        </View>

        {/* Currency Selection */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-5 mb-5 border border-gray-100 dark:border-gray-700">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            Select Currency
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setCurrency("SOL")}
              className={`flex-1 py-4 rounded-xl border-2 ${
                currency === "SOL"
                  ? "bg-purple-600 border-purple-600"
                  : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              }`}
            >
              <Text
                className={`text-center font-bold text-base ${
                  currency === "SOL" ? "text-white" : "text-gray-700 dark:text-gray-300"
                }`}
              >
                SOL
              </Text>
              {solPrice > 0 && (
                <Text className={`text-center text-xs mt-1 ${
                  currency === "SOL" ? "text-white/80" : "text-gray-500 dark:text-gray-400"
                }`}>
                  ${solPrice.toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCurrency("USDC")}
              className={`flex-1 py-4 rounded-xl border-2 ${
                currency === "USDC"
                  ? "bg-green-600 border-green-600"
                  : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              }`}
            >
              <Text
                className={`text-center font-bold text-base ${
                  currency === "USDC" ? "text-white" : "text-gray-700 dark:text-gray-300"
                }`}
              >
                USDC
              </Text>
              <Text className={`text-center text-xs mt-1 ${
                currency === "USDC" ? "text-white/80" : "text-gray-500 dark:text-gray-400"
              }`}>
                ${usdcPrice.toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount Input */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-5 mb-5 border border-gray-100 dark:border-gray-700">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            Enter Amount
          </Text>
          <View className="bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-5 flex-row items-center border border-gray-200 dark:border-gray-700">
            <TextInput
              className="flex-1 text-4xl font-bold text-gray-900 dark:text-white"
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <View className={`px-3 py-1.5 rounded-lg ${
              currency === "SOL"
                ? "bg-purple-100 dark:bg-purple-900/30"
                : "bg-green-100 dark:bg-green-900/30"
            }`}>
              <Text className={`text-lg font-bold ${
                currency === "SOL"
                  ? "text-purple-700 dark:text-purple-300"
                  : "text-green-700 dark:text-green-300"
              }`}>
                {currency}
              </Text>
            </View>
          </View>

          {/* USD Equivalent */}
          <View className="mt-3 flex-row justify-between items-center">
            <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {loadingPrice ? "Loading price..." : `≈ $${usdValue} USD`}
            </Text>
            <TouchableOpacity onPress={loadPrices} className="px-3 py-1">
              <Text className="text-sm text-blue-600 dark:text-blue-400 font-semibold">Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Generate QR Button */}
        <Button
          onPress={handleGenerateQR}
          disabled={loading || !amount || parseFloat(amount) <= 0}
          className="rounded-xl mb-5"
        >
          {loading ? "Generating..." : "Generate QR Code"}
        </Button>

        {/* Quick Amount Buttons */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            Quick Amounts
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {currency === "SOL"
              ? [0.1, 0.5, 1, 2, 5].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => setAmount(amt.toString())}
                    className="bg-purple-100 dark:bg-purple-900/30 px-5 py-2.5 rounded-xl"
                  >
                    <Text className="text-purple-700 dark:text-purple-300 font-semibold">{amt} SOL</Text>
                  </TouchableOpacity>
                ))
              : [5, 10, 20, 50, 100].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => setAmount(amt.toString())}
                    className="bg-green-100 dark:bg-green-900/30 px-5 py-2.5 rounded-xl"
                  >
                    <Text className="text-green-700 dark:text-green-300 font-semibold">${amt}</Text>
                  </TouchableOpacity>
                ))}
          </View>
        </View>
      </View>

      {/* QR Code Modal */}
      <Modal visible={showQR} animationType="slide" onRequestClose={handleCloseQR}>
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center p-6">
          {/* Close Button */}
          <TouchableOpacity
            onPress={handleCloseQR}
            className="absolute top-12 right-6 z-10 bg-gray-200 dark:bg-gray-800 rounded-full w-10 h-10 items-center justify-center"
          >
            <Text className="text-2xl text-gray-700 dark:text-gray-300">✕</Text>
          </TouchableOpacity>

          {/* Content */}
          <View className="items-center w-full max-w-sm">
            {/* Header */}
            <View className="bg-purple-600 rounded-2xl p-6 w-full mb-6">
              <Text className="text-purple-100 text-sm font-medium mb-1 text-center">Payment Request</Text>
              <Text className="text-white text-3xl font-bold text-center">Scan to Pay</Text>
              <View className="bg-purple-700 px-4 py-2 rounded-xl self-center mt-3">
                <Text className="text-white text-2xl font-bold">
                  {amount} {currency}
                </Text>
              </View>
            </View>

            {/* QR Code */}
            {requestId && (
              <View className="bg-white dark:bg-gray-800 p-8 rounded-2xl mb-6 border-4 border-gray-100 dark:border-gray-700">
                <QRCode value={requestId} size={width * 0.65} />
              </View>
            )}

            {/* Timer */}
            {timeRemaining > 0 && (
              <View className="bg-blue-600 px-6 py-3 rounded-xl mb-4">
                <Text className="text-white font-bold text-lg text-center">
                  ⏱️ Expires in {formatTimeRemaining(timeRemaining)}
                </Text>
              </View>
            )}

            {/* Instructions */}
            <View className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
              <Text className="text-sm text-gray-600 dark:text-gray-400 text-center leading-6">
                Customer will scan this QR code{"\n"}to complete the payment securely
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
