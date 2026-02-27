import {useState, useEffect, useRef} from "react";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import {AppState, Platform} from "react-native";
import type {Merchant} from "@/types";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface UseLocationOptions {
  enableProximityAlerts?: boolean;
  savedMerchants?: Merchant[];
  proximityThreshold?: number; // In meters, default 50m
  checkInterval?: number; // In milliseconds, default 30 seconds
}

interface UseLocationReturn {
  location: Location.LocationObject | null;
  error: string | null;
  loading: boolean;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

/**
 * Custom hook for location tracking with proximity alerts
 *
 * Features:
 * - Continuous GPS tracking with configurable intervals
 * - Proximity detection for saved merchants
 * - Push notifications when within threshold distance
 * - Automatic pause/resume on app state changes
 * - One notification per merchant per session
 */
export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const {
    enableProximityAlerts = false,
    savedMerchants = [],
    proximityThreshold = 50, // 50 meters
    checkInterval = 30000, // 30 seconds
  } = options;

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const appState = useRef(AppState.currentState);
  const notifiedMerchants = useRef<Set<string>>(new Set());

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Request notification permissions
  const requestNotificationPermission = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("proximity", {
        name: "Proximity Alerts",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0D9488",
      });
    }

    const {status: existingStatus} = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const {status} = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  };

  // Send proximity notification
  const sendProximityNotification = async (merchant: Merchant, distance: number) => {
    const hasNotificationPermission = await requestNotificationPermission();
    if (!hasNotificationPermission) {
      console.log("Notification permission not granted");
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${merchant.name} is nearby!`,
        body: `You're only ${Math.round(distance)}m away. ${
          merchant.acceptsSol && merchant.acceptsUsdc
            ? "Accepts SOL & USDC"
            : merchant.acceptsSol
            ? "Accepts SOL"
            : "Accepts USDC"
        }`,
        data: {merchantId: merchant.id},
        sound: true,
      },
      trigger: null, // Show immediately
    });
  };

  // Check proximity to saved merchants
  const checkProximity = (currentLocation: Location.LocationObject) => {
    if (!enableProximityAlerts || savedMerchants.length === 0) {
      return;
    }

    for (const merchant of savedMerchants) {
      // Skip if already notified in this session
      if (notifiedMerchants.current.has(merchant.id)) {
        continue;
      }

      const distance = calculateDistance(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        merchant.lat,
        merchant.lng
      );

      if (distance <= proximityThreshold) {
        console.log(`Proximity alert: ${merchant.name} is ${Math.round(distance)}m away`);
        sendProximityNotification(merchant, distance);
        notifiedMerchants.current.add(merchant.id);
      }
    }
  };

  // Request location permission
  const requestPermission = async (): Promise<boolean> => {
    try {
      const {status} = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setHasPermission(granted);
      return granted;
    } catch (err) {
      console.error("Failed to request location permission:", err);
      setError("Failed to request location permission");
      return false;
    }
  };

  // Start watching location
  const startWatchingLocation = async () => {
    try {
      const {status} = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const granted = await requestPermission();
        if (!granted) {
          setError("Location permission not granted");
          setLoading(false);
          return;
        }
      }

      setHasPermission(true);

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(initialLocation);
      checkProximity(initialLocation);
      setLoading(false);

      // Start watching location with configured interval
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: checkInterval,
          distanceInterval: 10, // Update every 10 meters
        },
        (newLocation) => {
          setLocation(newLocation);
          checkProximity(newLocation);
        }
      );
    } catch (err: any) {
      console.error("Failed to start watching location:", err);
      setError(err.message || "Failed to get location");
      setLoading(false);
    }
  };

  // Stop watching location
  const stopWatchingLocation = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        // App came to foreground - restart location watching
        console.log("App came to foreground, restarting location tracking");
        startWatchingLocation();
      } else if (appState.current === "active" && nextAppState.match(/inactive|background/)) {
        // App went to background - stop location watching to save battery
        console.log("App went to background, stopping location tracking");
        stopWatchingLocation();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Start location tracking on mount
  useEffect(() => {
    startWatchingLocation();

    return () => {
      stopWatchingLocation();
    };
  }, []);

  // Clear notified merchants when saved merchants list changes
  useEffect(() => {
    notifiedMerchants.current.clear();
  }, [savedMerchants.map((m) => m.id).join(",")]);

  return {
    location,
    error,
    loading,
    hasPermission,
    requestPermission,
  };
}
