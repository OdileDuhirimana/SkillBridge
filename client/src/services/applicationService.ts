import { apiService } from './api';
import { Application, ApiResponse, PaginationResponse } from '../types';

export interface ApplicationFilters {
  page?: number;
  limit?: number;
  status?: string;
  jobId?: string;
  companyId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateApplicationInput {
  jobId: string;
  coverLetter?: string;
  answers?: { question: string; answer: string; type?: string }[];
}

interface CreateApplicationResponse {
  success: boolean;
  message?: string;
  data: Application;
  xpGained: number;
  leveledUp: boolean;
  newLevel?: number;
}

/**
 * Thin wrapper over the real `/api/applications` backend
 * (server/routes/applications.js). Replaces the hardcoded mock array
 * previously used by ApplicationsPage.
 */
export const applicationService = {
  async getApplications(filters: ApplicationFilters = {}): Promise<PaginationResponse<Application>> {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    });

    return apiService.get<PaginationResponse<Application>>('/applications', params);
  },

  async getApplication(id: string): Promise<Application> {
    const response = await apiService.get<ApiResponse<Application>>(`/applications/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to load application');
    }
    return response.data;
  },

  async createApplication(input: CreateApplicationInput): Promise<CreateApplicationResponse> {
    const response = await apiService.post<CreateApplicationResponse>('/applications', input);
    if (!response.success) {
      throw new Error(response.message || 'Failed to submit application');
    }
    return response;
  },

  async withdrawApplication(id: string): Promise<void> {
    const response = await apiService.put<ApiResponse<void>>(`/applications/${id}/withdraw`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to withdraw application');
    }
  }
};
