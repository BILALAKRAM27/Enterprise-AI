// index.js
// Absolute top-level entry point for Expo / React Native bundle.
// Imports polyfills FIRST before expo-router entry executes, guaranteeing
// DOMException is available on globalThis during module bundle evaluation.

import './utils/polyfills';
import 'expo-router/entry';
