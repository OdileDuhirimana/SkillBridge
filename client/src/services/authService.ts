import { apiService } from './api';
import { User, RegisterData, ApiResponse } from '../types';

// WHY these three methods read `token`/`user` off the top-level response
// instead of `response.data.*` (the shape every other resource in this
// API uses — see ApiResponse<T> and its `services/*.ts` consumers): the
// auth endpoints are a real, deliberate exception in
// `server/controllers/authController.js` — `register`/`login`/`getMe` all
// return `{ success, message, token, user }` with no `data` wrapper. This
// was a genuine bug, not a stylistic choice: this file previously expected
// `response.data.token`/`response.data.user`, which is always `undefined`
// against the server's actual shape — meaning `!response.data` was always
// true and every login/register call threw, EVEN ON A SUCCESSFUL 201/200
// response, before a user ever saw a dashboard. `server/tests/auth.test.js`
// (30+ passing assertions) verifies the server's actual top-level shape
// directly via Supertest, so the server side of this contract is correct
// and stable; this file was the one out of sync with it. Fixing the type
// here (rather than changing the server response shape to nest under
// `data` for consistency with other endpoints) was the smaller, lower-risk
// change given how much passing server test coverage already locks in the
// current server shape.
interface AuthEndpointResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export const authService = {
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await apiService.post<AuthEndpointResponse>('/auth/login', {
      email,
      password,
    });

    if (!response.success || !response.token || !response.user) {
      throw new Error(response.message || 'Login failed');
    }

    return { token: response.token, user: response.user };
  },

  async register(userData: RegisterData): Promise<{ user: User; token: string }> {
    const response = await apiService.post<AuthEndpointResponse>('/auth/register', userData);

    if (!response.success || !response.token || !response.user) {
      throw new Error(response.message || 'Registration failed');
    }

    return { token: response.token, user: response.user };
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<AuthEndpointResponse>('/auth/me');

    if (!response.success || !response.user) {
      throw new Error(response.message || 'Failed to get user data');
    }

    return response.user;
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
