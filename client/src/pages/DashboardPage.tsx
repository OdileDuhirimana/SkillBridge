import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BriefcaseIcon, 
  BuildingOfficeIcon, 
  UserGroupIcon,
  ChartBarIcon,
  BellIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

interface DashboardStats {
  totalJobs: number;
  applications: number;
  interviews: number;
  offers: number;
  profileViews: number;
  connections: number;
}

interface RecentActivity {
  id: string;
  type: 'application' | 'interview' | 'offer' | 'message';
  title: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface JobRecommendation {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  match: number;
  postedAt: string;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    applications: 0,
    interviews: 0,
    offers: 0,
    profileViews: 0,
    connections: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [jobRecommendations, setJobRecommendations] = useState<JobRecommendation[]>([]);

  useEffect(() => {
    // Simulate loading dashboard data
    const loadDashboardData = async () => {
      setLoading(true);
      
      // Simulate API calls
      setTimeout(() => {
        setStats({
          totalJobs: 1250,
          applications: 12,
          interviews: 3,
          offers: 1,
          profileViews: 45,
          connections: 23,
        });

        setRecentActivity([
          {
            id: '1',
            type: 'application',
            title: 'Applied to Software Engineer at TechCorp',
            description: 'Your application has been submitted successfully',
            timestamp: '2 hours ago',
            status: 'pending',
          },
          {
            id: '2',
            type: 'interview',
            title: 'Interview scheduled with DataFlow Inc.',
            description: 'Interview scheduled for tomorrow at 2:00 PM',
            timestamp: '1 day ago',
            status: 'accepted',
          },
          {
            id: '3',
            type: 'offer',
            title: 'Job offer received from StartupXYZ',
            description: 'Congratulations! You have received a job offer',
            timestamp: '3 days ago',
            status: 'accepted',
          },
        ]);

        setJobRecommendations([
          {
            id: '1',
            title: 'Senior React Developer',
            company: 'TechCorp',
            location: 'San Francisco, CA',
            type: 'Full-time',
            salary: '$120,000 - $150,000',
            match: 95,
            postedAt: '2 hours ago',
          },
          {
            id: '2',
            title: 'Full Stack Engineer',
            company: 'DataFlow Inc.',
            location: 'Remote',
            type: 'Full-time',
            salary: '$100,000 - $130,000',
            match: 88,
            postedAt: '1 day ago',
          },
          {
            id: '3',
            title: 'Frontend Developer',
            company: 'StartupXYZ',
            location: 'New York, NY',
            type: 'Full-time',
            salary: '$90,000 - $120,000',
            match: 82,
            postedAt: '2 days ago',
          },
        ]);

        setLoading(false);
      }, 1000);
    };

    loadDashboardData();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'application':
        return <BriefcaseIcon className="h-5 w-5 text-blue-600" />;
      case 'interview':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'offer':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'message':
        return <BellIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <BellIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your job search today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BriefcaseIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Jobs
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalJobs.toLocaleString()}
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
                <UserGroupIcon className="h-6 w-6 text-green-600" />
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
                <ClockIcon className="h-6 w-6 text-yellow-600" />
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
                <CheckCircleIcon className="h-6 w-6 text-purple-600" />
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
                <EyeIcon className="h-6 w-6 text-indigo-600" />
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

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Connections
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.connections}
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
              Recent Activity
            </h3>
            <div className="mt-5 flow-root">
              <ul className="-mb-8">
                {recentActivity.map((activity, activityIdx) => (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {activityIdx !== recentActivity.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                            {getActivityIcon(activity.type)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-900">{activity.title}</p>
                            <p className="text-sm text-gray-500">{activity.description}</p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                              {activity.status}
                            </span>
                            <p className="mt-1">{activity.timestamp}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Job Recommendations */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recommended Jobs
              </h3>
              <Link
                to="/jobs"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
            <div className="mt-5 space-y-4">
              {jobRecommendations.map((job) => (
                <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{job.title}</h4>
                      <p className="text-sm text-gray-600">{job.company}</p>
                      <p className="text-sm text-gray-500">{job.location} • {job.type}</p>
                      <p className="text-sm text-gray-500">{job.salary}</p>
                    </div>
                    <div className="ml-4 flex flex-col items-end">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {job.match}% match
                      </span>
                      <span className="text-xs text-gray-500 mt-1">{job.postedAt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              <BriefcaseIcon className="h-5 w-5 mr-2" />
              Browse Jobs
            </Link>
            <Link
              to="/profile"
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <UserGroupIcon className="h-5 w-5 mr-2" />
              Update Profile
            </Link>
            <Link
              to="/companies"
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <BuildingOfficeIcon className="h-5 w-5 mr-2" />
              Explore Companies
            </Link>
            <Link
              to="/analytics"
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              View Analytics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;