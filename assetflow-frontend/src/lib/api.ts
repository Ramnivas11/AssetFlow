import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { ApiResponse } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1";

let accessToken: string | null = localStorage.getItem("assetflow.accessToken");
let onUnauthorized: (() => void) | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) localStorage.setItem("assetflow.accessToken", token);
  else localStorage.removeItem("assetflow.accessToken");
};

export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried && !original.url?.includes("/auth/refresh")) {
      original._retried = true;
      try {
        const refresh = await api.post<ApiResponse<{ accessToken: string }>>("/auth/refresh");
        setAccessToken(refresh.data.data.accessToken);
        original.headers.Authorization = `Bearer ${refresh.data.data.accessToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
        onUnauthorized?.();
      }
    }
    return Promise.reject(error);
  },
);

export const unwrap = async <T,>(request: Promise<{ data: ApiResponse<T> }>) => (await request).data.data;

export const apiMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    if (data?.errors) {
      const details = Object.entries(data.errors)
        .map(([field, msgs]) => {
          const fieldName = field.startsWith("body.") ? field.slice(5) : field;
          return `${fieldName}: ${msgs.join(", ")}`;
        })
        .join("; ");
      return `${data.message ?? "Validation failed"}: ${details}`;
    }
    return data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
};

export const toastApiError = (error: unknown) => toast.error(apiMessage(error));
