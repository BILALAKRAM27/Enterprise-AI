import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

/**
 * Returns the correct API base URL depending on platform:
 * - Android emulator: 10.0.2.2 (routes to host machine localhost)
 * - iOS simulator + Web: localhost
 * - Physical device: set EXPO_PUBLIC_API_URL in a .env file at the project root
 */
const getBaseUrl = (): string => {
  // Allow override via environment variable for physical device testing
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return `${envUrl}/api/v1`;

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api/v1';
  }
  return 'http://localhost:8000/api/v1';
};

export const BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30s timeout — generous for first LLM response
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItemAsync('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // no-op — unauthenticated requests are fine for login/register
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// On 401: clear stored token so AuthGuard forces re-login
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
    return Promise.reject(error);
  }
);
