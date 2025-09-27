const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add crypto polyfills for React Native
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: 'crypto-js',
};

module.exports = config;
