# Project Structure

Complete file structure of the Nearme template.

```
expo-saas-starter/
│
├── app/                                 # Expo Router app directory
│   ├── (public)/                        # Public routes (not authenticated)
│   │   ├── _layout.tsx                  # Public layout
│   │   ├── onboarding.tsx               # Onboarding flow
│   │   ├── login.tsx                    # Login screen
│   │   └── signup.tsx                   # Signup screen
│   │
│   ├── (protected)/                     # Protected routes (authenticated)
│   │   ├── _layout.tsx                  # Protected layout (tabs)
│   │   ├── index.tsx                    # Home screen
│   │   ├── profile.tsx                  # Profile screen
│   │   └── settings.tsx                 # Settings screen
│   │
│   ├── _layout.tsx                      # Root layout (providers)
│   └── +not-found.tsx                   # 404 screen
│
├── src/
│   ├── components/
│   │   └── ui/                          # Reusable UI primitives
│   │       ├── Button.tsx               # Button component
│   │       ├── Input.tsx                # Input component
│   │       ├── Screen.tsx               # Screen wrapper
│   │       └── Loader.tsx               # Loading indicator
│   │
│   ├── providers/                       # Context providers
│   │   ├── AuthProvider.tsx             # Firebase auth provider
│   │   ├── QueryProvider.tsx            # TanStack Query provider
│   │   ├── ThemeProvider.tsx            # Theme/dark mode provider
│   │   └── NavigationGuard.tsx          # Navigation/routing logic
│   │
│   ├── hooks/                           # Custom React hooks
│   │   ├── useAuth.tsx                  # Auth hook (signIn, signUp, etc.)
│   │   ├── useOnboarding.tsx            # Onboarding state hook
│   │   └── useColorScheme.tsx           # Theme hook
│   │
│   ├── services/                        # External services
│   │   ├── firebase.ts                  # Firebase configuration
│   │   └── storage.ts                   # AsyncStorage helpers
│   │
│   ├── lib/                             # Library configurations
│   │   └── queryClient.ts               # TanStack Query config
│   │
│   └── types/                           # TypeScript type definitions
│       └── index.ts                     # Shared types
│
├── assets/                              # App assets (icons, splash)
│   └── README.md                        # Asset requirements guide
│
├── Configuration Files
├── .env.example                         # Environment variables template
├── .eslintrc.js                         # ESLint configuration
├── .gitignore                           # Git ignore rules
├── app.json                             # Expo configuration
├── babel.config.js                      # Babel configuration
├── expo-env.d.ts                        # Expo types
├── global.css                           # Global Tailwind styles
├── metro.config.js                      # Metro bundler config
├── nativewind-env.d.ts                  # NativeWind types
├── package.json                         # Dependencies
├── tailwind.config.js                   # Tailwind/NativeWind config
├── tsconfig.json                        # TypeScript configuration
│
├── Documentation
├── README.md                            # Main documentation
├── QUICKSTART.md                        # Quick start guide
├── CONTRIBUTING.md                      # Contributing guide
├── PROJECT_STRUCTURE.md                 # This file
└── LICENSE                              # MIT License
```

## Key Files

### Core App Files

- **app/_layout.tsx** - Root layout that wraps the entire app with providers
- **app/(public)/** - All authentication and onboarding screens
- **app/(protected)/** - All authenticated app screens

### Providers (in load order)

1. **QueryProvider** - TanStack Query client
2. **AuthProvider** - Firebase authentication state
3. **ThemeProvider** - Dark mode handling
4. **NavigationGuard** - Routing logic based on auth/onboarding state

### Services

- **firebase.ts** - Firebase initialization and exports (auth, db)
- **storage.ts** - AsyncStorage helpers for local data

### UI Components

All UI components are in `src/components/ui/` and use NativeWind for styling.

### Hooks

Custom hooks in `src/hooks/` provide clean APIs for:
- Authentication (`useAuth`)
- Onboarding state (`useOnboarding`)
- Theme detection (`useColorScheme`)

## Data Flow

```
User Action
    ↓
Screen Component
    ↓
Custom Hook (useAuth, etc.)
    ↓
Service (firebase.ts, storage.ts)
    ↓
Firebase/Storage
```

## Navigation Flow

```
App Start
    ↓
NavigationGuard checks:
    ├─ Onboarding completed? No → (public)/onboarding
    ├─ User authenticated? No → (public)/login
    └─ Yes → (protected)/index
```

## Adding New Files

### New Screen
Add to: `app/(public)/` or `app/(protected)/`

### New Component
Add to: `src/components/ui/`

### New Hook
Add to: `src/hooks/`

### New Provider
Add to: `src/providers/` and update `app/_layout.tsx`

### New Service
Add to: `src/services/`

## File Naming Conventions

- **Components**: PascalCase (Button.tsx)
- **Hooks**: camelCase with 'use' prefix (useAuth.tsx)
- **Services**: camelCase (firebase.ts)
- **Screens**: kebab-case (onboarding.tsx)
- **Types**: PascalCase for interfaces/types
