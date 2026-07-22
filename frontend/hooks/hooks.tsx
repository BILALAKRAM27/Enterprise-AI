// hooks.tsx
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
  useWindowDimensions,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { lightTokens, darkTokens, Tokens } from '../theme/tokens';

/** Resolves the app's existing system/manual theme toggle (NativeWind) to a token set. */
export function useTokens(): { tokens: Tokens; isDark: boolean } {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  return { tokens: isDark ? darkTokens : lightTokens, isDark };
}

/** Mirrors CSS `prefers-reduced-motion`. Every looping/animated bit on this
 *  screen checks this first and degrades to a plain opacity fade or a static
 *  state, per DESIGN.md §1.7 / §10. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => mounted && setReduced(!!v));
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => setReduced(!!v));
    return () => {
      mounted = false;
      // @ts-ignore RN's EventSubscription.remove() signature varies by version
      sub?.remove?.();
    };
  }, []);
  return reduced;
}

/* ---------------------------------------------------------------------- *
 * Scroll-reveal
 *
 * A small IntersectionObserver stand-in that works the same way on iOS,
 * Android, and web inside one ScrollView. The ScrollView measures its own
 * screen position once; each <Reveal> measures its own screen position on
 * layout; combined with live scroll offset that gives an accurate "how far
 * into the viewport is this element" number — the same job the original
 * site's IntersectionObserver reveal-on-scroll was doing.
 * ---------------------------------------------------------------------- */

const RevealCtx = createContext<{
  scrollY: number;
  viewportH: number;
  containerPageY: number;
} | null>(null);

export function RevealProvider({
  children,
  scrollY,
  containerPageY,
}: {
  children: React.ReactNode;
  scrollY: number;
  containerPageY: number;
}) {
  const { height: viewportH } = useWindowDimensions();
  return (
    <RevealCtx.Provider value={{ scrollY, viewportH, containerPageY }}>{children}</RevealCtx.Provider>
  );
}

/** Attach the returned pieces to the outer ScrollView:
 *  `onScroll={handleScroll}` `scrollEventThrottle={16}`, and call
 *  `measureContainer` from the ScrollView's `onLayout`. */
export function useScrollRevealController() {
  const [scrollY, setScrollY] = useState(0);
  const [containerPageY, setContainerPageY] = useState(0);
  const containerRef = useRef<View>(null);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(e.nativeEvent.contentOffset.y);
  }, []);

  const measureContainer = useCallback(() => {
    // @ts-ignore measure() exists on the underlying native/DOM node
    containerRef.current?.measure?.((_x: number, _y: number, _w: number, _h: number, _pageX: number, pageY: number) => {
      setContainerPageY(pageY ?? 0);
    });
  }, []);

  return { scrollY, containerPageY, containerRef, handleScroll, measureContainer };
}

let revealIdSeq = 0;

/** Wrap any section/card with <Reveal> to get the fade-up-on-scroll treatment
 *  from the original site's `.reveal` / `.reveal.in` classes. */
export function Reveal({
  children,
  delay = 0,
  style,
  onReveal,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
  onReveal?: () => void;
}) {
  const ctx = useContext(RevealCtx);
  const reduced = useReducedMotion();
  useRef(revealIdSeq++).current; // stable id, kept for future debugging/telemetry
  const ref = useRef<View>(null);
  const [shown, setShown] = useState(false);
  const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduced ? 0 : 18)).current;

  const reveal = useCallback(() => {
    if (shown) return;
    setShown(true);
    onReveal?.();
    if (reduced) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [shown, reduced, delay, onReveal]);

  const checkVisible = useCallback(() => {
    if (shown) return;
    // @ts-ignore measure() exists on the underlying native/DOM node
    ref.current?.measure?.((_x: number, _y: number, _w: number, _h: number, _pageX: number, pageY: number) => {
      // pageY undefined means native hasn't committed the layout yet —
      // treat the element as visible so the screen doesn't stay blank.
      if (pageY === undefined || pageY === null) {
        reveal();
        return;
      }
      if (!ctx) {
        reveal();
        return;
      }
      const contentY = pageY - ctx.containerPageY + ctx.scrollY;
      const threshold = ctx.scrollY + ctx.viewportH * 0.88;
      if (contentY < threshold) reveal();
    });
  }, [ctx, shown, reveal]);

  // Retry measurement after a frame to catch the native commit.
  const tryMeasure = useCallback(() => {
    checkVisible();
    const t = setTimeout(checkVisible, 150);
    return () => clearTimeout(t);
  }, [checkVisible]);

  useEffect(() => {
    // Safety fallback: if checkVisible / measure fails to run/succeed,
    // guarantee we show the component after 600ms so the screen never stays blank.
    const safety = setTimeout(() => {
      reveal();
    }, 600);

    const cleanup = tryMeasure();

    return () => {
      clearTimeout(safety);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.scrollY, ctx?.containerPageY]);

  return (
    <Animated.View
      ref={ref as any}
      onLayout={tryMeasure}
      style={[style, { opacity, transform: [{ translateY }] }]}
    >
      {children}
    </Animated.View>
  );
}
