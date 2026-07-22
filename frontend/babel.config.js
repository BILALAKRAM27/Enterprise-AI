module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // @babel/plugin-transform-runtime is already included by babel-preset-expo,
      // no need to specify it manually.
      // @babel/plugin-proposal-class-properties is deprecated in Babel 7.x+
      // and integrated into babel-preset-expo. Explicitly specifying it with
      // { loose: true } conflicts with Hermes's non-writable Event constants like
      // Event.NONE and causes "Cannot assign to read-only property 'NONE'" crashes.
      //
      // @babel/plugin-transform-private-methods and
      // @babel/plugin-transform-private-property-in-object are also handled by
      // babel-preset-expo. Using { loose: true } causes Babel to emit simple
      // assignments instead of Object.defineProperty, which Hermes rejects.
      //
      // Reanimated must remain last.
      'react-native-reanimated/plugin',
    ],
  };
};
