import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Linking,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useWallet } from "../src/hooks/useWallet";

export default function SendScreen() {
  const router = useRouter();
  const wallet = useWallet();

  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const handleSend = async () => {
    if (!toAddress.trim()) return Alert.alert("Enter a recipient address");
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      return Alert.alert("Enter a valid amount");
    }

    try {
      const sig = await wallet.sendSOL(toAddress.trim(), Number(amount));
      setTxSignature(sig);
      Alert.alert(
        "Transaction Sent! ✅",
        `Sent ${amount} SOL\nSignature: ${sig.slice(0, 20)}...`,
        [
          { text: "View on Solscan", onPress: () => Linking.openURL(`https://solscan.io/tx/${sig}?cluster=devnet`) },
          { text: "Done", onPress: () => router.back() },
        ]
      );
    } catch (error: any) {
      Alert.alert("Transaction Failed", error.message || "Something went wrong");
    }
  };

  if (!wallet.connected) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Wallet Not Connected</Text>
        <Text style={styles.emptyText}>
          Connect your wallet from the Wallet Connect screen first.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Send SOL</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>From</Text>
        <Text style={styles.cardAddress}>
          {wallet.publicKey?.toBase58().slice(0, 8)}...
          {wallet.publicKey?.toBase58().slice(-4)}
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Recipient Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste Solana address..."
          placeholderTextColor="#555"
          value={toAddress}
          onChangeText={setToAddress}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Amount (SOL)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.0"
          placeholderTextColor="#555"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
      </View>

      <TouchableOpacity
        style={[styles.sendButton, wallet.sending && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={wallet.sending}
      >
        {wallet.sending ? (
          <ActivityIndicator color="#0a0a1a" />
        ) : (
          <Text style={styles.sendButtonText}>Send SOL</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.feeText}>
        Network fee: ~0.000005 SOL ($0.001)
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a", padding: 16, paddingTop: 60 },
  center: {
    flex: 1, backgroundColor: "#0a0a1a",
    justifyContent: "center", alignItems: "center", padding: 40,
  },
  emptyTitle: { color: "#fff", fontSize: 20, fontWeight: "bold", marginTop: 16 },
  emptyText: { color: "#666", fontSize: 14, textAlign: "center", marginTop: 8 },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 24,
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  backText: { color: "#9945FF", fontSize: 16 },
  card: {
    backgroundColor: "#1a1a2e", borderRadius: 12, padding: 16, marginBottom: 20,
  },
  cardLabel: { color: "#888", fontSize: 12, textTransform: "uppercase", marginBottom: 4 },
  cardAddress: { color: "#9945FF", fontSize: 14, fontFamily: "monospace" },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: "#888", fontSize: 12, textTransform: "uppercase", marginBottom: 8 },
  input: {
    backgroundColor: "#1a1a2e", color: "#fff", padding: 16,
    borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: "#2a2a3e",
  },
  sendButton: {
    backgroundColor: "#14F195", padding: 16, borderRadius: 12,
    alignItems: "center", marginTop: 8,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: "#0a0a1a", fontSize: 18, fontWeight: "bold" },
  feeText: { color: "#555", fontSize: 12, textAlign: "center", marginTop: 12 },
  backButton: {
    backgroundColor: "#9945FF", paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 10, marginTop: 16,
  },
  backButtonText: { color: "#fff", fontWeight: "bold" },
});
