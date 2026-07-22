// components.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useReducedMotion, useTokens } from '../hooks/hooks';
import { ribbonForScore } from '../components/tokens';

/** The one animation rule that never bends (DESIGN.md §1.7 / Non-Negotiable #6):
 *  only `signal` (teal, AI-related) elements loop continuously. This dot is
 *  used for "searching your documents…" / live/thinking indicators. */
export function PulseDot({ size = 7 }: { size?: number }) {
  const { tokens } = useTokens();
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.6, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.4, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tokens.signalDefault,
        opacity: reduced ? 1 : opacity,
        transform: reduced ? [] : [{ scale }],
      }}
    />
  );
}

/** Blinking text-cursor used at the end of the streaming query/answer text. */
export function BlinkCursor({ color }: { color?: string }) {
  const { tokens } = useTokens();
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced]);

  return (
    <Animated.View
      style={{
        width: 2,
        height: 14,
        marginLeft: 2,
        backgroundColor: color ?? tokens.signalDefault,
        opacity: reduced ? 1 : opacity,
      }}
    />
  );
}

/** The Confidence Ribbon: a 3px hairline whose width + saturation track the
 *  retrieval similarity score directly. The one place in the whole product
 *  where color encodes a number (DESIGN.md §7 / Non-Negotiable #3). The
 *  numeric badge next to it duplicates the meaning for screen readers, per
 *  §10 — the ribbon is never the only carrier of the information. */
export function ConfidenceRibbon({ score }: { score: number }) {
  const { tokens } = useTokens();
  const { widthPct, colors } = ribbonForScore(score, tokens);
  const widthAnim = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      widthAnim.setValue(widthPct);
      return;
    }
    Animated.timing(widthAnim, {
      toValue: widthPct,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width isn't supported by the native driver
    }).start();
  }, [widthPct, reduced]);

  return (
    <View
      accessibilityLabel={`Similarity ${score}%`}
      style={{ height: 3, width: '100%', backgroundColor: tokens.borderDefault, overflow: 'hidden' }}
    >
      <Animated.View
        style={{
          height: 3,
          width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }}
      >
        <LinearGradient
          colors={colors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, minWidth: 40 }}
        />
      </Animated.View>
    </View>
  );
}
