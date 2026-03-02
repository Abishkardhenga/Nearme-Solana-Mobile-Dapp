import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useMerchantStatus } from '../hooks/useMerchantStatus';
import { ActivityIndicator, View } from 'react-native';


// Import screens
import {
  MapHomeScreen,
  MerchantDetailScreen,
  ScanQRScreen,
  PaymentSuccessScreen,
  ProfileScreen,
  SavedRestaurantsScreen,
  TransactionHistoryScreen,
  SettingsScreen,
  MyPlaceScreen,
  RegisterMerchantScreen,
  MerchantDashboardScreen,
  RequestPaymentScreen,

} from '../screens';
import Map from 'app/(protected)/map';
import BusinessDetailsScreen from 'app/(protected)/business-details';


const Tab = createBottomTabNavigator();
const DiscoverStack = createNativeStackNavigator();
const PayStack = createNativeStackNavigator();
const MyPlaceStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const DashboardStack = createNativeStackNavigator();
const TransactionsStack = createNativeStackNavigator();

// Discover Tab Stack
function DiscoverNavigator() {
  return (
    <DiscoverStack.Navigator screenOptions={{ headerShown: false }}>
      <DiscoverStack.Screen name="MapHome" component={MapHomeScreen} />
      <DiscoverStack.Screen name="MerchantDetail" component={MerchantDetailScreen} />
    </DiscoverStack.Navigator>
  );
}

// Pay Tab Stack
function PayNavigator() {
  return (
    <PayStack.Navigator screenOptions={{ headerShown: false }}>
      <PayStack.Screen name="ScanQR" component={ScanQRScreen} />
      <PayStack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
    </PayStack.Navigator>
  );
}

// My Place Tab Stack
function MyPlaceNavigator() {
  return (
    <MyPlaceStack.Navigator screenOptions={{ headerShown: false }}>
      <MyPlaceStack.Screen name="MyPlace" component={MyPlaceScreen} />
      <MyPlaceStack.Screen name="RegisterMerchant" component={RegisterMerchantScreen} />
      <MyPlaceStack.Screen name="MerchantDashboard" component={MerchantDashboardScreen} />
      <MyPlaceStack.Screen name="RequestPayment" component={RequestPaymentScreen} />
    </MyPlaceStack.Navigator>
  );
}

// Profile Tab Stack
function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="SavedRestaurants" component={SavedRestaurantsScreen} />
      <ProfileStack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    </ProfileStack.Navigator>
  );
}

// Dashboard Tab Stack (for Merchants)
function DashboardNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="MerchantDashboard" component={MerchantDashboardScreen} />
      <DashboardStack.Screen name="RequestPayment" component={RequestPaymentScreen} />
      <DashboardStack.Screen name="RegisterMerchant" component={RegisterMerchantScreen} />
      <DashboardStack.Screen name="BusinessDetails" component={BusinessDetailsScreen} />
    </DashboardStack.Navigator>
  );
}

// Transactions Tab Stack (for Merchants)
function TransactionsNavigator() {
  return (
    <TransactionsStack.Navigator screenOptions={{ headerShown: false }}>
      <TransactionsStack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
    </TransactionsStack.Navigator>
  );
}

export function TabNavigator() {
  const { isMerchant, loading } = useMerchantStatus();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }
  // Merchant Tabs
  if (isMerchant) {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap

            if (route.name === "Dashboard") {
              iconName = focused ? "stats-chart" : "stats-chart-outline"
            } else if (route.name === "Transactions") {
              iconName = focused ? "receipt" : "receipt-outline"
            } else if (route.name === "MyPlace") {
              iconName = focused ? "storefront" : "storefront-outline"
            } else {
              iconName = focused ? "person-circle" : "person-circle-outline"
            }

            return <Ionicons name={iconName} size={size} color={color} />
          },
          tabBarActiveTintColor: "#7C3AED",
          tabBarInactiveTintColor: "#6B7280",
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
        })}
      >
        <Tab.Screen
          name="Profile"
          component={ProfileNavigator}
          options={{ tabBarLabel: "Profile" }}
        />
        <Tab.Screen
          name="Dashboard"
          component={DashboardNavigator}
          options={{ tabBarLabel: "Dashboard" }}
        />
        <Tab.Screen
          name="Transactions"
          component={TransactionsNavigator}
          options={{ tabBarLabel: "Transactions" }}
        />
        <Tab.Screen
          name="MyPlace"
          component={MyPlaceNavigator}
          options={{ tabBarLabel: "My Place" }}
        />
      </Tab.Navigator>
    );
  }

  // Customer Tabs
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap

          if (route.name === "Discover") {
            iconName = focused ? "map" : "map-outline"
          } else if (route.name === "Pay") {
            iconName = focused ? "qr-code" : "qr-code-outline"
          } else if (route.name === "Saved") {
            iconName = focused ? "heart" : "heart-outline"
          } else {
            iconName = focused ? "person-circle" : "person-circle-outline"
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: "#7C3AED",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      })}
    >
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ tabBarLabel: "Profile" }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverNavigator}
        options={{ tabBarLabel: "Discover" }}
      />
      <Tab.Screen
        name="Pay"
        component={PayNavigator}
        options={{ tabBarLabel: "Pay" }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedRestaurantsScreen}
        options={{ tabBarLabel: "Saved" }}
      />
    </Tab.Navigator>
  )
}
