import axios, { AxiosError } from 'axios';
import type { TokenResponse, RecognizerListResponse } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !original?._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (original) original.headers!['Authorization'] = `Bearer ${token}`;
          return api(original!);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        processQueue(error, null);
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<TokenResponse>(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        processQueue(null, data.access_token);
        if (original) original.headers!['Authorization'] = `Bearer ${data.access_token}`;
        return api(original!);
      } catch (err) {
        processQueue(err, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  register: (email: string, password: string) =>
    api.post('/auth/register', { email, password }),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),

  me: () => api.get('/auth/me'),
};

export const formulaApi = {
  convert: (formData: FormData) =>
    api.post('/formula/convert', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  listHistory: (page = 1, pageSize = 20) =>
    api.get('/formula/history', { params: { page, page_size: pageSize } }),

  getHistoryItem: (id: string) => api.get(`/formula/history/${id}`),

  deleteHistoryItem: (id: string) => api.delete(`/formula/history/${id}`),

  toggleBookmark: (id: string) => api.patch(`/formula/history/${id}/bookmark`),
};

export const settingsApi = {
  getRecognizer: () =>
    api.get<RecognizerListResponse>('/settings/recognizer'),

  setRecognizer: (recognizer: string) =>
    api.patch<RecognizerListResponse>('/settings/recognizer', { recognizer }),
};
