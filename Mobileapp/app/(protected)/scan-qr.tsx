import {useState, useEffect} from "react";
import {View, Text, TouchableOpacity, ActivityIndicator, Alert} from "react-native";
import {Screen} from "@/components/ui/Screen";
import {Button} from "@/components/ui/Button";
import {CameraView, useCameraPermissions} from "expo-camera";
import {doc, getDoc} from "firebase/firestore";
import {httpsCallable} from "firebase/functions";
import {db, functions} from "@/services/firebase";
import {useWalletStore} from "@/store";
import {router} from "expo-router";
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
      router.replace({
        pathname: "/(protected)/payment-success",
        params: {
          txSignature: result.txSignature,
          amount: paymentRequest.amount.toString(),
          currency: paymentRequest.currency,
          merchantName: paymentRequest.merchantName,
        },
      });
    } catch (error: any) {
      console.error("Payment failed:", error);
      Alert.alert("Payment Failed", error.message || "Failed to complete payment", [
        {text: "Try Again", onPress: () => setPaying(false)},
        {text: "Cancel", onPress: () => router.back()},
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
      <Screen>
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Confirm Payment</Text>

          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full mb-6">
            <View className="items-center mb-6">
              <Text className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                {paymentRequest.amount}
              </Text>
              <Text className="text-2xl text-gray-600 dark:text-gray-400">{paymentRequest.currency}</Text>
            </View>

            <View className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600 dark:text-gray-400">To:</Text>
                <Text className="text-gray-900 dark:text-white font-medium">{paymentRequest.merchantName}</Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Payment Method:</Text>
                <View
                  className={`px-3 py-1 rounded ${
                    paymentRequest.currency === "SOL"
                      ? "bg-purple-100 dark:bg-purple-900/30"
                      : "bg-green-100 dark:bg-green-900/30"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      paymentRequest.currency === "SOL"
                        ? "text-purple-700 dark:text-purple-300"
                        : "text-green-700 dark:text-green-300"
                    }`}
                  >
                    {paymentRequest.currency}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="w-full gap-3">
            <Button onPress={handleConfirmPayment} disabled={paying}>
              {paying ? "Processing..." : "Confirm and Pay"}
            </Button>

            <Button onPress={handleCancel} variant="outline" disabled={paying}>
              Cancel
            </Button>
          </View>

          {paying && (
            <View className="mt-4">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="text-center text-gray-600 dark:text-gray-400 mt-2">Processing payment...</Text>
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
            <TouchableOpacity onPress={() => router.back()} className="mb-4">
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