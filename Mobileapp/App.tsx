import { NavigationContainer } from "@react-navigation/native";
import { QueryProvider } from "./src/providers/QueryProvider";
import { AuthProvider } from "./src/providers/AuthProvider";
import { ThemeProvider } from "./src/providers/ThemeProvider";
import { TabNavigator } from "./src/navigation/TabNavigator";
import { AuthNavigator } from "./src/navigation/AuthNavigator";
import { useAuth } from "./src/hooks/useAuth";
import { View, ActivityIndicator } from "react-native";
import "./global.css";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <TabNavigator key={user.uid} /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
