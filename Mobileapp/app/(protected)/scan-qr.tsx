import {useState, useEffect} from "react";
import {View, Text, TouchableOpacity, ActivityIndicator, Alert} from "react-native";
import {Screen} from "@/components/ui/Screen";
import {Button} from "@/components/ui/Button";
import {CameraView, useCameraPermissions} from "expo-camera";
import {doc, getDoc} from "firebase/firestore";
import {httpsCallable} from "firebase/functions";
import {db, functions} from "@/services/firebase";
import {useWalletStore} from "@/store";
import {useNavigation} from "@react-navigation/native";
import {payWithSOL, payWithUSDC} from "@/services/payment";

interface PaymentRequest {
  merchantId: string;
  merchantName: string;
  merchantWallet: string;
  amount: number;
  currency: "SOL" | "USDC";
  status: string;
  expiresAt: any;
}

 function ScanQRScreen() {
  const navigation = useNavigation<any>();
  const {walletPublicKey} = useWalletStore();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<boolean>(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [paying, setPaying] = useState<boolean>(false);

  const handleBarCodeScanned = async ({data}: {type: string; data: string}) => {
    if (scanned) return;

    setScanned(true);
    setLoading(true);

    try {
      console.log(`QR Code scanned: ${data}`);

      // Fetch payment request from Firestore
      const requestDoc = await getDoc(doc(db, "paymentRequests", data));

      if (!requestDoc.exists()) {
        throw new Error("Payment request not found");
      }

      const requestData = requestDoc.data() as PaymentRequest;

      // Validate request
      if (requestData.status !== "pending") {
        throw new Error(`Payment request is ${requestData.status}`);
      }

      // Check expiration
      const now = Date.now();
      const expiresAt = requestData.expiresAt.toMillis();

      if (expiresAt < now) {
        throw new Error("Payment request has expired");
      }

      setPaymentRequest(requestData);
    } catch (error: any) {
      console.error("Failed to load payment request:", error);
      Alert.alert("Error", error.message || "Failed to load payment request", [
        {text: "Try Again", onPress: () => setScanned(false)},
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentRequest || !walletPublicKey) return;

    setPaying(true);

    try {
      // Execute payment based on currency
      const result =
        paymentRequest.currency === "SOL"
          ? await payWithSOL(walletPublicKey, paymentRequest.merchantWallet, paymentRequest.amount)
          : await payWithUSDC(walletPublicKey, paymentRequest.merchantWallet, paymentRequest.amount);

      if (!result.success) {
        throw new Error(result.error || "Payment failed");
      }

      console.log(`Payment successful: ${result.txSignature}`);

      // Fulfill payment request on the server
      const fulfillPaymentRequest = httpsCallable(functions, "fulfillPaymentRequest");
      await fulfillPaymentRequest({
        requestId: scanned,
        txSignature: result.txSignature,
        senderWallet: walletPublicKey.toBase58(),
      });

      console.log("Payment request fulfilled on server");

      // Navigate to success screen
      navigation.replace("PaymentSuccess", {
        txSignature: result.txSignature,
        amount: paymentRequest.amount.toString(),
        currency: paymentRequest.currency,
        merchantName: paymentRequest.merchantName,
      });
    } catch (error: any) {
      console.error("Payment failed:", error);
      Alert.alert("Payment Failed", error.message || "Failed to complete payment", [
        {text: "Try Again", onPress: () => setPaying(false)},
        {text: "Cancel", onPress: () => navigation.goBack()},
      ]);
    }
  };

  const handleCancel = () => {
    setScanned(false);
    setPaymentRequest(null);
  };

  if (!permission) {
    return (
      <Screen className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen className="flex-1 justify-center items-center px-6">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">Camera Permission Required</Text>
        <Text className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Please grant camera access to scan QR codes for payment.
        </Text>
        <Button onPress={requestPermission}>Grant Camera Access</Button>
      </Screen>
    );
  }

  if (paymentRequest) {
    // Show payment confirmation
    return (
      <Screen className="bg-gray-50 dark:bg-gray-900">
        <View className="flex-1 justify-center items-center px-6">
          {/* Header */}
          <View className="bg-blue-600 rounded-2xl p-6 w-full mb-6">
            <Text className="text-blue-100 text-sm font-medium mb-1">Payment Request</Text>
            <Text className="text-white text-2xl font-bold">Confirm Payment</Text>
          </View>

          {/* Payment Details Card */}
          <View className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full mb-6 border border-gray-100 dark:border-gray-700">
            <View className="items-center mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Amount
              </Text>
              <Text className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                {paymentRequest.amount}
              </Text>
              <View
                className={`px-4 py-1.5 rounded-full ${
                  paymentRequest.currency === "SOL"
                    ? "bg-purple-100 dark:bg-purple-900/30"
                    : "bg-green-100 dark:bg-green-900/30"
                }`}
              >
                <Text
                  className={`text-lg font-bold ${
                    paymentRequest.currency === "SOL"
                      ? "text-purple-700 dark:text-purple-300"
                      : "text-green-700 dark:text-green-300"
                  }`}
                >
                  {paymentRequest.currency}
                </Text>
              </View>
            </View>

            <View className="gap-3">
              <View>
                <Text className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Merchant
                </Text>
                <Text className="text-base text-gray-900 dark:text-white font-medium">
                  {paymentRequest.merchantName}
                </Text>
              </View>

              <View>
                <Text className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Payment Method
                </Text>
                <View
                  className={`px-3 py-2 rounded-lg self-start ${
                    paymentRequest.currency === "SOL"
                      ? "bg-purple-100 dark:bg-purple-900/30"
                      : "bg-green-100 dark:bg-green-900/30"
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      paymentRequest.currency === "SOL"
                        ? "text-purple-700 dark:text-purple-300"
                        : "text-green-700 dark:text-green-300"
                    }`}
                  >
                    {paymentRequest.currency === "SOL" ? "Solana (SOL)" : "USD Coin (USDC)"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="w-full gap-3">
            <Button onPress={handleConfirmPayment} disabled={paying} className="rounded-xl">
              {paying ? "Processing..." : "Confirm and Pay"}
            </Button>

            <Button onPress={handleCancel} variant="outline" disabled={paying} className="rounded-xl">
              Cancel
            </Button>
          </View>

          {/* Loading State */}
          {paying && (
            <View className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-4 w-full border border-gray-100 dark:border-gray-700">
              <View className="flex-row items-center justify-center gap-3">
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text className="text-center text-gray-900 dark:text-white font-medium">
                  Processing payment...
                </Text>
              </View>
            </View>
          )}
        </View>
      </Screen>
    );
  }

  // Show camera scanner
  return (
    <View className="flex-1">
      <CameraView
        style={{flex: 1}}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      >
        <View className="flex-1 bg-black/40">
          {/* Header */}
          <View className="pt-12 px-6">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
              <Text className="text-white text-4xl">←</Text>
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-white mb-2">Scan QR Code</Text>
            <Text className="text-white/80">Point your camera at the merchant's QR code</Text>
          </View>

          {/* Scanning Frame */}
          <View className="flex-1 justify-center items-center">
            <View className="w-72 h-72 border-4 border-white rounded-2xl" />
          </View>

          {/* Loading Indicator */}
          {loading && (
            <View className="absolute inset-0 bg-black/60 justify-center items-center">
              <ActivityIndicator size="large" color="#ffffff" />
              <Text className="text-white mt-4">Loading payment request...</Text>
            </View>
          )}
        </View>
      </CameraView>
    </View>
  );
}


export default ScanQRScreen;