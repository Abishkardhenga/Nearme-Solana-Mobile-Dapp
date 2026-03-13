import {useState, useEffect} from "react";
import {View, Text, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert, Linking} from "react-native";
import {Screen} from "@/components/ui/Screen";
import {Button} from "@/components/ui/Button";
import {useAuth} from "@/hooks/useAuth";
import {doc, updateDoc, collection, query, where, orderBy, limit, getDocs} from "firebase/firestore";
import {db} from "@/services/firebase";
import type {Merchant} from "@/types";

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  senderWallet: string;
  txSignature: string;
  createdAt: any;
}

export default function MerchantDashboardScreen({ navigation }: any) {
  const {user} = useAuth();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMerchantData();
  }, [user]);

  const loadMerchantData = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Query merchants collection directly by userId
      const merchantsQuery = query(
        collection(db, "merchants"),
        where("userId", "==", user.uid),
        limit(1)
      );

      const merchantSnapshot = await getDocs(merchantsQuery);

      if (merchantSnapshot.empty) {
        console.log("No merchant found for user:", user.uid);
        setLoading(false);
        return;
      }

      const merchantDoc = merchantSnapshot.docs[0];
      const merchantData = merchantDoc.data();

      setMerchantId(merchantDoc.id);
      setMerchant({
        id: merchantDoc.id,
        walletAddress: merchantData.walletAddress,
        name: merchantData.name || "My Business",
        category: merchantData.category || "General",
        description: merchantData.description || "",
        openingHours: merchantData.openingHours || "",
        photoUrl: merchantData.photoUrl || "",
        lat: merchantData.lat ?? 0,
        lng: merchantData.lng ?? 0,
        geoHash: merchantData.geoHash || "",
        acceptsSol: merchantData.acceptsSol ?? true,
        acceptsUsdc: merchantData.acceptsUsdc ?? false,
        isActive: merchantData.active !== undefined ? merchantData.active : true,
        totalPaymentsCount: merchantData.totalPaymentsCount || 0,
        totalVolumeSOL: merchantData.totalVolumeSOL || 0,
        totalVolumeUSDC: merchantData.totalVolumeUSDC || 0,
        averageRating: merchantData.averageRating || 0,
        ratingCount: merchantData.ratingCount || 0,
        verified: merchantData.verified ?? false,
        blockchainRegistered: merchantData.blockchainRegistered ?? false,
      });

      // Load recent transactions (with error handling for missing index)
      try {
        const txQuery = query(
          collection(db, "transactions"),
          where("merchantId", "==", merchantDoc.id),
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
      } catch (txError: any) {
        console.log("Transactions not available yet (index may be needed):", txError);
        // Don't fail the whole page if transactions can't load
        setRecentTransactions([]);
      }
    } catch (error: any) {
      console.error("Failed to load merchant data:", error);
      setError(error.message || "Failed to load merchant data");
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
    navigation.navigate("RequestPayment", { merchantId });
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

  if (error) {
    return (
      <Screen className="flex-1 justify-center items-center px-6">
        <Text className="text-6xl mb-4">⚠️</Text>
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          Error Loading Data
        </Text>
        <Text className="text-center text-gray-600 dark:text-gray-400 mb-6">
          {error}
        </Text>
        <Button onPress={loadMerchantData}>Try Again</Button>
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
        <Button onPress={() => navigation.navigate("RegisterMerchant")}>Register as Merchant</Button>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-24 gap-5">
          {/* Header */}
          <View className="bg-blue-600 rounded-2xl p-5">
            <Text className="text-blue-100 text-sm font-medium mb-1">Merchant Dashboard</Text>
            <Text className="text-white text-3xl font-bold mb-3">{merchant.name}</Text>
            <View className="flex-row items-center justify-between">
              <View className="bg-white/20 px-3 py-1 rounded-full">
                <Text className="text-white text-sm font-medium">{merchant.category}</Text>
              </View>
              <View
                className={`px-3 py-1 rounded-full ${
                  merchant.isActive ? "bg-emerald-500" : "bg-gray-500"
                }`}
              >
                <Text className="text-white text-sm font-semibold">
                  {merchant.isActive ? "Open" : "Closed"}
                </Text>
              </View>
            </View>
          </View>

          {/* Registration Warning Banner */}
          {(!merchant.verified || !merchant.blockchainRegistered) && (
            <View className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
              <View className="flex-row items-start gap-3">
                <Text className="text-2xl">⚠️</Text>
                <View className="flex-1">
                  <Text className="text-base font-bold text-orange-900 dark:text-orange-100 mb-1">
                    Registration Incomplete
                  </Text>
                  <Text className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                    Complete your business registration to start accepting payments and appear on the merchant map.
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("RegisterMerchant")}
                    className="bg-orange-600 rounded-lg px-4 py-2 self-start"
                  >
                    <Text className="text-white font-semibold text-sm">Complete Registration →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Status Toggle */}
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 flex-row justify-between items-center border border-gray-100 dark:border-gray-700">
            <View className="pr-3 flex-1">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">Business Status</Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {merchant.isActive
                  ? "You are visible to customers and accepting payments."
                  : "Your shop is hidden from customer discovery."}
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

          {/* Business Info */}
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">Business Information</Text>

            {merchant.description ? (
              <View className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                <Text className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Description
                </Text>
                <Text className="text-base text-gray-900 dark:text-white leading-6">{merchant.description}</Text>
              </View>
            ) : null}

            {merchant.openingHours ? (
              <View className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                <Text className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Opening Hours
                </Text>
                <Text className="text-base text-gray-900 dark:text-white">{merchant.openingHours}</Text>
              </View>
            ) : null}

            <View className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
              <Text className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Payment Methods
              </Text>
              <View className="flex-row gap-2">
                {merchant.acceptsSol ? (
                  <View className="bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full">
                    <Text className="text-sm font-medium text-purple-700 dark:text-purple-300">SOL</Text>
                  </View>
                ) : null}
                {merchant.acceptsUsdc ? (
                  <View className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                    <Text className="text-sm font-medium text-green-700 dark:text-green-300">USDC</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View>
              <Text className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Location
              </Text>
              <Text className="text-base text-gray-900 dark:text-white">
                {merchant.lat && merchant.lng
                  ? `${merchant.lat.toFixed(6)}, ${merchant.lng.toFixed(6)}`
                  : "Location not set"}
              </Text>
            </View>
          </View>

          {/* Recent Transactions */}
          <View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">Recent Transactions</Text>
              <TouchableOpacity onPress={() => navigation.navigate("TransactionHistory")}>
                <Text className="text-blue-600 dark:text-blue-400 font-medium">View All</Text>
              </TouchableOpacity>
            </View>

            {recentTransactions.length === 0 ? (
              <View className="bg-white dark:bg-gray-800 rounded-xl p-6 items-center border border-gray-100 dark:border-gray-700">
                <Text className="text-gray-500 dark:text-gray-400 text-center">
                  No transactions yet. Your latest payments will appear here.
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {recentTransactions.map((tx) => (
                  <TouchableOpacity
                    key={tx.id}
                    onPress={() => handleViewTransaction(tx.txSignature)}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700"
                  >
                    <View className="flex-row justify-between items-start mb-2">
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
            <Button onPress={handleRequestPayment} className="bg-blue-600 rounded-xl">
              Request Payment
            </Button>

            <Button onPress={() => navigation.navigate("BusinessDetails")} variant="outline" className="rounded-xl">
              View Complete Details
            </Button>

            {merchant.verified && merchant.blockchainRegistered ? (
              <Button onPress={() => navigation.navigate("RegisterMerchant")} variant="outline" className="rounded-xl">
                Edit Business Info
              </Button>
            ) : (
              <Button onPress={() => navigation.navigate("RegisterMerchant")} className="bg-purple-600 rounded-xl">
                Complete Business Registration
              </Button>
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
