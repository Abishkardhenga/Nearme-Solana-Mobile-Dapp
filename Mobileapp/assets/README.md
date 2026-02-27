# Assets Directory

This directory should contain your app's image assets.

## Required Assets

### App Icon
- **icon.png** - 1024x1024px
  - Used for iOS and Android app icon
  - Should have a transparent background or solid color

### Adaptive Icon (Android)
- **adaptive-icon.png** - 1024x1024px
  - Android adaptive icon foreground
  - Center safe area: 512x512px
  - Outer area may be masked

### Splash Screen
- **splash.png** - 1284x2778px (iPhone 12/13 Pro Max size)
  - Shown while app is loading
  - Should match your brand
  - Use a simple logo or brand name

### Favicon (Web)
- **favicon.png** - 48x48px
  - Used for web version

## Generating Assets

### Option 1: Use Expo's Asset Generator
```bash
npx expo-optimize
```

### Option 2: Manual Creation
Create each asset at the required dimensions and place in this directory.

### Option 3: Use Figma/Canva
Design your icons and export at the required sizes.

## Temporary Placeholders

For development, Expo will use default placeholders if these assets are missing.

Replace them before publishing to production.

## Design Tips

- Keep icons simple and recognizable at small sizes
- Use your brand colors
- Test on both light and dark backgrounds
- Ensure text is readable on splash screen
- Follow platform guidelines:
  - [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
  - [Material Design Guidelines](https://material.io/design)
