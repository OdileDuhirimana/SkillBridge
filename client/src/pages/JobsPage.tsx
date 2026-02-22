import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  StarIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import LoadingSpinner from '../components/LoadingSpinner';

interface Job {
  id: string;
  title: string;
  company: {
    name: string;
    logo: string;
    industry: string;
  };
  location: {
    city: string;
    state: string;
    country: string;
    isRemote: boolean;
  };
  type: string;
  level: string;
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  description: string;
  requirements: string[];
  benefits: string[];
  postedAt: string;
  isFeatured: boolean;
  isUrgent: boolean;
  match: number;
  isSaved: boolean;
}

const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    level: '',
    location: '',
    remote: false,
    salaryMin: '',
    salaryMax: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy] = useState('relevance');

  useEffect(() => {
    loadJobs();
  }, [searchTerm, filters, sortBy]);

  const loadJobs = async () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockJobs: Job[] = [
        {
          id: '1',
          title: 'Senior React Developer',
          company: {
            name: 'TechCorp',
            logo: '',
            industry: 'Technology',
          },
          location: {
            city: 'San Francisco',
            state: 'CA',
            country: 'USA',
            isRemote: false,
          },
          type: 'Full-time',
          level: 'Senior',
          salary: {
            min: 120000,
            max: 150000,
            currency: 'USD',
          },
          description: 'We are looking for a senior React developer to join our team...',
          requirements: ['5+ years React experience', 'TypeScript', 'Node.js'],
          benefits: ['Health insurance', '401k', 'Flexible hours'],
          postedAt: '2 hours ago',
          isFeatured: true,
          isUrgent: false,
          match: 95,
          isSaved: false,
        },
        {
          id: '2',
          title: 'Full Stack Engineer',
          company: {
            name: 'DataFlow Inc.',
            logo: '',
            industry: 'Technology',
          },
          location: {
            city: 'Remote',
            state: '',
            country: 'Global',
            isRemote: true,
          },
          type: 'Full-time',
          level: 'Mid',
          salary: {
            min: 100000,
            max: 130000,
            currency: 'USD',
          },
          description: 'Join our remote-first team as a full stack engineer...',
          requirements: ['3+ years experience', 'React', 'Node.js', 'PostgreSQL'],
          benefits: ['Remote work', 'Health insurance', 'Learning budget'],
          postedAt: '1 day ago',
          isFeatured: false,
          isUrgent: true,
          match: 88,
          isSaved: true,
        },
        {
          id: '3',
          title: 'Frontend Developer',
          company: {
            name: 'StartupXYZ',
            logo: '',
            industry: 'Technology',
          },
          location: {
            city: 'New York',
            state: 'NY',
            country: 'USA',
            isRemote: false,
          },
          type: 'Full-time',
          level: 'Junior',
          salary: {
            min: 90000,
            max: 120000,
            currency: 'USD',
          },
          description: 'Great opportunity for a frontend developer to grow...',
          requirements: ['1+ years experience', 'React', 'CSS', 'JavaScript'],
          benefits: ['Mentorship', 'Health insurance', 'Stock options'],
          postedAt: '2 days ago',
          isFeatured: false,
          isUrgent: false,
          match: 82,
          isSaved: false,
        },
      ];

      setJobs(mockJobs);
      setLoading(false);
    }, 1000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadJobs();
  };

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleSaveJob = (jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { ...job, isSaved: !job.isSaved }
        : job
    ));
  };

  const formatSalary = (salary: Job['salary']) => {
    return `$${salary.min.toLocaleString()} - $${salary.max.toLocaleString()}`;
  };

  const getMatchColor = (match: number) => {
    if (match >= 90) return 'text-green-600 bg-green-100';
    if (match >= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Find Your Dream Job</h1>
        <p className="text-gray-600 mt-2">
          Discover opportunities that match your skills and career goals.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs, companies, or keywords..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              Filters
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">All Categories</option>
                  <option value="Technology">Technology</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Type
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experience Level
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.level}
                  onChange={(e) => handleFilterChange('level', e.target.value)}
                >
                  <option value="">All Levels</option>
                  <option value="Entry">Entry Level</option>
                  <option value="Junior">Junior</option>
                  <option value="Mid">Mid Level</option>
                  <option value="Senior">Senior</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="City, State"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      <Link to={`/jobs/${job.id}`} className="hover:text-blue-600">
                        {job.title}
                      </Link>
                    </h3>
                    {job.isFeatured && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <StarIcon className="h-3 w-3 mr-1" />
                        Featured
                      </span>
                    )}
                    {job.isUrgent && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Urgent
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                      <BriefcaseIcon className="h-4 w-4 mr-1" />
                      {job.company.name}
                    </div>
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {job.location.isRemote ? 'Remote' : `${job.location.city}, ${job.location.state}`}
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {job.type}
                    </div>
                    <div className="flex items-center">
                      <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                      {formatSalary(job.salary)}
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4 line-clamp-2">{job.description}</p>

                  <div className="flex items-center gap-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMatchColor(job.match)}`}>
                      {job.match}% match
                    </span>
                    <span className="text-sm text-gray-500">{job.postedAt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleSaveJob(job.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    {job.isSaved ? (
                      <HeartSolidIcon className="h-5 w-5 text-red-500" />
                    ) : (
                      <HeartIcon className="h-5 w-5" />
                    )}
                  </button>
                  <Link
                    to={`/jobs/${job.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && jobs.length > 0 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Previous
            </button>
            <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to <span className="font-medium">10</span> of{' '}
                <span className="font-medium">97</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  Previous
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  1
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  2
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsPage;
