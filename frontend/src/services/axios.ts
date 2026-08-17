import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import { publicApiClient } from "./authApi";
import { refreshSession } from "./refreshTokenManager";
import { tokenStorage } from "./tokenStorage";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const apiClient = axios.create({
  baseURL: publicApiClient.defaults.baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const accessToken = tokenStorage.getAccessToken();

  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshedSession = await refreshSession();

    if (!refreshedSession) {
      return Promise.reject(error);
    }

    originalRequest.headers.set(
      "Authorization",
      `Bearer ${refreshedSession.tokens.access}`,
    );

    return apiClient(originalRequest);
  },
);
