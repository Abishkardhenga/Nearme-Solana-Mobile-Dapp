import { View, ScrollView, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReactNode } from 'react';

interface ScreenProps extends ViewProps {
  children: ReactNode;
  scrollable?: boolean;
  className?: string;
}

export function Screen({ children, scrollable = false, className = '', ...props }: ScreenProps) {
  const baseStyles = 'flex-1 bg-white dark:bg-gray-900';

  const Container = scrollable ? ScrollView : View;

  return (
    <SafeAreaView className={baseStyles}>
      <Container
        className={`flex-1 ${className}`}
        {...props}
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}
