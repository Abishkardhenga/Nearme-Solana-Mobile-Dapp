import { View, Text, Pressable } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();

  return (
    <Screen scrollable className="px-6 pt-8">
      <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Settings
      </Text>

      <View className="gap-4">
        <SettingSection title="Appearance">
          <SettingItem
            label="Theme"
            value={colorScheme === 'dark' ? 'Dark' : 'Light'}
            description="Automatically matches your system preference"
          />
        </SettingSection>

        <SettingSection title="About">
          <SettingItem
            label="Version"
            value="1.0.0"
            description="Nearme Template"
          />
        </SettingSection>

        <View className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mt-4">
          <Text className="text-sm text-blue-900 dark:text-blue-100">
            This is a production-ready starter template. Customize these settings to match your app's needs.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
        {title}
      </Text>
      <View className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {children}
      </View>
    </View>
  );
}

function SettingItem({
  label,
  value,
  description,
  onPress,
}: {
  label: string;
  value: string;
  description?: string;
  onPress?: () => void;
}) {
  const Component = onPress ? Pressable : View;

  return (
    <Component onPress={onPress} className="p-4">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-base font-medium text-gray-900 dark:text-white">
          {label}
        </Text>
        <Text className="text-base text-gray-600 dark:text-gray-400">
          {value}
        </Text>
      </View>
      {description && (
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {description}
        </Text>
      )}
    </Component>
  );
}
