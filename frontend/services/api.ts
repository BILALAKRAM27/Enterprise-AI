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
 * Production-ready API URL resolution strategy:
 * 1. process.env.EXPO_PUBLIC_API_URL (Primary env variable from frontend/.env)
 * 2. In Expo Go on physical device: dynamically resolve computer's LAN IP from Expo manifest
 * 3. Android Emulator fallback: 10.0.2.2:8000
 * 4. Web / iOS Simulator fallback: localhost:8000
 */
const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    const cleanUrl = envUrl.trim().replace(/\/+$/, '');
    return cleanUrl.endsWith('/api/v1') ? cleanUrl : `${cleanUrl}/api/v1`;
  }

  // Dynamic LAN IP resolution for Expo Go physical device testing
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri && (Platform.OS === 'android' || Platform.OS === 'ios')) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:8000/api/v1`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api/v1'; // Android Emulator
  }

  return 'http://localhost:8000/api/v1'; // Web / iOS Simulator
};

export const BASE_URL = getBaseUrl();
console.log(`[API Network Service] Resolved Base URL: ${BASE_URL} (Platform: ${Platform.OS})`);

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90000, // 90s — accommodates Render free-tier cold-start (30-50s) + RAG generation time
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
