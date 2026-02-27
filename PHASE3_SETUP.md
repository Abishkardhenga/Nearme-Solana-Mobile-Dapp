# Phase 3 Setup & Testing Guide

## Overview
Phase 3 implements the Map & Discovery features - allowing tourists to find nearby crypto-accepting merchants on a map, view details, save favorites, and get directions.

---

## What Was Built

### ✅ Cloud Functions
1. **`getNearbyMerchants`** - GeoFirestore radius query
   - Uses `geofire-common` for efficient spatial queries
   - Filters by distance, payment methods, and category
   - Returns merchants within 5km radius (configurable)

### ✅ Mobile App Screens
1. **MapHomeScreen** - Interactive map with colored pins
2. **MerchantDetailScreen** - Full merchant details with save/directions
3. **SavedRestaurantsScreen** - List of saved merchants with real-time distances

### ✅ Custom Hooks
1. **`useLocation`** - GPS tracking with proximity alerts
   - Continuous location monitoring
   - Proximity detection for saved merchants
   - Push notifications when within 50m

### ✅ Features Implemented
- Colored map pins (purple=SOL, green=USDC, teal=both)
- Real-time search and filtering
- Save/unsave merchants to Firebase
- Get directions via native maps
- Proximity notifications
- Real-time distance calculations

---

## Prerequisites

Before starting Phase 3, ensure Phase 2 is complete:
- ✅ Cloud Functions deployed
- ✅ Firebase project configured
- ✅ Mobile app setup with location permissions
- ✅ At least one merchant registered (for testing)

---

## Step 1: Deploy New Cloud Function

1. **Update Cloud Functions**
   ```bash
   cd functions
   npm install
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   firebase deploy --only functions:getNearbyMerchants
   ```

3. **Verify Deployment**
   ```bash
   firebase functions:log
   ```

---

## Step 2: Configure Google Maps API (Required)

### For Android

1. **Get API Key from Google Cloud Console**
   - Go to https://console.cloud.google.com
   - Create a project or select existing
   - Enable "Maps SDK for Android"
   - Create API key (restrict to Android apps)

2. **Add to app.json**
   ```json
   {
     "expo": {
       "android": {
         "config": {
           "googleMaps": {
             "apiKey": "YOUR_ANDROID_MAPS_API_KEY"
           }
         }
       }
     }
   }
   ```

### For iOS

1. **Enable "Maps SDK for iOS" in Google Cloud Console**
2. **Create iOS API Key**
3. **Add to app.json**
   ```json
   {
     "expo": {
       "ios": {
         "config": {
           "googleMapsApiKey": "YOUR_IOS_MAPS_API_KEY"
         }
       }
     }
   }
   ```

---

## Step 3: Install Dependencies

```bash
cd Mobileapp
npm install
```

All dependencies should already be installed from Phase 2:
- `expo-location`
- `react-native-maps`
- `expo-notifications`
- `@react-native-firebase/firestore`

---

## Step 4: Configure Firestore Security Rules

