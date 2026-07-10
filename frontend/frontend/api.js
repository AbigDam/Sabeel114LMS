import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const api = axios.create({ baseURL: BASE_URL });

// AuthContext registers this so api.js can trigger a logout without
// importing AuthContext directly (avoids a circular import).
let onAuthFailure = () => {};
export const setOnAuthFailure = (callback) => {
  onAuthFailure = callback;
};

// Attach the current access token to every outgoing request.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If multiple requests 401 at once, only refresh once and let the
// others wait on the result instead of firing N refresh calls.
let isRefreshing = false;
let pendingRequests = [];
const subscribeToRefresh = (callback) => pendingRequests.push(callback);
const resolvePendingRequests = (newToken) => {
  pendingRequests.forEach((callback) => callback(newToken));
  pendingRequests = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthError = error.response?.status === 401;
    const isRefreshCall = originalRequest?.url?.includes('/token/refresh/');

    if (!isAuthError || isRefreshCall || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeToRefresh((newToken) => {
          if (!newToken) return reject(error);
          originalRequest._retry = true;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token stored');

      const { data } = await axios.post(`${BASE_URL}/token/refresh/`, {
        refresh: refreshToken,
      });

      await AsyncStorage.setItem('authToken', data.access);
      // Only present if ROTATE_REFRESH_TOKENS is enabled on the backend.
      if (data.refresh) {
        await AsyncStorage.setItem('refreshToken', data.refresh);
      }

      isRefreshing = false;
      resolvePendingRequests(data.access);

      originalRequest.headers.Authorization = `Bearer ${data.access}`;
      return api(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      resolvePendingRequests(null);
      await AsyncStorage.multiRemove(['authToken', 'refreshToken']);
      onAuthFailure(); // tells AuthContext the session is truly dead
      return Promise.reject(refreshError);
    }
  }
);

// Generic call-anything helper. Goes through the `api` instance above,
// so auth headers and silent token refresh are already handled — you
// just describe the request.
//
//   method: 'get' | 'post' | 'put' | 'patch' | 'delete' (default 'get')
//   url:    endpoint path relative to BASE_URL, e.g. 'users/42/'
//   params: query string params (used for GET/DELETE)
//   data:   request body (used for POST/PUT/PATCH)
//   config: any extra axios config (headers, signal, etc.) to merge in
export const apiCall = async (method, url, { params, data, ...config } = {}) => {
  const response = await api.request({
    method,
    url,
    params,
    data,
    ...config,
  });
  return response.data;
};

export default api;