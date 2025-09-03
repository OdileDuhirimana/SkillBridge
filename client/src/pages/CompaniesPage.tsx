import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserGroupIcon,
  StarIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import LoadingSpinner from '../components/LoadingSpinner';

interface Company {
  id: string;
  name: string;
  logo: string;
  industry: string;
  size: string;
  location: string;
  description: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isFollowing: boolean;
  jobsCount: number;
  benefits: string[];
  culture: string[];
}

const CompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    industry: '',
    size: '',
    location: '',
    verified: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    loadCompanies();
  }, [searchTerm, filters, sortBy]);

  const loadCompanies = async () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockCompanies: Company[] = [
        {
          id: '1',
          name: 'TechCorp',
          logo: '',
          industry: 'Technology',
          size: '201-500',
          location: 'San Francisco, CA',
          description: 'TechCorp is a leading technology company focused on innovation and growth. We build cutting-edge software solutions.',
          rating: 4.5,
          reviewCount: 128,
          isVerified: true,
          isFollowing: false,
          jobsCount: 15,
          benefits: ['Health Insurance', '401k', 'Flexible Hours', 'Remote Work'],
          culture: ['Innovative', 'Collaborative', 'Fast-paced', 'Inclusive'],
        },
        {
          id: '2',
          name: 'DataFlow Inc.',
          logo: '',
          industry: 'Technology',
          size: '51-200',
          location: 'Remote',
          description: 'DataFlow Inc. is a data analytics company that helps businesses make data-driven decisions.',
          rating: 4.2,
          reviewCount: 89,
          isVerified: true,
          isFollowing: true,
          jobsCount: 8,
          benefits: ['Health Insurance', 'Learning Budget', 'Stock Options', 'Remote Work'],
          culture: ['Data-driven', 'Collaborative', 'Remote-first', 'Growth-oriented'],
        },
        {
          id: '3',
          name: 'StartupXYZ',
          logo: '',
          industry: 'Technology',
          size: '11-50',
          location: 'New York, NY',
          description: 'StartupXYZ is an early-stage startup building the future of work with innovative solutions.',
          rating: 4.0,
          reviewCount: 45,
          isVerified: false,
          isFollowing: false,
          jobsCount: 5,
          benefits: ['Equity', 'Health Insurance', 'Flexible Hours', 'Learning Budget'],
          culture: ['Startup', 'Fast-paced', 'Innovative', 'Collaborative'],
        },
        {
          id: '4',
          name: 'DesignStudio',
          logo: '',
          industry: 'Design',
          size: '11-50',
          location: 'Los Angeles, CA',
          description: 'DesignStudio is a creative agency specializing in digital design and user experience.',
          rating: 4.3,
          reviewCount: 67,
          isVerified: true,
          isFollowing: false,
          jobsCount: 3,
          benefits: ['Health Insurance', 'Creative Freedom', 'Flexible Hours', 'Professional Development'],
          culture: ['Creative', 'Collaborative', 'Design-focused', 'Inclusive'],
        },
        {
          id: '5',
          name: 'FinanceFirst',
          logo: '',
          industry: 'Finance',
          size: '501-1000',
          location: 'Chicago, IL',
          description: 'FinanceFirst is a leading financial services company providing innovative banking solutions.',
          rating: 4.1,
          reviewCount: 156,
          isVerified: true,
          isFollowing: false,
          jobsCount: 22,
          benefits: ['Health Insurance', '401k', 'Pension', 'Professional Development'],
          culture: ['Professional', 'Stable', 'Growth-oriented', 'Inclusive'],
        },
      ];

      setCompanies(mockCompanies);
      setLoading(false);
    }, 1000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCompanies();
  };

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleFollow = (companyId: string) => {
    setCompanies(prev => prev.map(company => 
      company.id === companyId 
        ? { ...company, isFollowing: !company.isFollowing }
        : company
    ));
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<StarSolidIcon key={i} className="h-4 w-4 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<StarIcon key="half" className="h-4 w-4 text-yellow-400" />);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<StarIcon key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
    }

    return stars;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Discover Companies</h1>
        <p className="text-gray-600 mt-2">
          Explore companies and find your next career opportunity.
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
                placeholder="Search companies..."
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
                  Industry
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.industry}
                  onChange={(e) => handleFilterChange('industry', e.target.value)}
                >
                  <option value="">All Industries</option>
                  <option value="Technology">Technology</option>
                  <option value="Design">Design</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Size
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.size}
                  onChange={(e) => handleFilterChange('size', e.target.value)}
                >
                  <option value="">All Sizes</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
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

              <div className="flex items-center">
                <input
                  id="verified"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={filters.verified}
                  onChange={(e) => handleFilterChange('verified', e.target.checked)}
                />
                <label htmlFor="verified" className="ml-2 block text-sm text-gray-900">
                  Verified companies only
                </label>
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
          companies.map((company) => (
            <div key={company.id} className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          <Link to={`/companies/${company.id}`} className="hover:text-blue-600">
                            {company.name}
                          </Link>
                        </h3>
                        {company.isVerified && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          {company.location}
                        </div>
                        <div className="flex items-center">
                          <UserGroupIcon className="h-4 w-4 mr-1" />
                          {company.size} employees
                        </div>
                        <div className="flex items-center">
                          <BriefcaseIcon className="h-4 w-4 mr-1" />
                          {company.jobsCount} jobs
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4 line-clamp-2">{company.description}</p>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center">
                      <div className="flex items-center">
                        {renderStars(company.rating)}
                      </div>
                      <span className="ml-1 text-sm text-gray-600">
                        {company.rating} ({company.reviewCount} reviews)
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">{company.industry}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {company.benefits.slice(0, 3).map((benefit, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {benefit}
                      </span>
                    ))}
                    {company.benefits.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{company.benefits.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleFollow(company.id)}
                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    {company.isFollowing ? (
                      <HeartSolidIcon className="h-5 w-5 text-blue-500" />
                    ) : (
                      <HeartIcon className="h-5 w-5" />
                    )}
                  </button>
                  <Link
                    to={`/companies/${company.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    View Company
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && companies.length > 0 && (
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

export default CompaniesPage;