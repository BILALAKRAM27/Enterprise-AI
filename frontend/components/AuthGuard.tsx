// components/AuthGuard.tsx
//
// Bootstraps the JWT on app start, shows the animated splash screen while
// doing so, then navigates to the correct route:
//   valid token   → /(tabs)
//   no/bad token  → /landing

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../hooks/store';
import { storage } from '../utils/storage';
import { setCredentials, setLoading, logout } from '../store/slices/authSlice';
import { authService } from '../services/auth';
import { healthService } from '../services/health';
import { SplashScreenView } from './SplashScreenView';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const segments = useSegments();
  const router = useRouter();

  // Controls whether the JS splash overlay is still visible.
  // Stays true until the exit animation finishes.
  const [showSplash, setShowSplash] = useState(true);

  // ── Token & Health bootstrap ──────────────────────────────────────────────
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // Ping health endpoint on boot
        const health = await healthService.checkHealth();
        if (!health.ok) {
          console.warn('[AuthGuard] Server health check failed:', health.message);
        }

        const token = await storage.getItemAsync('access_token');
        if (token) {
          const user = await authService.getCurrentUser();
          dispatch(setCredentials({ user, token }));
        }
      } catch {
        await storage.deleteItemAsync('access_token');
        dispatch(logout());
      } finally {
        dispatch(setLoading(false));
      }
    };

    bootstrapAsync();
  }, []);

  // ── Route guard ───────────────────────────────────────────────────────────
  // Only navigate after: (1) auth check complete AND (2) splash animation done
  useEffect(() => {
    if (isLoading || showSplash) return;

    const currentSegment = segments[0] as string | undefined;
    const isPublicRoute =
      currentSegment === '(auth)' || currentSegment === 'landing';

    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/landing');
    } else if (isAuthenticated && isPublicRoute) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, showSplash]);

  // Show the animated splash screen while bootstrapping.
  // `ready` triggers the exit animation; when it finishes we unmount the splash.
  if (showSplash) {
    return (
      <SplashScreenView
        ready={!isLoading}
        onAnimationComplete={() => setShowSplash(false)}
      />
    );
  }

  return <>{children}</>;
}
