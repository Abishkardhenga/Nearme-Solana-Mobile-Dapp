import { Text, Pressable, ActivityIndicator } from 'react-native';
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  className = '',
}: ButtonProps) {
  const baseStyles = 'px-6 py-3 rounded-lg items-center justify-center';

  const variantStyles = {
    primary: 'bg-purple-600 active:bg-purple-700',
    secondary: 'bg-gray-600 active:bg-gray-700',
    outline: 'border-2 border-purple-600 active:bg-purple-50 dark:active:bg-gray-800',
  };

  const textStyles = {
    primary: 'text-white font-semibold',
    secondary: 'text-white font-semibold',
    outline: 'text-purple-600 dark:text-purple-400 font-semibold',
  };

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${baseStyles} ${variantStyles[variant]} ${
        isDisabled ? 'opacity-50' : ''
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#7C3AED' : '#ffffff'} />
      ) : (
        <Text className={textStyles[variant]}>{children}</Text>
      )}
    </Pressable>
  );
}
