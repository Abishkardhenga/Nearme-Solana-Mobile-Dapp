import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useWallet } from '@/hooks/useWallet';

export default function WalletConnectScreen() {
  const router = useRouter();
  const wallet = useWallet();

  const handleConnect = async () => {
    try {
      await wallet.connect();
      router.replace('/(protected)/map-home');
    } catch (error) {
      Alert.alert(
        'Connection Failed',
        error instanceof Error ? error.message : 'Failed to connect wallet'
      );
    }
  };

  return (
    <Screen className="px-6 justify-center">
      <View className="items-center mb-12">
        <Text className="text-4xl font-bold text-gray-900 dark:text-white mb-4 text-center">
          Connect Your Wallet
        </Text>
        <Text className="text-lg text-gray-600 dark:text-gray-400 text-center">
          Connect your Solana wallet to start using NearMe
        </Text>
      </View>

      <Button onPress={handleConnect} disabled={wallet.connecting}>
        {wallet.connecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    </Screen>
  );
}
