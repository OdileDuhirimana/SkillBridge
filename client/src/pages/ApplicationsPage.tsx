import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BriefcaseIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import { applicationService } from '../services/applicationService';
import { Application, ApplicationStatus } from '../types';
import { formatDate } from '../utils/formatters';

type FilterValue = 'all' | ApplicationStatus;

const FILTERS: { id: FilterValue; label: string }[] = [
  { id: 'all', label: 'All Applications' },
  { id: 'applied', label: 'Applied' },
  { id: 'under-review', label: 'Under Review' },
  { id: 'interview-scheduled', label: 'Interview' },
  { id: 'offer-accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
];

const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>('all');

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await applicationService.getApplications({
        status: filter === 'all' ? undefined : filter,
      });
      setApplications(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications. Please try again.');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case 'applied':
        return 'text-yellow-600 bg-yellow-100';
      case 'under-review':
        return 'text-blue-600 bg-blue-100';
      case 'shortlisted':
      case 'interview-scheduled':
      case 'interview-completed':
        return 'text-purple-600 bg-purple-100';
      case 'offer-extended':
      case 'offer-accepted':
        return 'text-green-600 bg-green-100';
      case 'rejected':
      case 'offer-declined':
      case 'withdrawn':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case 'applied':
        return <ClockIcon className="h-5 w-5" aria-hidden="true" />;
      case 'under-review':
        return <EyeIcon className="h-5 w-5" aria-hidden="true" />;
      case 'shortlisted':
      case 'interview-scheduled':
      case 'interview-completed':
        return <CalendarIcon className="h-5 w-5" aria-hidden="true" />;
      case 'offer-extended':
      case 'offer-accepted':
        return <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />;
      case 'rejected':
      case 'offer-declined':
      case 'withdrawn':
        return <XCircleIcon className="h-5 w-5" aria-hidden="true" />;
      default:
        return <ClockIcon className="h-5 w-5" aria-hidden="true" />;
    }
  };

  const statusCounts = applications.reduce<Record<string, number>>((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
        <p className="text-gray-600 mt-2">
          Track the status of your job applications and manage your job search.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === option.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={loadApplications} />
        ) : applications.length === 0 ? (
          <div className="text-center py-12 bg-white shadow rounded-lg">
            <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all'
                ? "You haven't applied to any jobs yet."
                : `No applications with status "${filter}" found.`}
            </p>
          </div>
        ) : (
          applications.map((application) => (
            <div key={application.id} className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {application.job?.title || 'Job no longer available'}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                      {getStatusIcon(application.status)}
                      <span className="ml-1 capitalize">{application.status.replace(/-/g, ' ')}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                      <BriefcaseIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                      {application.company?.name || 'Unknown company'}
                    </div>
                  </div>

                  <div className="text-sm text-gray-500 mb-3">
                    Applied on {formatDate(application.createdAt)}
                  </div>

                  {application.interview?.scheduledDate && (
                    <div className="flex items-center text-sm text-purple-600 mb-2">
                      <CalendarIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                      Interview scheduled for {formatDate(application.interview.scheduledDate)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {application.job && (
                    <Link
                      to={`/jobs/${application.job.id}`}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"
                    >
                      View Job
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      {!loading && !error && applications.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {statusCounts['applied'] || 0}
              </div>
              <div className="text-sm text-gray-600">Applied</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {statusCounts['under-review'] || 0}
              </div>
              <div className="text-sm text-gray-600">Under Review</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {statusCounts['interview-scheduled'] || 0}
              </div>
              <div className="text-sm text-gray-600">Interviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {statusCounts['offer-accepted'] || 0}
              </div>
              <div className="text-sm text-gray-600">Accepted</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationsPage;
