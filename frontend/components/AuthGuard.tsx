import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../hooks/store';
import { storage } from '../utils/storage';
import { setCredentials, setLoading, logout } from '../store/slices/authSlice';
import { authService } from '../services/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await storage.getItemAsync('access_token');
        if (token) {
          // Verify the token is still valid by fetching the current user
          const user = await authService.getCurrentUser();
          dispatch(setCredentials({ user, token }));
        }
      } catch {
        // Token is expired or invalid — clear it and force re-login
        await storage.deleteItemAsync('access_token');
        dispatch(logout());
      } finally {
        dispatch(setLoading(false));
      }
    };

    bootstrapAsync();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return <>{children}</>;
}
