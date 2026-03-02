import { StyleSheet, Text, View, ActivityIndicator } from 'react-native'
import React from 'react'
import MapView from "react-native-maps"
import { useState , useEffect} from 'react'
import * as Location from "expo-location"


const Map = () => {


    const [location, setLocation] = useState<Location.LocationObject | null>(
      null,
    )
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
      async function getCurrentLocation() {
        let { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied")
          return
        }

          let location = await Location.getCurrentPositionAsync({})
          console.log("location",location)
        setLocation(location)
      }

      getCurrentLocation()
    }, [])

    // Show loading while getting location
    if (!location && !errorMsg) {
      return (
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.text}>Getting your location...</Text>
        </View>
      )
    }

    // Show error if permission denied
    if (errorMsg) {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>{errorMsg}</Text>
        </View>
      )
    }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location!.coords.latitude,
          longitude: location!.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton
      />
    </View>
  )
}

export default Map

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: "100%",
    height: "100%",
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
})