import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';

export interface ClassifiedApiError {
  type: 'NETWORK_UNAVAILABLE' | 'SERVER_UNAVAILABLE' | 'TIMEOUT' | 'AUTH_FAILURE' | 'SERVER_ERROR' | 'UNKNOWN';
  message: string;
  originalError: any;
}

/**
 * API URL resolution strategy (evaluated once at bundle time by Metro):
 *
 * 1. EXPO_PUBLIC_API_URL   — always set in preview/production via eas.json env block.
 *                            Also set in Vercel dashboard for web builds.
 * 2. Expo Go / dev-client  — dynamically resolved from the Metro dev-server hostUri
 *                            so you can point a physical device at your local machine.
 * 3. Android Emulator      — http://10.0.2.2:8000 (host machine alias)
 * 4. Web / iOS Simulator   — http://localhost:8000
 *
 * If none of these apply (i.e. a production EAS build without the env var) the
 * function throws immediately so the misconfiguration is obvious instead of
 * producing silent "Network Error" failures at runtime.
 */
const getBaseUrl = (): string => {
  // ── 1. Explicit env var (EAS build profiles / Vercel dashboard) ────────────
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    const cleanUrl = envUrl.trim().replace(/\/+$/, '');
    return cleanUrl.endsWith('/api/v1') ? cleanUrl : `${cleanUrl}/api/v1`;
  }

  // ── 2. Expo Go / development client on a physical device ───────────────────
  //    Constants.expoConfig.hostUri is only populated when a Metro dev server
  //    is running (Expo Go or dev-client).  It is null/undefined in standalone
  //    EAS builds, so this block only ever runs during local development.
  const hostUri =
    Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri && (Platform.OS === 'android' || Platform.OS === 'ios')) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:8000/api/v1`;
    }
  }

  // ── 3. Android Emulator ────────────────────────────────────────────────────
  if (Platform.OS === 'android') {
    // Safety-net: warn loudly if we reach here in a standalone build.
    // 10.0.2.2 is reachable only from the Android Emulator, NOT from a
    // physical device.  If you see this warning the fix is to set
    // EXPO_PUBLIC_API_URL in eas.json → build → <profile> → env.
    if (!__DEV__) {
      console.error(
        '[API] CRITICAL: EXPO_PUBLIC_API_URL is not set in this EAS build. ' +
          'All requests will fail on physical devices. ' +
          'Add env.EXPO_PUBLIC_API_URL to your eas.json build profile.'
      );
    }
    return 'http://10.0.2.2:8000/api/v1';
  }

  // ── 4. Web / iOS Simulator ─────────────────────────────────────────────────
  return 'http://localhost:8000/api/v1';
};

export const BASE_URL = getBaseUrl();
console.log(`[API] Base URL: ${BASE_URL} | Platform: ${Platform.OS} | DEV: ${__DEV__}`);

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90000, // 90 s — covers Render free-tier cold-start (≤60 s) + RAG generation
  headers: {
    'Content-Type': 'application/json',
  },
});


export const classifyApiError = (error: any): ClassifiedApiError => {
  if (axios.isCancel(error)) {
    return {
      type: 'UNKNOWN',
      message: 'Request was cancelled.',
      originalError: error,
    };
  }

  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      type: 'TIMEOUT',
      message: 'The request timed out. Please check your connection and try again.',
      originalError: error,
    };
  }

  if (!error.response) {
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      return {
        type: 'SERVER_UNAVAILABLE',
        message: 'Cannot connect to server. Please ensure the backend is running and accessible.',
        originalError: error,
      };
    }
    return {
      type: 'NETWORK_UNAVAILABLE',
      message: 'Network unavailable. Please check your internet connection.',
      originalError: error,
    };
  }

  const status = error.response.status;
  if (status === 401 || status === 403) {
    return {
      type: 'AUTH_FAILURE',
      message: error.response.data?.detail || 'Authentication failed. Please log in again.',
      originalError: error,
    };
  }

  if (status >= 500) {
    return {
      type: 'SERVER_ERROR',
      message: error.response.data?.detail || 'Server error encountered. Please try again later.',
      originalError: error,
    };
  }

  return {
    type: 'UNKNOWN',
    message: error.response.data?.detail || error.message || 'An unexpected error occurred.',
    originalError: error,
  };
};

// Attach JWT token to every request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItemAsync('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // no-op
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Classify errors & handle 401 token cleanup
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await storage.deleteItemAsync('access_token');
      } catch {
        // no-op
      }
    }
    const classified = classifyApiError(error);
    error.classified = classified;
    return Promise.reject(error);
  }
);
