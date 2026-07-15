import { api } from './api';
import { AuthResponse, User } from '../types';

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    // FastAPI OAuth2PasswordRequestForm requires application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('username', email); // FastAPI uses 'username' field by spec
    formData.append('password', password);

    const { data } = await api.post<AuthResponse>('/auth/login', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  },

  register: async (email: string, password: string): Promise<User> => {
    const { data } = await api.post<User>('/auth/register', { email, password });
    return data;
  },

  getCurrentUser: async (): Promise<User> => {
    const { data } = await api.get<User>('/users/me');
    return data;
  },
};
