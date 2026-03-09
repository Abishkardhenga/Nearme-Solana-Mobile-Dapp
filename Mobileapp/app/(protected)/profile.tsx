import { View, Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { useAnotherWallet } from '@/hooks/useAnotherWallet';
import { ConnectButton } from '@/components/ConnectButton';


export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);



  

  const wallet = useAnotherWallet()


  const handleSignOut = async () => {
    setLoading(true);
    try {
      // Disconnect wallet first
      if (wallet.connected) {
        await wallet.disconnect();
      }
      // Then sign out from Firebase
      await signOut();
      // NavigationGuard will handle redirect
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable className="bg-gray-50 dark:bg-gray-900">
      <View className="px-6 pt-8 pb-24 gap-5">
        {/* Header */}
        <View className="bg-purple-600 rounded-2xl p-6">
          <Text className="text-purple-100 text-sm font-medium mb-1">Your Account</Text>
          <Text className="text-white text-3xl font-bold">Profile</Text>
        </View>

        {/* Wallet Connection */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Wallet Connection
          </Text>
          <ConnectButton
            connected={wallet.connected}
            connecting={wallet.connecting}
            publicKey={wallet.publicKey?.toBase58() ?? null}
            onConnect={wallet.connect}
            onDisconnect={wallet.disconnect}
          />
        </View>

        {/* Account Information */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Account Information
          </Text>

          <View className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <Text className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Email Address
            </Text>
            <Text className="text-base text-gray-900 dark:text-white">
              {user?.email}
            </Text>
          </View>

          <View className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <Text className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">
              User ID
            </Text>
            <Text className="text-sm text-gray-900 dark:text-white font-mono break-all">
              {user?.uid}
            </Text>
          </View>

          <View>
            <Text className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Member Since
            </Text>
            <Text className="text-base text-gray-900 dark:text-white">
              {user?.metadata.creationTime
                ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <Button
          onPress={handleSignOut}
          loading={loading}
          variant="outline"
          className="rounded-xl border-2 border-red-200 dark:border-red-800"
        >
          <Text className="text-red-600 dark:text-red-400 font-semibold">Sign Out</Text>
        </Button>
      </View>
    </Screen>
  );
}