Update your Firestore rules to allow users to save merchants:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Anyone can read active merchants
    match /merchants/{merchantId} {
      allow read: if resource.data.isActive == true;
      allow write: if false; // Only Cloud Functions can write
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

---

## Step 5: Testing the Complete Flow

### Test Setup

**You'll need:**
- Physical device (GPS won't work properly in simulator)
- At least 1-2 registered merchants in Firestore
- Location services enabled
- Internet connection

### Test Case 1: Map Home Screen

1. **Launch App & Navigate to Map**
   ```
   Open app → Sign in → Navigate to Map Home
   ```

2. **Verify Location Permission**
   - App should request location permission
   - Grant "While Using the App" permission

3. **Check Map Loads**
   - Map should center on your current location
   - Blue dot should appear (your location)

4. **Verify Merchants Load**
   - Colored pins should appear for nearby merchants
   - Purple pin = SOL only
   - Green pin = USDC only
   - Teal pin = Both SOL & USDC

5. **Test Search**
   - Tap search bar at top
   - Type merchant name
   - Pins should filter in real-time

6. **Test Filters**
   - Tap filter FAB (⚙️ button)
   - Toggle "SOL Only"
   - Apply filters
   - Map should reload with filtered results

### Test Case 2: Merchant Detail

1. **Tap a Pin on Map**
   - Should navigate to Merchant Detail screen

2. **Verify Details Display**
   - Photo (or placeholder)
   - Name and category
   - Rating (stars)
   - Distance badge
   - Payment method badges (SOL/USDC)
   - Description
   - Opening hours
   - Transaction stats
   - Truncated wallet address

3. **Test Save Button**
   - Tap "🤍 Save Restaurant"
   - Should show success alert
   - Button should change to "❤️ Saved"

4. **Test Directions**
   - Tap "🗺️ Get Directions"
   - Should open native maps app
   - Should show route to merchant

### Test Case 3: Saved Restaurants

1. **Navigate to Saved Restaurants**
   - Tap ❤️ FAB on Map Home
   - Or navigate from menu

2. **Verify List**
   - Should show saved merchants
   - Each item shows: photo, name, category, distance, payment methods
   - Distance should update in real-time as you move

3. **Test Navigate Button**
   - Tap "🗺️ Navigate" on any merchant
   - Should open maps with directions

4. **Test Pull to Refresh**
   - Pull down to refresh list
   - Distances should recalculate

5. **Test Empty State**
   - Unsave all merchants
   - Should show empty state with "Explore Map" button

### Test Case 4: Proximity Notifications

1. **Save a Merchant**
   - Find a merchant on map
   - Tap to view details
   - Save it

2. **Enable Notifications**
   - App will request notification permission
   - Grant permission

3. **Walk Toward Merchant**
   - Use saved merchant that's 100-200m away
   - Walk toward it
   - When you get within 50m, should receive push notification:
     ```
     "Joe's Coffee is nearby!"
     "You're only 42m away. Accepts SOL & USDC"
     ```

4. **Verify One Notification Per Session**
   - Should only receive one notification per merchant
   - Until you restart the app

---

## Expected Behavior

### Map Home Screen

```
┌─────────────────────────────┐
│  [Search merchants...    X] │
│                          ⚙️  │  ← Filter FAB
│                          🔄  │  ← Refresh FAB
│                             │
│        📍 (your location)   │
│                             │
│    🟣 (SOL merchant)        │
│                             │
│        🟢 (USDC merchant)   │
│                             │
│    🩵 (Both)                │
│                          ❤️  │  ← Saved FAB
│ [12 merchants nearby]       │
└─────────────────────────────┘
```

### Merchant Detail Screen

```
┌─────────────────────────────┐
│  [Large Photo]              │
│                             │
│  Joe's Coffee Shop          │
│  Cafe                       │
│                             │
│  ★★★★★ 4.8 (24 reviews)    │  [0.8 km]
│                             │
│  [🟣 Accepts SOL]  [🟢 Accepts USDC]
│                             │
│  About                      │
│  Best coffee in town...     │
│                             │
│  Hours                      │
│  Mon-Fri 7:00 AM - 6:00 PM  │
│                             │
│  Transaction Stats          │
│  45        2.5 SOL  $150    │
│  Payments  SOL Vol  USDC Vol│
│                             │
│  Merchant Wallet            │
│  AbC1...xYz9                │
│                             │
│  [❤️ Save Restaurant]       │
│  [🗺️ Get Directions]        │
└─────────────────────────────┘
```

### Saved Restaurants Screen

```
┌─────────────────────────────┐
│  Saved Restaurants          │
│  3 restaurants saved        │
│                             │
│  ┌─────────────────────────┐│
│  │[📷] Joe's Coffee        ││
│  │     Cafe          0.8km ││
│  │     [SOL] [USDC]        ││
│  │     [🗺️ Navigate]        ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │[📷] Pizza Palace        ││
│  │     Restaurant    1.2km ││
│  │     [SOL]               ││
│  │     [🗺️ Navigate]        ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │[📷] The Bakery          ││
│  │     Cafe          2.1km ││
│  │     [USDC]              ││
│  │     [🗺️ Navigate]        ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

---

## Troubleshooting

### Maps Not Loading

**Problem**: Map shows blank white screen

**Solutions**:
1. Check Google Maps API key is correct in `app.json`
2. Ensure Maps SDK is enabled in Google Cloud Console
3. Check API key restrictions (should allow your app bundle ID)
4. Rebuild app: `npx expo run:android` or `npx expo run:ios`

### No Merchants Showing

**Problem**: Map loads but no pins appear

**Solutions**:
1. Check you have merchants in Firestore with `isActive: true`
2. Check merchants have valid `geoHash` field
3. Verify Cloud Function deployed: `firebase functions:log`
4. Check you're within 5km of registered merchants
5. Try increasing radius in `loadNearbyMerchants()` temporarily

### Location Permission Denied

**Problem**: App says "Location Required"

**Solutions**:
1. Go to device Settings → App → Permissions → Location
2. Enable "While Using the App" or "Always"
3. On iOS, also enable "Precise Location"

### Proximity Notifications Not Working

**Problem**: No notification when approaching saved merchant

**Solutions**:
1. Ensure notification permission granted
2. Check merchant is actually saved (check Firestore)
3. Verify you're within 50m (use debug logs)
4. Check app is in foreground (background tracking not implemented)
5. Try restarting app (clears notification session cache)

### Saved Restaurants Not Persisting

**Problem**: Saved merchants disappear after restart

**Solutions**:
1. Check Firestore security rules allow user document writes
2. Verify user is authenticated
3. Check browser console/logs for Firebase errors
4. Ensure `users/{userId}` document has `savedMerchants` array

### Distance Calculations Wrong

**Problem**: Distances seem incorrect

**Solutions**:
1. Ensure GPS has good accuracy (< 50m)
2. Go outside for better GPS signal
3. Check merchant lat/lng in Firestore are correct
4. Verify Haversine formula in both Cloud Function and mobile app

---

## Performance Optimization

### GeoFirestore Query Performance

The `geohashQueryBounds` approach is efficient, but for large datasets:

1. **Create Firestore Index**
   ```
   Collection: merchants
   Fields: isActive (Ascending), geoHash (Ascending)
   ```

2. **Limit Results**
   Edit Cloud Function to add `.limit(50)`:
   ```typescript
   .orderBy("geoHash")
   .startAt(b[0])
   .endAt(b[1])
   .limit(50) // Add this
   .get()
   ```

3. **Cache Results**
   Consider caching merchant data for 5 minutes client-side

### Map Rendering Performance

For many pins (>100):

1. **Cluster Markers**
   - Use `react-native-maps-supercluster`
   - Groups nearby pins into clusters

2. **Virtualize Off-Screen Pins**
   - Only render pins in visible map region
   - Remove pins outside viewport

---

## Security Considerations

### ✅ Implemented Security

1. **Server-Side Filtering**: `isActive` check in Cloud Function
2. **User-Specific Data**: Saved merchants stored per user
3. **GPS Validation**: Accuracy checks in useLocation hook
4. **Firestore Rules**: Users can only write to their own documents

### ⚠️ Known Limitations

1. **No Rate Limiting**: getNearbyMerchants can be spammed
   - Add rate limiting in Cloud Function
   - Use Firebase App Check

2. **Wallet Address Exposure**: Truncated but still visible
   - This is by design (transparency)
   - Could make it optional per merchant

3. **No Abuse Prevention**: Users can save unlimited merchants
   - Consider adding limit (e.g., 50 saved merchants max)

---

## Data Flow

### Map Discovery Flow

```
User opens Map Home
↓
Request location permission
↓
Get current GPS position
↓
Call getNearbyMerchants(lat, lng, radiusKm=5)
↓
Cloud Function:
  1. Generate geohash bounds for 5km radius
  2. Query Firestore with bounds (parallel queries)
  3. Filter exact distance using Haversine
  4. Apply payment method filters
  5. Sort by distance
↓
Return merchants array
↓
Render colored pins on map
  - Purple: SOL only
  - Green: USDC only
  - Teal: Both
↓
User taps pin → Navigate to Merchant Detail
```

### Save Merchant Flow

```
User taps "Save Restaurant"
↓
Update Firestore:
  users/{userId}.savedMerchants += merchantId
↓
Show success alert
↓
Button changes to "❤️ Saved"
↓
Merchant appears in Saved Restaurants list
↓
useLocation hook monitors distance to saved merchants
↓
When distance < 50m → Send push notification
```

### Directions Flow

```
User taps "Get Directions"
↓
Build native maps URL:
  iOS: maps:37.7749,-122.4194?q=Joe's Coffee
  Android: geo:37.7749,-122.4194?q=Joe's Coffee
↓
Linking.openURL(url)
↓
Native maps app opens with route
```

---

## Next Steps

Phase 3 is complete! Here's what's next:

**Phase 4: Payments**
- SOL/USDC transfers
- QR code generation for merchants
- Transaction history
- Payment confirmation UI

**Phase 5: Reviews & Ratings**
- Rate merchants (1-5 stars)
- Leave written reviews
- Photo uploads with reviews
- Moderation system

---

## File Structure

```
functions/src/
├── getNearbyMerchants.ts      # GeoFirestore query function
└── index.ts                   # Export functions

Mobileapp/
├── app/(protected)/
│   ├── map-home.tsx          # Main map screen
│   ├── merchant-detail.tsx   # Merchant details
│   └── saved-restaurants.tsx # Saved merchants list
├── src/hooks/
│   └── useLocation.tsx       # GPS tracking + proximity
└── src/types/
    └── index.ts              # Merchant & filter types
```

---

## Testing Checklist

Before considering Phase 3 complete, verify:

- [ ] Map loads and shows current location
- [ ] Merchants appear as colored pins
- [ ] Pin colors match payment methods (purple/green/teal)
- [ ] Search filters pins by name
- [ ] Filter modal works (SOL/USDC/category)
- [ ] Tapping pin navigates to detail screen
- [ ] Detail screen shows all merchant info
- [ ] Save button adds merchant to Firebase
- [ ] Saved button state persists
- [ ] Get Directions opens native maps
- [ ] Saved Restaurants screen shows saved merchants
- [ ] Real-time distance updates work
- [ ] Navigate button opens maps
- [ ] Pull to refresh works
- [ ] Proximity notifications fire when < 50m
- [ ] Notifications only fire once per merchant per session

---

**Phase 3 Complete! 🎉**

You now have a fully functional map-based discovery system with:
- Real-time geospatial queries
- Color-coded merchant pins
- Advanced filtering
- Save favorites
- Proximity alerts
- Native directions integration

Ready for Phase 4: Payments! 💸
