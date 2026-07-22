import { api } from './api';

export const healthService = {
  checkHealth: async (): Promise<{ ok: boolean; message?: string }> => {
    try {
      const { data } = await api.get<{ status: string }>('/health', { timeout: 5000 });
      return { ok: data?.status === 'ok' };
    } catch (err: any) {
      const errorMsg = err.classified?.message || 'Cannot connect to server';
      return { ok: false, message: errorMsg };
    }
  },
};
