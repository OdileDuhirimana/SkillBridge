import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  BuildingOfficeIcon,
  MapPinIcon,
  UserGroupIcon,
  StarIcon,
  HeartIcon,
  BriefcaseIcon,
  ShareIcon
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
  website: string;
  founded: number;
  headquarters: string;
}

const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCompany = useCallback(async () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockCompany: Company = {
        id: id || '1',
        name: 'TechCorp',
        logo: '',
        industry: 'Technology',
        size: '201-500',
        location: 'San Francisco, CA',
        description: 'TechCorp is a leading technology company focused on innovation and growth. We build cutting-edge software solutions that help businesses transform their operations and achieve their goals. Our team of talented engineers, designers, and product managers work together to create products that make a real difference in the world.',
        rating: 4.5,
        reviewCount: 128,
        isVerified: true,
        isFollowing: false,
        jobsCount: 15,
        benefits: ['Health Insurance', '401k', 'Flexible Hours', 'Remote Work', 'Stock Options', 'Learning Budget'],
        culture: ['Innovative', 'Collaborative', 'Fast-paced', 'Inclusive', 'Growth-oriented'],
        website: 'https://techcorp.com',
        founded: 2015,
        headquarters: 'San Francisco, CA',
      };

      setCompany(mockCompany);
      setLoading(false);
    }, 1000);
  }, [id]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  const toggleFollow = () => {
    if (company) {
      setCompany(prev => prev ? { ...prev, isFollowing: !prev.isFollowing } : null);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<StarSolidIcon key={i} className="h-5 w-5 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<StarIcon key="half" className="h-5 w-5 text-yellow-400" />);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<StarIcon key={`empty-${i}`} className="h-5 w-5 text-gray-300" />);
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Company not found</h2>
        <p className="text-gray-600 mt-2">The company you're looking for doesn't exist.</p>
        <Link to="/companies" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
          Browse Companies
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Company Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
                  {company.isVerified && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
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

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center">
                <div className="flex items-center">
                  {renderStars(company.rating)}
                </div>
                <span className="ml-2 text-sm text-gray-600">
                  {company.rating} ({company.reviewCount} reviews)
                </span>
              </div>
              <span className="text-sm text-gray-500">{company.industry}</span>
            </div>

            <p className="text-gray-600 mb-4">{company.description}</p>

            <div className="flex items-center gap-4">
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                Visit Website
              </a>
              <span className="text-sm text-gray-500">Founded {company.founded}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-6">
            <button
              onClick={toggleFollow}
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
            >
              {company.isFollowing ? (
                <HeartSolidIcon className="h-6 w-6 text-blue-500" />
              ) : (
                <HeartIcon className="h-6 w-6" />
              )}
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <ShareIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About {company.name}</h2>
            <p className="text-gray-600">{company.description}</p>
          </div>

          {/* Benefits */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Benefits & Perks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {company.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-600">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Culture */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Culture</h2>
            <div className="flex flex-wrap gap-2">
              {company.culture.map((trait, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Company Stats */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Industry</span>
                <span className="font-medium">{company.industry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Size</span>
                <span className="font-medium">{company.size} employees</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Founded</span>
                <span className="font-medium">{company.founded}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Headquarters</span>
                <span className="font-medium">{company.headquarters}</span>
              </div>
            </div>
          </div>

          {/* Recent Jobs */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Jobs</h3>
              <Link
                to={`/jobs?company=${company.id}`}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
            <div className="space-y-3">
              <div className="border border-gray-200 rounded-lg p-3">
                <h4 className="font-medium text-gray-900">Senior React Developer</h4>
                <p className="text-sm text-gray-600">San Francisco, CA</p>
                <p className="text-sm text-gray-500">$120,000 - $150,000</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <h4 className="font-medium text-gray-900">Full Stack Engineer</h4>
                <p className="text-sm text-gray-600">San Francisco, CA</p>
                <p className="text-sm text-gray-500">$100,000 - $130,000</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <h4 className="font-medium text-gray-900">Product Manager</h4>
                <p className="text-sm text-gray-600">San Francisco, CA</p>
                <p className="text-sm text-gray-500">$130,000 - $160,000</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/jobs?company=${company.id}`}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              View All Jobs
            </Link>
            <button
              onClick={toggleFollow}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
            >
              {company.isFollowing ? 'Following' : 'Follow Company'}
            </button>
          </div>
          <div className="text-sm text-gray-500">
            {company.jobsCount} open positions
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailPage;
