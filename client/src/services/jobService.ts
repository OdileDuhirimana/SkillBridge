import { apiService } from './api';
import { ApiResponse, Job, PaginationResponse } from '../types';

export interface JobFilters {
  page?: number;
  limit?: number;
  category?: string;
  type?: string;
  level?: string;
  location?: string;
  remote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  featured?: boolean;
  urgent?: boolean;
}

export interface CreateApplicationInput {
  jobId: string;
  coverLetter?: string;
  answers?: { question: string; answer: string; type?: string }[];
}

/**
 * Thin wrapper over the real `/api/jobs` backend. Every method here mirrors
 * an actual Express route (see server/routes/jobs.js) — there is no mock or
 * simulated data left in this service, unlike the previous JobsPage/
 * JobDetailPage implementations which used hardcoded arrays behind a fake
 * setTimeout delay.
 */
export const jobService = {
  async getJobs(filters: JobFilters = {}): Promise<PaginationResponse<Job>> {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    });

    return apiService.get<PaginationResponse<Job>>('/jobs', params);
  },

  async getJob(id: string): Promise<Job & { hasApplied: boolean }> {
    const response = await apiService.get<ApiResponse<Job & { hasApplied: boolean }>>(`/jobs/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to load job');
    }
    return response.data;
  },

  async getJobCategories(): Promise<string[]> {
    const response = await apiService.get<ApiResponse<string[]>>('/jobs/categories');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to load categories');
    }
    return response.data;
  },

  async getJobsByCompany(companyId: string, page = 1, limit = 10): Promise<PaginationResponse<Job>> {
    return apiService.get<PaginationResponse<Job>>(`/jobs/company/${companyId}`, { page, limit });
  }
};
