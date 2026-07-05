import axios, { AxiosInstance, AxiosResponse } from 'axios';

// REACT_APP_API_URL is the server's origin (e.g. "http://localhost:5000"),
// NOT the REST API base path — this must stay consistent with
// SocketContext.tsx, which connects Socket.io directly to this same origin
// (Socket.io needs the bare origin, not a REST path). Appending "/api" here
// (rather than requiring API_URL to already include it) is what keeps both
// consumers of the same env var correct: previously this file's fallback
// silently included "/api" while SocketContext's fallback did not, so any
// deployment that only set REACT_APP_API_URL to the bare origin (matching
// .env.example) would have sent every REST call to the wrong path.
const API_ORIGIN = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_BASE_URL = `${API_ORIGIN.replace(/\/$/, '')}/api`;

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.api.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.api.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.api.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.api.delete(url);
    return response.data;
  }

  async upload<T>(url: string, formData: FormData, onUploadProgress?: (progressEvent: any) => void): Promise<T> {
    const response: AxiosResponse<T> = await this.api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  }
}

export const apiService = new ApiService();
