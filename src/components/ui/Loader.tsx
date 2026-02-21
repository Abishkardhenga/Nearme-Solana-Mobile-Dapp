import { ActivityIndicator, View } from 'react-native';

interface LoaderProps {
  size?: 'small' | 'large';
}

export function Loader({ size = 'large' }: LoaderProps) {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size={size} color="#2563eb" />
    </View>
  );
}
