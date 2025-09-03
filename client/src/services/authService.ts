import { apiService } from './api';
import { User, RegisterData, ApiResponse } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await apiService.post<ApiResponse<{ user: User; token: string }>>('/auth/login', {
      email,
      password,
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Login failed');
    }
    
    return response.data;
  },

  async register(userData: RegisterData): Promise<{ user: User; token: string }> {
    const response = await apiService.post<ApiResponse<{ user: User; token: string }>>('/auth/register', userData);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Registration failed');
    }
    
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<ApiResponse<{ user: User }>>('/auth/me');
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to get user data');
    }
    
    return response.data.user;
  },

  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await apiService.put<ApiResponse<void>>('/auth/update-password', {
      currentPassword,
      newPassword,
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to update password');
    }
  },

  async forgotPassword(email: string): Promise<void> {
    const response = await apiService.post<ApiResponse<void>>('/auth/forgot-password', { email });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to send reset email');
    }
  },

  async resetPassword(token: string, password: string): Promise<void> {
    const response = await apiService.post<ApiResponse<void>>('/auth/reset-password', {
      token,
      password,
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to reset password');
    }
  },

  async verifyEmail(token: string): Promise<void> {
    const response = await apiService.get<ApiResponse<void>>(`/auth/verify-email?token=${token}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to verify email');
    }
  },

  async logout(): Promise<void> {
    try {
      await apiService.post<ApiResponse<void>>('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    }
  },
};
