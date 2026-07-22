const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support .mjs and .cjs extensions for modern packages
config.resolver.sourceExts.push('mjs', 'cjs');

// Inject global polyfills (DOMException, etc.) at the very top of the Metro JS bundle
const originalGetPolyfills = config.serializer ? config.serializer.getPolyfills : null;
config.serializer = {
  ...config.serializer,
  getPolyfills: (ctx) => [
    ...(originalGetPolyfills ? originalGetPolyfills(ctx) : []),
    path.resolve(__dirname, 'utils/polyfills.js'),
  ],
};

module.exports = withNativeWind(config, { input: './global.css' });
