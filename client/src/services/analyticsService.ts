import { apiService } from './api';
import { ApiResponse } from '../types';

export interface UserAnalytics {
  period: string;
  userStats: {
    profileViews: number;
    applicationsSent: number;
    interviewsScheduled: number;
    jobsLanded: number;
    xp: number;
    level: number;
  };
  applications: {
    total: number;
    statusDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
    typeDistribution: Record<string, number>;
    industryDistribution: Record<string, number>;
    monthlyTrend: Record<string, number>;
    avgResponseTime: number;
  };
  skills: {
    userSkills: string[];
    topSkills: { skill: string; count: number }[];
    skillFrequency: Record<string, number>;
  };
  insights: {
    mostAppliedCategory: string;
    mostAppliedType: string;
    successRate: number;
  };
}

/**
 * Thin wrapper over the real `/api/analytics/user` backend
 * (server/routes/analytics.js). Replaces the hardcoded mock analytics
 * object previously used by AnalyticsPage.
 */
export const analyticsService = {
  async getUserAnalytics(period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<UserAnalytics> {
    const response = await apiService.get<ApiResponse<UserAnalytics>>('/analytics/user', { period });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to load analytics');
    }
    return response.data;
  }
};
