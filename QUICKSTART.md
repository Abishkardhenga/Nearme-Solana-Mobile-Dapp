# Quick Start Guide

Get your app running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- iOS Simulator (Mac only) or Android Studio
- Firebase account

## Step 1: Install Dependencies (1 min)

```bash
npm install
```

## Step 2: Firebase Setup (2 min)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or use existing project
3. In Project Settings → General, scroll to "Your apps"
4. Click the web icon (</>) to add a web app
5. Copy the config values

## Step 3: Configure Environment (1 min)

```bash
cp .env.example .env
```

Edit `.env` and paste your Firebase config:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-app
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## Step 4: Enable Firebase Auth (1 min)

1. In Firebase Console, go to Authentication
2. Click "Get started"
3. Click "Email/Password"
4. Enable it and save

## Step 5: Run the App (30 seconds)

```bash
npm start
```

Then press:
- `i` for iOS
- `a` for Android
- `w` for web

## What You'll See

1. **Onboarding screens** (3 steps)
2. **Sign up screen** - Create an account
3. **Home screen** - Your app!

## Next Steps

### Customize Branding

Edit `tailwind.config.js`:

```js
colors: {
  primary: {
    600: '#your-brand-color',
  },
}
```

### Update App Name

Edit `app.json`:

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug"
  }
}
```

### Add Your First Feature

Create a new screen in `app/(protected)/`:

```typescript
// app/(protected)/my-feature.tsx
import { Screen } from '@/components/ui/Screen';
import { Text } from 'react-native';

export default function MyFeatureScreen() {
  return (
    <Screen className="p-6">
      <Text className="text-2xl font-bold">My Feature</Text>
    </Screen>
  );
}
```

### Fetch Data with TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';

export function useMyData() {
  return useQuery({
    queryKey: ['myData'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'items'));
      return snapshot.docs.map(doc => doc.data());
    },
  });
}
```

## Troubleshooting

### "Module not found" errors

```bash
npx expo start -c
```

### Firebase auth not working

1. Check `.env` file has correct values
2. Make sure Email/Password is enabled in Firebase Console
3. Restart the dev server

### TypeScript errors

```bash
npm run type-check
```

## You're Ready!

Your starter template is configured. Start building your SaaS app.

For more details, see [README.md](./README.md)
