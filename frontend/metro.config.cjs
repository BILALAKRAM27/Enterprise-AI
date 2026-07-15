const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support .mjs and .cjs extensions for modern packages
config.resolver.sourceExts.push('mjs', 'cjs');

// Enable package exports to fix resolution for modern packages
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['react-native', 'require', 'import'];

module.exports = withNativeWind(config, { input: './global.css' });
