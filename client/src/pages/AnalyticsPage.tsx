import React, { useState, useEffect, useCallback } from 'react';
import {
  EyeIcon,
  BriefcaseIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import { analyticsService, UserAnalytics } from '../services/analyticsService';

type TimeRange = '7d' | '30d' | '90d' | '1y';

const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getUserAnalytics(timeRange);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics. Please try again.');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadAnalytics} />;
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">No analytics data available</h2>
        <p className="text-gray-600 mt-2">Start using the platform to see your analytics.</p>
      </div>
    );
  }

  const topSkills = analytics.skills.topSkills.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Track your job search progress and profile performance.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="time-range" className="sr-only">Time range</label>
            <select
              id="time-range"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <EyeIcon className="h-8 w-8 text-blue-600" aria-hidden="true" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Profile Views
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {analytics.userStats.profileViews}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BriefcaseIcon className="h-8 w-8 text-green-600" aria-hidden="true" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Applications ({analytics.period})
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {analytics.applications.total}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" aria-hidden="true" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Avg. Response Time
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {analytics.applications.avgResponseTime} days
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BriefcaseIcon className="h-8 w-8 text-purple-600" aria-hidden="true" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Success Rate
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {analytics.insights.successRate.toFixed(0)}%
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Application Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Application Status</h3>
          {Object.keys(analytics.applications.statusDistribution).length === 0 ? (
            <p className="text-sm text-gray-500">No applications in this period yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(analytics.applications.statusDistribution).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{status.replace(/-/g, ' ')}</span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Job Search Insights</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Most Applied Category</span>
              <span className="text-sm font-medium text-gray-900">{analytics.insights.mostAppliedCategory || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Most Applied Job Type</span>
              <span className="text-sm font-medium text-gray-900">{analytics.insights.mostAppliedType || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Success Rate</span>
              <span className="text-sm font-medium text-gray-900">{analytics.insights.successRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Skills in Demand */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Skills Requested by Jobs You Applied To</h3>
        {topSkills.length === 0 ? (
          <p className="text-sm text-gray-500">Apply to jobs to see which skills are most in demand.</p>
        ) : (
          <div className="space-y-3">
            {topSkills.map(({ skill, count }) => (
              <div key={skill} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{skill}</span>
                <span className="text-sm font-medium text-gray-900">{count} job{count === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
