import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import { jobService } from '../services/jobService';
import { applicationService } from '../services/applicationService';
import { Job } from '../types';
import { formatSalary, formatLocation } from '../utils/formatters';

type JobWithApplicationState = Job & { hasApplied: boolean };

const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobWithApplicationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');

  const loadJob = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const data = await jobService.getJob(id);
      setJob(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load this job. Please try again.');
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  const handleApply = async () => {
    if (!id) return;
    setApplying(true);

    try {
      await applicationService.createApplication({ jobId: id, coverLetter: coverLetter || undefined });
      setJob((prev) => (prev ? { ...prev, hasApplied: true } : null));
      setShowApplicationForm(false);
      toast.success('Application submitted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadJob} />;
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Job not found</h2>
        <p className="text-gray-600 mt-2">The job you're looking for doesn't exist.</p>
        <Link to="/jobs" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
          Browse Jobs
        </Link>
      </div>
    );
  }

  const requirementLines = job.requirements ? job.requirements.split('\n').filter(Boolean) : [];
  const responsibilityLines = job.responsibilities ? job.responsibilities.split('\n').filter(Boolean) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Job Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              {job.isFeatured && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Featured
                </span>
              )}
              {job.isUrgent && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Urgent
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-4">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                <Link to={`/companies/${job.company?.id}`} className="hover:text-blue-600">
                  {job.company?.name || 'Unknown company'}
                </Link>
              </div>
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                {formatLocation(job.location)}
              </div>
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                {job.type}
              </div>
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                {formatSalary(job.salary)}
              </div>
            </div>

            <span className="text-sm text-gray-500">
              Posted {new Date(job.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Company Info */}
      {job.company && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">About {job.company.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Industry</span>
              <p className="text-gray-900">{job.company.industry || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Company Size</span>
              <p className="text-gray-900">{job.company.size ? `${job.company.size} employees` : 'Not specified'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Location</span>
              <p className="text-gray-900">{formatLocation(job.location)}</p>
            </div>
          </div>
          <Link
            to={`/companies/${job.company.id}`}
            className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-500"
          >
            View Company Profile
          </Link>
        </div>
      )}

      {/* Job Description */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
        <div className="prose max-w-none">
          <p className="text-gray-600 whitespace-pre-line">{job.description}</p>
        </div>
      </div>

      {/* Requirements */}
      {requirementLines.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Requirements</h2>
          <ul className="space-y-2">
            {requirementLines.map((requirement, index) => (
              <li key={index} className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span className="text-gray-600">{requirement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Responsibilities */}
      {responsibilityLines.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Responsibilities</h2>
          <ul className="space-y-2">
            {responsibilityLines.map((responsibility, index) => (
              <li key={index} className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span className="text-gray-600">{responsibility}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Skills</h2>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Application Form */}
      {showApplicationForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Apply for this position</h2>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleApply();
            }}
          >
            <div>
              <label htmlFor="cover-letter" className="block text-sm font-medium text-gray-700 mb-1">
                Cover Letter
              </label>
              <textarea
                id="cover-letter"
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tell us why you're interested in this position..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                maxLength={2000}
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={applying}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying ? 'Applying...' : 'Submit Application'}
              </button>
              <button
                type="button"
                onClick={() => setShowApplicationForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {job.hasApplied ? (
              <div className="flex items-center text-green-600">
                <CheckCircleIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                <span className="font-medium">Application Submitted</span>
              </div>
            ) : (
              <button
                onClick={() => setShowApplicationForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Apply Now
              </button>
            )}
            {job.company && (
              <Link
                to={`/companies/${job.company.id}`}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
              >
                View Company
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailPage;
