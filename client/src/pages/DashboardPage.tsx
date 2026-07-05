import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BriefcaseIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import { applicationService } from '../services/applicationService';
import { jobService } from '../services/jobService';
import { Application, Job } from '../types';
import { formatSalary } from '../utils/formatters';

interface DashboardStats {
  applications: number;
  interviews: number;
  offers: number;
  profileViews: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    applications: 0,
    interviews: 0,
    offers: 0,
    profileViews: 0,
  });
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [jobRecommendations, setJobRecommendations] = useState<Job[]>([]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [applicationsResponse, jobsResponse] = await Promise.all([
        applicationService.getApplications({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        jobService.getJobs({ limit: 3, sortBy: 'createdAt', sortOrder: 'desc' }),
      ]);

      const applications = applicationsResponse.data;
      const interviews = applications.filter((app) =>
        ['interview-scheduled', 'interview-completed'].includes(app.status)
      ).length;
      const offers = applications.filter((app) =>
        ['offer-extended', 'offer-accepted'].includes(app.status)
      ).length;

      setStats({
        applications: applicationsResponse.pagination.total,
        interviews,
        offers,
        profileViews: user?.stats?.profileViews ?? 0,
      });
      setRecentApplications(applications);
      setJobRecommendations(jobsResponse.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load your dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadDashboardData} />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your job search today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BriefcaseIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Applications
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.applications}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Interviews
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.interviews}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-purple-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Job Offers
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.offers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <EyeIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Profile Views
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.profileViews}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Applications
            </h3>
            {recentApplications.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">
                You haven't applied to any jobs yet. <Link to="/jobs" className="text-blue-600 hover:text-blue-500">Browse jobs</Link> to get started.
              </p>
            ) : (
              <div className="mt-5 flow-root">
                <ul className="-mb-8">
                  {recentApplications.map((application, index) => (
                    <li key={application.id}>
                      <div className="relative pb-8">
                        {index !== recentApplications.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                              <BriefcaseIcon className="h-5 w-5 text-blue-600" aria-hidden="true" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-900">
                                Applied to {application.job?.title || 'a job'} at {application.company?.name || 'a company'}
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              <span className="capitalize">{application.status.replace(/-/g, ' ')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Job Recommendations */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Latest Jobs
              </h3>
              <Link
                to="/jobs"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
            {jobRecommendations.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">No jobs available right now.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {jobRecommendations.map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{job.title}</h4>
                        <p className="text-sm text-gray-600">{job.company?.name}</p>
                        <p className="text-sm text-gray-500">{job.type}</p>
                        <p className="text-sm text-gray-500">{formatSalary(job.salary)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/jobs"
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <BriefcaseIcon className="h-5 w-5 mr-2" aria-hidden="true" />
              Browse Jobs
            </Link>
            <Link
              to="/profile"
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <UserGroupIcon className="h-5 w-5 mr-2" aria-hidden="true" />
              Update Profile
            </Link>
            <Link
              to="/companies"
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <BuildingOfficeIcon className="h-5 w-5 mr-2" aria-hidden="true" />
              Explore Companies
            </Link>
            <Link
              to="/analytics"
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ChartBarIcon className="h-5 w-5 mr-2" aria-hidden="true" />
              View Analytics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
