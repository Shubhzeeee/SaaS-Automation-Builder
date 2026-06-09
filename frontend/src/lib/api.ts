// @ts-nocheck
import axios, { AxiosError, AxiosResponse } from 'axios';
import { useAuthStore } from '@/store/auth.store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// ── Request: attach access token ───────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: auto-refresh on 401 ─────────────────────────────────────────
let refreshing: Promise<any> | null = null;

api.interceptors.response.use(
  (res: AxiosResponse) => res.data?.data ?? res.data,
  async (error: AxiosError) => {
    const original = error.config as any;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshing) {
        const { refreshToken, setTokens, logout } = useAuthStore.getState();

        refreshing = refreshToken
          ? api
              .post('/auth/refresh', { refreshToken })
              .then((res: any) => {
                setTokens(res.accessToken, res.refreshToken);
                refreshing = null;
                return res.accessToken;
              })
              .catch(() => {
                logout();
                refreshing = null;
                window.location.href = '/auth/login';
              })
          : Promise.resolve(null);
      }

      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }

    return Promise.reject(error);
  },
);

// ── Typed resource helpers ─────────────────────────────────────────────────
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};

export const workflowsApi = {
  list: (params?: any) => api.get('/workflows', { params }),
  get: (id: string) => api.get(`/workflows/${id}`),
  create: (data: any) => api.post('/workflows', data),
  update: (id: string, data: any) => api.patch(`/workflows/${id}`, data),
  delete: (id: string) => api.delete(`/workflows/${id}`),
  execute: (id: string, inputData?: any) =>
    api.post(`/workflows/${id}/execute`, { inputData }),
  duplicate: (id: string) => api.post(`/workflows/${id}/duplicate`),
  versions: (id: string) => api.get(`/workflows/${id}/versions`),
  executions: (id: string, params?: any) =>
    api.get(`/workflows/${id}/executions`, { params }),
};

export const integrationsApi = {
  catalog: () => api.get('/integrations/catalog'),
  list: () => api.get('/integrations'),
  get: (id: string) => api.get(`/integrations/${id}`),
  connect: (data: any) => api.post('/integrations', data),
  test: (id: string) => api.post(`/integrations/${id}/test`),
  disconnect: (id: string) => api.delete(`/integrations/${id}`),
};

export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard'),
  timeSeries: (range?: string) =>
    api.get('/analytics/executions/timeseries', { params: { range } }),
  auditLogs: (params?: any) => api.get('/analytics/audit', { params }),
};

export const billingApi = {
  subscription: () => api.get('/billing/subscription'),
  createCheckout: (data: any) => api.post('/billing/checkout', data),
  createPortal: (returnUrl: string) =>
    api.post('/billing/portal', { returnUrl }),
};

export const usersApi = {
  profile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.patch('/users/profile', data),
  members: () => api.get('/users/org/members'),
};
