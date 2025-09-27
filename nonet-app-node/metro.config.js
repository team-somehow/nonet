const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add crypto polyfills for React Native
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: 'crypto-js',
};

// Fix @noble/hashes module resolution for ethers
config.resolver.unstable_enablePackageExports = false;

// Additional resolver configuration for crypto libraries
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
