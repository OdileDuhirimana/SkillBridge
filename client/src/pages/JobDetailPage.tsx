import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  HeartIcon,
  ShareIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import LoadingSpinner from '../components/LoadingSpinner';

interface Job {
  id: string;
  title: string;
  company: {
    id: string;
    name: string;
    logo: string;
    industry: string;
    size: string;
    description: string;
  };
  location: {
    city: string;
    state: string;
    country: string;
    isRemote: boolean;
  };
  type: string;
  level: string;
  category: string;
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  skills: string[];
  postedAt: string;
  isFeatured: boolean;
  isUrgent: boolean;
  match: number;
  isSaved: boolean;
  hasApplied: boolean;
}

const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockJob: Job = {
        id: id || '1',
        title: 'Senior React Developer',
        company: {
          id: '1',
          name: 'TechCorp',
          logo: '',
          industry: 'Technology',
          size: '201-500',
          description: 'TechCorp is a leading technology company focused on innovation and growth.',
        },
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          isRemote: false,
        },
        type: 'Full-time',
        level: 'Senior',
        category: 'Technology',
        salary: {
          min: 120000,
          max: 150000,
          currency: 'USD',
        },
        description: `We are looking for a senior React developer to join our dynamic team. You will be responsible for building and maintaining our web applications using React, TypeScript, and modern frontend technologies.

As a senior developer, you will:
- Lead the development of complex React applications
- Mentor junior developers
- Collaborate with cross-functional teams
- Contribute to architectural decisions
- Ensure code quality and best practices`,
        requirements: [
          '5+ years of experience with React and JavaScript',
          'Strong understanding of TypeScript',
          'Experience with state management (Redux, Zustand)',
          'Knowledge of modern CSS frameworks (Tailwind, Styled Components)',
          'Experience with testing frameworks (Jest, React Testing Library)',
          'Familiarity with build tools (Webpack, Vite)',
          'Experience with version control (Git)',
          'Strong problem-solving skills',
        ],
        responsibilities: [
          'Develop and maintain React applications',
          'Write clean, maintainable, and efficient code',
          'Collaborate with designers and backend developers',
          'Participate in code reviews',
          'Mentor junior team members',
          'Stay up-to-date with latest technologies',
        ],
        benefits: [
          'Competitive salary and equity',
          'Comprehensive health insurance',
          '401(k) with company matching',
          'Flexible work arrangements',
          'Professional development budget',
          'Gym membership',
          'Catered meals',
          'Unlimited PTO',
        ],
        skills: ['React', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Git', 'Node.js'],
        postedAt: '2 hours ago',
        isFeatured: true,
        isUrgent: false,
        match: 95,
        isSaved: false,
        hasApplied: false,
      };

      setJob(mockJob);
      setLoading(false);
    }, 1000);
  };

  const handleSaveJob = () => {
    if (job) {
      setJob(prev => prev ? { ...prev, isSaved: !prev.isSaved } : null);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    
    // Simulate application process
    setTimeout(() => {
      if (job) {
        setJob(prev => prev ? { ...prev, hasApplied: true } : null);
        setShowApplicationForm(false);
      }
      setApplying(false);
    }, 2000);
  };

  const formatSalary = (salary: Job['salary']) => {
    return `$${salary.min.toLocaleString()} - $${salary.max.toLocaleString()}`;
  };

  const getMatchColor = (match: number) => {
    if (match >= 90) return 'text-green-600 bg-green-100';
    if (match >= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
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

            <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                <Link to={`/companies/${job.company.id}`} className="hover:text-blue-600">
                  {job.company.name}
                </Link>
              </div>
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2" />
                {job.location.isRemote ? 'Remote' : `${job.location.city}, ${job.location.state}`}
              </div>
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 mr-2" />
                {job.type}
              </div>
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                {formatSalary(job.salary)}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMatchColor(job.match)}`}>
                {job.match}% match
              </span>
              <span className="text-sm text-gray-500">Posted {job.postedAt}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-6">
            <button
              onClick={handleSaveJob}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              {job.isSaved ? (
                <HeartSolidIcon className="h-6 w-6 text-red-500" />
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
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">About {job.company.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <span className="text-sm font-medium text-gray-500">Industry</span>
            <p className="text-gray-900">{job.company.industry}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Company Size</span>
            <p className="text-gray-900">{job.company.size} employees</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Location</span>
            <p className="text-gray-900">{job.location.city}, {job.location.state}</p>
          </div>
        </div>
        <p className="text-gray-600">{job.company.description}</p>
        <Link
          to={`/companies/${job.company.id}`}
          className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-500"
        >
          View Company Profile
        </Link>
      </div>

      {/* Job Description */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
        <div className="prose max-w-none">
          <p className="text-gray-600 whitespace-pre-line">{job.description}</p>
        </div>
      </div>

      {/* Requirements */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Requirements</h2>
        <ul className="space-y-2">
          {job.requirements.map((requirement, index) => (
            <li key={index} className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">{requirement}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Responsibilities */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Responsibilities</h2>
        <ul className="space-y-2">
          {job.responsibilities.map((responsibility, index) => (
            <li key={index} className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">{responsibility}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Benefits */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Benefits & Perks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {job.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center">
              <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
              <span className="text-gray-600">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Skills</h2>
        <div className="flex flex-wrap gap-2">
          {job.skills.map((skill, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Application Form */}
      {showApplicationForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Apply for this position</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cover Letter
              </label>
              <textarea
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tell us why you're interested in this position..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resume
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleApply}
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
                <CheckCircleIcon className="h-5 w-5 mr-2" />
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
            <Link
              to={`/companies/${job.company.id}`}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
            >
              View Company
            </Link>
          </div>
          <div className="text-sm text-gray-500">
            {job.match}% match with your profile
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailPage;