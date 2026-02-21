import { useColorScheme as useNativeColorScheme } from 'react-native';
import { ColorScheme } from '@/types';

export function useColorScheme(): ColorScheme {
  const colorScheme = useNativeColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
}
