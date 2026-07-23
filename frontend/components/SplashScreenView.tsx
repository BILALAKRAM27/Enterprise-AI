/**
 * SplashScreenView.tsx
 *
 * Custom JS-layer splash shown while fonts are loading and the JWT bootstrap
 * runs. Fades the logo in with a subtle scale spring, then fades the whole
 * screen out via the `onReady` callback from the parent.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

interface SplashScreenViewProps {
  /** Called when the fade-out animation has fully completed. */
  onAnimationComplete?: () => void;
  /** Trigger the fade-out exit animation (set true when auth check is done). */
  ready?: boolean;
}

export function SplashScreenView({
  onAnimationComplete,
  ready = false,
}: SplashScreenViewProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // --- entry animations ---
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const dotOpacity = useRef(new Animated.Value(0)).current;

  // --- exit animation ---
  const screenOpacity = useRef(new Animated.Value(1)).current;

  // Entry sequence
  useEffect(() => {
    Animated.sequence([
      // 1. Logo fades + scales in
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
      // 2. Subtle glow pulse behind logo
      Animated.timing(glowOpacity, {
        toValue: 0.35,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // 3. Dot row fades in
      Animated.timing(dotOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Exit sequence — triggered when `ready` flips true
  useEffect(() => {
    if (!ready) return;

    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 380,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      onAnimationComplete?.();
    });
  }, [ready]);

  const bg = isDark ? '#0A0F1E' : '#F8FAFF';
  const glowColor = isDark ? '#3652E3' : '#6E85FF';
  const dotColor = isDark ? '#3F4A6B' : '#C7D0F0';
  const activeDotColor = isDark ? '#6E85FF' : '#3652E3';

  return (
    <Animated.View style={[styles.container, { backgroundColor: bg, opacity: screenOpacity }]}>


      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Loading dots */}
      <Animated.View style={[styles.dots, { opacity: dotOpacity }]}>
        <LoadingDots dotColor={dotColor} activeDotColor={activeDotColor} />
      </Animated.View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Animated loading dots
// ---------------------------------------------------------------------------
function LoadingDots({
  dotColor,
  activeDotColor,
}: {
  dotColor: string;
  activeDotColor: string;
}) {
  const dot0 = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.delay(760 - delay),
        ])
      );

    const a0 = animate(dot0, 0);
    const a1 = animate(dot1, 200);
    const a2 = animate(dot2, 400);
    a0.start(); a1.start(); a2.start();
    return () => { a0.stop(); a1.stop(); a2.stop(); };
  }, []);

  const dotStyle = (dot: Animated.Value) => ({
    backgroundColor: dot.interpolate({
      inputRange: [0, 1],
      outputRange: [dotColor, activeDotColor],
    }),
    transform: [{
      scale: dot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }),
    }],
  });

  return (
    <View style={styles.dotRow}>
      <Animated.View style={[styles.dot, dotStyle(dot0)]} />
      <Animated.View style={[styles.dot, dotStyle(dot1)]} />
      <Animated.View style={[styles.dot, dotStyle(dot2)]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 56,
  },
  logo: {
    width: 360,
    height: 360,
  },
  dots: {
    position: 'absolute',
    bottom: 80,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
