import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  UserGroupIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import { companyService } from '../services/companyService';
import { jobService } from '../services/jobService';
import { Company, Job } from '../types';
import { renderStars } from '../utils/renderStars';
import { formatSalary } from '../utils/formatters';

// This page renders ratings at a larger size (h-5 w-5) than the compact
// list view in CompaniesPage.tsx (which uses the shared default h-4 w-4).
const RATING_ICON_SIZE = 'h-5 w-5';

const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCompany = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const [companyData, jobsResponse] = await Promise.all([
        companyService.getCompany(id),
        jobService.getJobsByCompany(id, 1, 3),
      ]);
      setCompany(companyData);
      setRecentJobs(jobsResponse.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load this company. Please try again.');
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadCompany} />;
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
                <BuildingOfficeIcon className="h-8 w-8 text-gray-400" aria-hidden="true" />
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
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-2">
                  <div className="flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                    {company.headquarters?.city || 'Not specified'}
                  </div>
                  <div className="flex items-center">
                    <UserGroupIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                    {company.size} employees
                  </div>
                  <div className="flex items-center">
                    <BriefcaseIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                    {company.stats?.activeJobs ?? 0} jobs
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center">
                <div className="flex items-center">
                  {renderStars(company.averageRating || 0, RATING_ICON_SIZE)}
                </div>
                <span className="ml-2 text-sm text-gray-600">
                  {company.averageRating || 0} ({company.totalReviews || 0} reviews)
                </span>
              </div>
              <span className="text-sm text-gray-500">{company.industry}</span>
            </div>

            <p className="text-gray-600 mb-4">{company.description}</p>

            <div className="flex items-center gap-4">
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                >
                  Visit Website
                </a>
              )}
              {company.founded && <span className="text-sm text-gray-500">Founded {company.founded}</span>}
            </div>
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
          {company.benefits && company.benefits.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Benefits & Perks</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {company.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-3" aria-hidden="true" />
                    <span className="text-gray-600">{benefit.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Culture */}
          {company.culture?.values && company.culture.values.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Culture</h2>
              <div className="flex flex-wrap gap-2">
                {company.culture.values.map((trait, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}
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
                <span className="font-medium">{company.founded || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Headquarters</span>
                <span className="font-medium">{company.headquarters?.city || 'Not specified'}</span>
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
            {recentJobs.length === 0 ? (
              <p className="text-sm text-gray-500">No open positions right now.</p>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="block border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                  >
                    <h4 className="font-medium text-gray-900">{job.title}</h4>
                    <p className="text-sm text-gray-600">{job.type}</p>
                    <p className="text-sm text-gray-500">{formatSalary(job.salary)}</p>
                  </Link>
                ))}
              </div>
            )}
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
          </div>
          <div className="text-sm text-gray-500">
            {company.stats?.activeJobs ?? 0} open positions
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailPage;
