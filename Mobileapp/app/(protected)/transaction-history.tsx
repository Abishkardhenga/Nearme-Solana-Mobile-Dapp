import {useState, useEffect} from "react";
import {View, Text, FlatList, TouchableOpacity, RefreshControl, Linking} from "react-native";
import {Screen} from "@/components/ui/Screen";
import {useAuth} from "@/hooks/useAuth";
import {collection, query, where, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot} from "firebase/firestore";
import {db} from "@/services/firebase";

interface Transaction {
  id: string;
  merchantId: string;
  merchantName: string;
  senderWallet: string;
  amount: number;
  currency: string;
  txSignature: string;
  createdAt: any;
  blockTime?: number;
}

const PAGE_SIZE = 20;

export default function TransactionHistoryScreen() {
  const {user} = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);

  // Filter state
  const [filterCurrency, setFilterCurrency] = useState<"ALL" | "SOL" | "USDC">("ALL");

  useEffect(() => {
    loadTransactions();
  }, [user, filterCurrency]);

  const loadTransactions = async (isRefresh = false) => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      // Build query
      let q = query(
        collection(db, "transactions"),
        where("senderWallet", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );

      // Apply currency filter
      if (filterCurrency !== "ALL") {
        q = query(
          collection(db, "transactions"),
          where("senderWallet", "==", user.uid),
          where("currency", "==", filterCurrency),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE)
        );
      }

      // If loading more, start after last document
      if (!isRefresh && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        if (isRefresh) {
          setTransactions([]);
        }
        setHasMore(false);
        return;
      }

      const txs: Transaction[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        txs.push({
          id: doc.id,
          merchantId: data.merchantId,
          merchantName: data.merchantName,
          senderWallet: data.senderWallet,
          amount: data.amount,
          currency: data.currency,
          txSignature: data.txSignature,
          createdAt: data.createdAt,
          blockTime: data.blockTime,
        });
      });

      if (isRefresh) {
        setTransactions(txs);
      } else {
        setTransactions([...transactions, ...txs]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setLastDoc(null);
    setHasMore(true);
    await loadTransactions(true);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    await loadTransactions(false);
    setLoadingMore(false);
  };

  const handleViewTransaction = (txSignature: string) => {
    const url = `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`;
    Linking.openURL(url);
  };

  const truncateAddress = (address: string): string => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const renderTransaction = ({item}: {item: Transaction}) => (
    <TouchableOpacity
      onPress={() => handleViewTransaction(item.txSignature)}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-1">{item.merchantName}</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">{formatDate(item.createdAt)}</Text>
        </View>

        <View className="items-end">
          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {item.amount} {item.currency}
          </Text>
          <View
            className={`px-2 py-1 rounded ${
              item.currency === "SOL" ? "bg-purple-100 dark:bg-purple-900/30" : "bg-green-100 dark:bg-green-900/30"
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                item.currency === "SOL" ? "text-purple-700 dark:text-purple-300" : "text-green-700 dark:text-green-300"
              }`}
            >
              {item.currency}
            </Text>
          </View>
        </View>
      </View>

      <Text className="text-xs text-gray-400 dark:text-gray-500 font-mono">
        {truncateAddress(item.txSignature)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Screen>
      <View className="flex-1 px-6 pt-6">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Transaction History</Text>
        <Text className="text-base text-gray-600 dark:text-gray-400 mb-4">Your payment history</Text>

        {/* Filter Buttons */}
        <View className="flex-row gap-2 mb-4">
          {(["ALL", "SOL", "USDC"] as const).map((currency) => (
            <TouchableOpacity
              key={currency}
              onPress={() => {
                setFilterCurrency(currency);
                setTransactions([]);
                setLastDoc(null);
                setHasMore(true);
              }}
              className={`px-4 py-2 rounded-full border ${
                filterCurrency === currency
                  ? "bg-blue-600 border-blue-600"
                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              }`}
            >
              <Text
                className={
                  filterCurrency === currency ? "text-white font-medium" : "text-gray-700 dark:text-gray-300"
                }
              >
                {currency}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transaction List */}
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-12">
              <Text className="text-gray-500 dark:text-gray-400">No transactions yet</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4">
                <Text className="text-center text-gray-500 dark:text-gray-400">Loading more...</Text>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: 24}}
        />
      </View>
    </Screen>
  );
}
