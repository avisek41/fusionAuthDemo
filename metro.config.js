const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // Fast Refresh is enabled by default in React Native
  // This ensures it remains enabled
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
