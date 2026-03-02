import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../../app/(public)/login';
import RegisterScreen from '../../app/(public)/register';
import SignupScreen from '../../app/(public)/signup';
import SignupMerchantScreen from '../../app/(public)/signup-merchant';
import OnboardingScreen from '../../app/(public)/onboarding';

const Stack = createNativeStackNavigator();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="SignupMerchant" component={SignupMerchantScreen} />
    </Stack.Navigator>
  );
}
