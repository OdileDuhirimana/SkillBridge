import { apiService } from './api';
import { ApiResponse, User, Skill, Experience, Education } from '../types';

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  skills?: Skill[];
  experience?: Experience[];
  education?: Education[];
}

/**
 * Thin wrapper over the real `/api/users/:id` backend
 * (server/routes/users.js, server/controllers/userController.js).
 * Replaces the hardcoded mock skills/experience/education arrays previously
 * used by ProfilePage — profile data now comes exclusively from the
 * authenticated user's own record.
 */
export const userService = {
  async updateProfile(userId: string, updates: UpdateProfileInput): Promise<User> {
    const response = await apiService.put<ApiResponse<User>>(`/users/${userId}`, updates);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update profile');
    }
    return response.data;
  },

  async addSkill(userId: string, name: string, level: Skill['level']): Promise<Skill[]> {
    const response = await apiService.post<ApiResponse<Skill[]>>(`/users/${userId}/skills`, { name, level });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to add skill');
    }
    return response.data;
  },

  async deleteSkill(userId: string, skillId: string): Promise<Skill[]> {
    const response = await apiService.delete<ApiResponse<Skill[]>>(`/users/${userId}/skills/${skillId}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to remove skill');
    }
    return response.data;
  },
};
