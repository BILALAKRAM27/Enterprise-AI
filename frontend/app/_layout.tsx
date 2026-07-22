// app/_layout.tsx
//
// Single, clean root layout.
// Providers → AuthGuard → Stack (with all screens).
// AuthGuard internally shows SplashScreenView while the JWT bootstrap runs,
// then navigates to the correct screen and renders the Stack.

import '../utils/polyfills';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from '../store';
import { AuthGuard } from '../components/AuthGuard';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Keep the native splash visible until fonts finish loading.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Hide the native splash the moment fonts are ready.
  // Our JS SplashScreenView takes over visually from this point.
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  // While fonts are loading the native splash screen is still showing.
  if (!loaded) return null;

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {/*
            AuthGuard renders SplashScreenView while the JWT bootstrap runs.
            Once done it hands off to children (the Stack).
          */}
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="landing" options={{ animation: 'fade' }} />
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen name="(auth)" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              <Stack.Screen name="+not-found" />
            </Stack>
          </AuthGuard>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}
