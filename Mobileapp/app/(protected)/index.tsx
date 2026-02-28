import { View, Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/hooks/useAuth';
import { ConnectButton } from '@/components/ConnectButton';
import {useAnotherWallet} from "@/hooks/useAnotherWallet"

export default function HomeScreen() {
  const { user } = useAuth();
  const wallet = useAnotherWallet()

  return (
    <Screen className="px-6 pt-8">
      <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Home
      </Text>
      <Text className="text-base text-gray-600 dark:text-gray-400 mb-8">
        Welcome back, {user?.email}
      </Text>

      <ConnectButton
        connected={wallet.connected}
        connecting={wallet.connecting}
        publicKey={wallet.publicKey?.toBase58() ?? null}
        onConnect={wallet.connect}
        onDisconnect={wallet.disconnect}
      />

      <View className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <Text className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          You're all set!
        </Text>
        <Text className="text-blue-700 dark:text-blue-300">
          This is your protected home screen. Start building your features here.
        </Text>

        {wallet.connected }
      </View>

      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Quick Start:
        </Text>
        <View className="gap-3">
          <BulletPoint text="Add your Firebase configuration in .env" />
          <BulletPoint text="Customize the color scheme in tailwind.config.js" />
          <BulletPoint text="Build your features using the UI primitives" />
          <BulletPoint text="Use TanStack Query for data fetching" />
        </View>
      </View>
    </Screen>
  )
}

function BulletPoint({ text }: { text: string }) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-blue-600 dark:text-blue-400">•</Text>
      <Text className="text-gray-700 dark:text-gray-300 flex-1">{text}</Text>
    </View>
  );
}
