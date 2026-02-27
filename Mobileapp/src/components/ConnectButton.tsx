import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from "react-native";

interface Props {
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function ConnectButton({
  connected, connecting, publicKey, onConnect, onDisconnect,
}: Props) {
  if (connecting) {
    return (
      <View style={[styles.button, styles.connecting]}>
        <ActivityIndicator size="small" color="#fff" />
        <Text style={styles.buttonText}>Connecting...</Text>
      </View>
    );
  }

  if (connected && publicKey) {
    return (
      <TouchableOpacity style={[styles.button, styles.connected]} onPress={onDisconnect}>
        <Text style={styles.connectedText}>
          {publicKey.slice(0, 4)}...{publicKey.slice(-4)}
        </Text>
        <Text style={styles.disconnectText}>✕</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.button, styles.disconnected]} onPress={onConnect}>
      <Text style={styles.buttonText}>Connect Wallet</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  disconnected: {
    backgroundColor: "#9945FF",
  },
  connected: {
    backgroundColor: "#14F19520",
    borderWidth: 1,
    borderColor: "#14F195",
  },
  connecting: {
    backgroundColor: "#333",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  connectedText: {
    color: "#14F195",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  disconnectText: {
    color: "#888",
    fontSize: 14,
  },
});
