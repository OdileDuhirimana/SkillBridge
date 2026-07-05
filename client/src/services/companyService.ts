import { apiService } from './api';
import { ApiResponse, Company, PaginationResponse } from '../types';

export interface CompanyFilters {
  page?: number;
  limit?: number;
  industry?: string;
  size?: string;
  verified?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Thin wrapper over the real `/api/companies` backend (server/routes/companies.js).
 */
export const companyService = {
  async getCompanies(filters: CompanyFilters = {}): Promise<PaginationResponse<Company>> {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    });

    return apiService.get<PaginationResponse<Company>>('/companies', params);
  },

  async getCompany(id: string): Promise<Company> {
    const response = await apiService.get<ApiResponse<Company>>(`/companies/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to load company');
    }
    return response.data;
  },

  async getCompanyIndustries(): Promise<string[]> {
    const response = await apiService.get<ApiResponse<string[]>>('/companies/industries');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to load industries');
    }
    return response.data;
  }
};
