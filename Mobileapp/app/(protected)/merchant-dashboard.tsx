import {useState, useEffect} from "react";
import {View, Text, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert, Linking} from "react-native";
import {Screen} from "@/components/ui/Screen";
import {Button} from "@/components/ui/Button";
import {useAuth} from "@/hooks/useAuth";
import {doc, getDoc, updateDoc, collection, query, where, orderBy, limit, getDocs} from "firebase/firestore";
import {db} from "@/services/firebase";
import {router} from "expo-router";
import type {Merchant} from "@/types";

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  senderWallet: string;
  txSignature: string;
  createdAt: any;
}

export default function MerchantDashboardScreen() {
  const {user} = useAuth();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  useEffect(() => {
    loadMerchantData();
  }, [user]);

  const loadMerchantData = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      // Get user's merchant ID
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists() || !userDoc.data()?.isMerchant) {
        setLoading(false);
        return;
      }

      const userId = userDoc.data().merchantId;
      setMerchantId(userId);

      // Get merchant data
      const merchantDoc = await getDoc(doc(db, "merchants", userId));

      if (!merchantDoc.exists()) {
        setLoading(false);
        return;
      }

      const merchantData = merchantDoc.data();
      setMerchant({
        id: merchantDoc.id,
        walletAddress: merchantData.walletAddress,
        name: merchantData.name,
        category: merchantData.category,
        description: merchantData.description || "",
        openingHours: merchantData.openingHours || "",
        photoUrl: merchantData.photoUrl || "",
        lat: merchantData.lat,
        lng: merchantData.lng,
        geoHash: merchantData.geoHash,
        acceptsSol: merchantData.acceptsSol,
        acceptsUsdc: merchantData.acceptsUsdc,
        isActive: merchantData.isActive,
        totalPaymentsCount: merchantData.totalPaymentsCount || 0,
        totalVolumeSOL: merchantData.totalVolumeSOL || 0,
        totalVolumeUSDC: merchantData.totalVolumeUSDC || 0,
        averageRating: merchantData.averageRating || 0,
        ratingCount: merchantData.ratingCount || 0,
      });

      // Load recent transactions
      const txQuery = query(
        collection(db, "transactions"),
        where("merchantId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      const txSnapshot = await getDocs(txQuery);
      const transactions: Transaction[] = [];

      txSnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          amount: data.amount,
          currency: data.currency,
          senderWallet: data.senderWallet,
          txSignature: data.txSignature,
          createdAt: data.createdAt,
        });
      });

      setRecentTransactions(transactions);
    } catch (error) {
      console.error("Failed to load merchant data:", error);
      Alert.alert("Error", "Failed to load merchant data");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!merchantId || !merchant) return;

    setUpdatingStatus(true);

    try {
      const newStatus = !merchant.isActive;
      await updateDoc(doc(db, "merchants", merchantId), {
        isActive: newStatus,
      });

      setMerchant({...merchant, isActive: newStatus});
      Alert.alert("Success", `Your business is now ${newStatus ? "Open" : "Closed"}`);
    } catch (error) {
      console.error("Failed to update status:", error);
      Alert.alert("Error", "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRequestPayment = () => {
    if (!merchantId) return;
    router.push({
      pathname: "/(protected)/request-payment",
      params: {merchantId},
    });
  };

  const handleViewOnChain = () => {
    if (!merchant) return;

    // Open Solana Explorer for the merchant's proof PDA
    // We would need to store proofPdaAddress in merchant data from Phase 2
    Alert.alert("View On-Chain Proof", "This feature requires the proof PDA address from merchant registration.");
  };

  const handleViewTransaction = (txSignature: string) => {
    const url = `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`;
    Linking.openURL(url);
  };

  const truncateAddress = (address: string): string => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <Screen className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</Text>
      </Screen>
    );
  }

  if (!merchant || !merchantId) {
    return (
      <Screen className="flex-1 justify-center items-center px-6">
        <Text className="text-6xl mb-4">🏪</Text>
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          No Merchant Account
        </Text>
        <Text className="text-center text-gray-600 dark:text-gray-400 mb-6">
          You haven't registered as a merchant yet. Register your business to start accepting crypto payments.
        </Text>
        <Button onPress={() => router.push("/(protected)/register-merchant")}>Register as Merchant</Button>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-24">
          {/* Header */}
          <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{merchant.name}</Text>
          <Text className="text-base text-gray-600 dark:text-gray-400 mb-6">Merchant Dashboard</Text>

          {/* Open/Closed Toggle */}
          <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 flex-row justify-between items-center">
            <View>
              <Text className="text-lg font-bold text-gray-900 dark:text-white">Business Status</Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {merchant.isActive ? "Currently Open" : "Currently Closed"}
              </Text>
            </View>
            <Switch
              value={merchant.isActive}
              onValueChange={handleToggleStatus}
              disabled={updatingStatus}
              trackColor={{false: "#d1d5db", true: "#10b981"}}
              thumbColor={merchant.isActive ? "#059669" : "#9ca3af"}
            />
          </View>

          {/* Stats Grid */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">Statistics</Text>
            <View className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <View className="flex-row justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-3xl font-bold text-gray-900 dark:text-white">
                    {merchant.totalPaymentsCount}
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">Total Payments</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {merchant.totalVolumeSOL.toFixed(2)}
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">SOL Volume</Text>
                </View>
              </View>
              <View className="flex-row justify-between">
                <View className="flex-1">
                  <Text className="text-3xl font-bold text-green-600 dark:text-green-400">
                    ${merchant.totalVolumeUSDC.toFixed(2)}
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">USDC Volume</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {merchant.averageRating > 0 ? merchant.averageRating.toFixed(1) : "-"}
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    Rating ({merchant.ratingCount} reviews)
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Recent Transactions */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push("/(protected)/transaction-history")}>
                <Text className="text-blue-600 dark:text-blue-400 font-medium">View All</Text>
              </TouchableOpacity>
            </View>

            {recentTransactions.length === 0 ? (
              <View className="bg-white dark:bg-gray-800 rounded-lg p-6 items-center">
                <Text className="text-gray-500 dark:text-gray-400">No transactions yet</Text>
              </View>
            ) : (
              <View className="gap-2">
                {recentTransactions.map((tx) => (
                  <TouchableOpacity
                    key={tx.id}
                    onPress={() => handleViewTransaction(tx.txSignature)}
                    className="bg-white dark:bg-gray-800 rounded-lg p-3"
                  >
                    <View className="flex-row justify-between items-start mb-1">
                      <Text className="text-base font-bold text-gray-900 dark:text-white">
                        {tx.amount} {tx.currency}
                      </Text>
                      <View
                        className={`px-2 py-0.5 rounded ${
                          tx.currency === "SOL" ? "bg-purple-100 dark:bg-purple-900/30" : "bg-green-100 dark:bg-green-900/30"
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            tx.currency === "SOL" ? "text-purple-700 dark:text-purple-300" : "text-green-700 dark:text-green-300"
                          }`}
                        >
                          {tx.currency}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      From: {truncateAddress(tx.senderWallet)}
                    </Text>
                    <Text className="text-xs text-gray-400 dark:text-gray-500">
                      {truncateAddress(tx.txSignature)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <Button onPress={handleRequestPayment} className="bg-blue-600">
              💳 Request Payment
            </Button>

            <Button onPress={handleViewOnChain} variant="outline">
              🔗 View On-Chain Proof
            </Button>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
