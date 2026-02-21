# Nearme Template

A production-ready React Native + Expo starter template for building SaaS applications. Clone, configure, and ship.

## Features

- **Expo Router** - File-based routing with route groups
- **Firebase Auth** - Email/password authentication
- **NativeWind** - Tailwind CSS for React Native
- **TanStack Query** - Data fetching and caching
- **TypeScript** - Full type safety
- **Dark Mode** - Automatic system preference support
- **Onboarding** - Multi-step onboarding flow
- **Navigation Guard** - Centralized routing logic
- **UI Primitives** - Reusable components (Button, Input, Screen, Loader)

## Tech Stack

- React Native (Expo)
- Expo Router (file-based routing)
- Firebase (Auth + Firestore)
- NativeWind (Tailwind-style styling)
- TanStack Query (data fetching & caching)
- TypeScript (strict mode)

## Project Structure

```
├── app/
│   ├── _layout.tsx              # Root layout with providers
│   ├── +not-found.tsx           # 404 screen
│   ├── (public)/                # Public routes
│   │   ├── onboarding.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   └── (protected)/             # Protected routes
│       ├── index.tsx            # Home
│       ├── profile.tsx
│       └── settings.tsx
│
├── src/
│   ├── components/ui/           # UI primitives
│   ├── providers/               # Context providers
│   ├── hooks/                   # Custom hooks
│   ├── services/                # Firebase, storage
│   ├── lib/                     # Query client config
│   └── types/                   # TypeScript types
│
├── tailwind.config.js           # Design tokens
└── app.json                     # Expo configuration
```

## Getting Started

### 1. Clone the Template

```bash
git clone <your-repo-url>
cd expo-saas-starter
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Firebase

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Email/Password authentication in Firebase Console
3. Create a Firestore database
4. Copy your Firebase config

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your Firebase credentials:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. Update App Configuration

Edit `app.json`:

- Change `name` to your app name
- Change `slug` to your app slug
- Update `bundleIdentifier` (iOS) and `package` (Android)
- Update `scheme` for deep linking

### 6. Start Development

```bash
npm start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web

## App Flow

### First Launch Flow

1. **Splash Screen** - Shows while checking auth state
2. **Onboarding** - Multi-step onboarding (if not completed)
3. **Auth Screens** - Login/Signup (if not authenticated)
4. **App Screens** - Protected home screen (if authenticated)

### Navigation Logic

The `NavigationGuard` component handles all routing logic:

- If onboarding NOT completed → show onboarding
- If onboarding completed but NOT logged in → show auth screens
- If logged in → show protected app screens

This logic is centralized in `src/providers/NavigationGuard.tsx`.

## Customization Guide

### 1. Branding & Colors

Edit `tailwind.config.js` to update your color scheme:

```js
colors: {
  primary: {
    // Your brand colors
  },
}
```

### 2. Onboarding Content

Edit `app/(public)/onboarding.tsx` to customize onboarding steps.

### 3. Navigation Tabs

Edit `app/(protected)/_layout.tsx` to add/remove tabs.

### 4. UI Components

All UI primitives are in `src/components/ui/`:
- `Button.tsx` - Primary, secondary, outline variants
- `Input.tsx` - Text input with label and error states
- `Screen.tsx` - Safe area wrapper with scroll support
- `Loader.tsx` - Loading indicator

### 5. Add Icons

Install an icon library:

```bash
npx expo install @expo/vector-icons
```

Update the TabIcon component in `app/(protected)/_layout.tsx`.

## Data Fetching with TanStack Query

Example usage pattern:

```typescript
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'items'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    },
  });
}
```

## Firebase Security Rules

Don't forget to set up Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Building for Production

### iOS

1. Configure `app.json` with your bundle identifier
2. Run: `npx expo run:ios --configuration Release`

### Android

1. Configure `app.json` with your package name
2. Run: `npx expo run:android --variant release`

### Using EAS Build

```bash
npm install -g eas-cli
eas login
eas build --platform all
```

## Scripts

- `npm start` - Start Expo dev server
- `npm run ios` - Start iOS simulator
- `npm run android` - Start Android emulator
- `npm run web` - Start web development
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Architecture Decisions

### Why Route Groups?

Route groups `(public)` and `(protected)` allow for:
- Different layouts for auth vs app screens
- Clean URL structure
- Easy navigation guard implementation

### Why Firebase?

- Zero backend setup
- Built-in auth
- Real-time database
- Easy scaling

### Why NativeWind?

- Familiar Tailwind syntax
- No StyleSheet boilerplate
- Easy dark mode support
- Consistent spacing/colors

### Why TanStack Query?

- Automatic caching
- Background refetching
- Optimistic updates
- Less boilerplate than Redux

## Common Tasks

### Reset Onboarding

```typescript
import { clearOnboardingStatus } from '@/services/storage';
await clearOnboardingStatus();
```

### Add a New Screen

1. Create file in `app/(protected)/` or `app/(public)/`
2. Use the `Screen` component as wrapper
3. Add to navigation if needed

### Change Auth Provider

Edit `src/services/firebase.ts` and `src/hooks/useAuth.tsx` to add:
- Google Sign-In
- Apple Sign-In
- Phone Auth
- etc.

## Troubleshooting

### Metro bundler issues

```bash
npx expo start -c
```

### TypeScript errors

```bash
npm run type-check
```

### Clear all caches

```bash
rm -rf node_modules .expo
npm install
```

## Production Checklist

- [ ] Update Firebase config with production credentials
- [ ] Set up Firestore security rules
- [ ] Update app.json with correct bundle IDs
- [ ] Add app icons and splash screen
- [ ] Test on both iOS and Android
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure analytics
- [ ] Test offline behavior
- [ ] Review and optimize bundle size

## License

MIT

## Support

For issues and questions, please open a GitHub issue.

---

Built with speed and scalability in mind. Clone, configure, ship.
