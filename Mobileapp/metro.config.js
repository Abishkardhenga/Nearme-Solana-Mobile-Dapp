const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Configure resolver for better node module compatibility (needed for Solana)
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
    crypto: require.resolve('expo-crypto'),
    buffer: require.resolve('buffer'),
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
