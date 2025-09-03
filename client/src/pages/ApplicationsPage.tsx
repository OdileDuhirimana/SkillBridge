import React, { useState, useEffect } from 'react';
import { 
  BriefcaseIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

interface Application {
  id: string;
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
  };
  status: 'pending' | 'reviewed' | 'interview' | 'rejected' | 'accepted';
  appliedAt: string;
  lastUpdated: string;
  interviewDate?: string;
  notes?: string;
}

const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadApplications();
  }, [filter]);

  const loadApplications = async () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockApplications: Application[] = [
        {
          id: '1',
          job: {
            id: '1',
            title: 'Senior React Developer',
            company: 'TechCorp',
            location: 'San Francisco, CA',
          },
          status: 'interview',
          appliedAt: '2024-01-15',
          lastUpdated: '2024-01-20',
          interviewDate: '2024-01-25',
          notes: 'Interview scheduled for next week',
        },
        {
          id: '2',
          job: {
            id: '2',
            title: 'Full Stack Engineer',
            company: 'DataFlow Inc.',
            location: 'Remote',
          },
          status: 'reviewed',
          appliedAt: '2024-01-10',
          lastUpdated: '2024-01-18',
        },
        {
          id: '3',
          job: {
            id: '3',
            title: 'Frontend Developer',
            company: 'StartupXYZ',
            location: 'New York, NY',
          },
          status: 'rejected',
          appliedAt: '2024-01-05',
          lastUpdated: '2024-01-12',
        },
        {
          id: '4',
          job: {
            id: '4',
            title: 'Product Manager',
            company: 'DesignStudio',
            location: 'Los Angeles, CA',
          },
          status: 'pending',
          appliedAt: '2024-01-22',
          lastUpdated: '2024-01-22',
        },
      ];

      const filteredApplications = filter === 'all' 
        ? mockApplications 
        : mockApplications.filter(app => app.status === filter);

      setApplications(filteredApplications);
      setLoading(false);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'reviewed':
        return 'text-blue-600 bg-blue-100';
      case 'interview':
        return 'text-purple-600 bg-purple-100';
      case 'accepted':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5" />;
      case 'reviewed':
        return <EyeIcon className="h-5 w-5" />;
      case 'interview':
        return <CalendarIcon className="h-5 w-5" />;
      case 'accepted':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5" />;
      default:
        return <ClockIcon className="h-5 w-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Applications
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'pending'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('reviewed')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'reviewed'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Under Review
          </button>
          <button
            onClick={() => setFilter('interview')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'interview'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Interview
          </button>
          <button
            onClick={() => setFilter('accepted')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'accepted'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Accepted
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'rejected'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12">
            <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' 
                ? "You haven't applied to any jobs yet."
                : `No applications with status "${filter}" found.`
              }
            </p>
          </div>
        ) : (
          applications.map((application) => (
            <div key={application.id} className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {application.job.title}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                      {getStatusIcon(application.status)}
                      <span className="ml-1 capitalize">{application.status}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                      <BriefcaseIcon className="h-4 w-4 mr-1" />
                      {application.job.company}
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {application.job.location}
                    </div>
                  </div>

                  <div className="text-sm text-gray-500 mb-3">
                    Applied on {formatDate(application.appliedAt)}
                    {application.lastUpdated !== application.appliedAt && (
                      <span className="ml-2">
                        • Last updated {formatDate(application.lastUpdated)}
                      </span>
                    )}
                  </div>

                  {application.interviewDate && (
                    <div className="flex items-center text-sm text-purple-600 mb-2">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Interview scheduled for {formatDate(application.interviewDate)}
                    </div>
                  )}

                  {application.notes && (
                    <p className="text-sm text-gray-600">{application.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium">
                    View Job
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      {!loading && applications.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {applications.filter(app => app.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {applications.filter(app => app.status === 'reviewed').length}
              </div>
              <div className="text-sm text-gray-600">Under Review</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {applications.filter(app => app.status === 'interview').length}
              </div>
              <div className="text-sm text-gray-600">Interviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {applications.filter(app => app.status === 'accepted').length}
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