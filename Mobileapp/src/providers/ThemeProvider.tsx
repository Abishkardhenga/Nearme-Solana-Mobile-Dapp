import { ReactNode, useEffect } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const colorScheme = useNativeColorScheme();

  useEffect(() => {
    // Set the system UI style based on color scheme
    SystemUI.setBackgroundColorAsync(
      colorScheme === 'dark' ? '#111827' : '#ffffff'
    );
  }, [colorScheme]);

  return <>{children}</>;
}
