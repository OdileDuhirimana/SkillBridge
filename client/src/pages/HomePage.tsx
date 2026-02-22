import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  StarIcon,
  UserGroupIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  const features = [
    {
      name: 'Smart Job Matching',
      description: 'AI-powered job recommendations based on your skills and preferences.',
      icon: BriefcaseIcon,
    },
    {
      name: 'Real-time Chat',
      description: 'Connect with employers and colleagues through our integrated chat system.',
      icon: ChatBubbleLeftRightIcon,
    },
    {
      name: 'Analytics Dashboard',
      description: 'Track your application progress and career growth with detailed insights.',
      icon: ChartBarIcon,
    },
    {
      name: 'Company Reviews',
      description: 'Read authentic reviews from employees and make informed decisions.',
      icon: StarIcon,
    },
    {
      name: 'Skill Development',
      description: 'Identify skill gaps and get personalized learning recommendations.',
      icon: UserGroupIcon,
    },
    {
      name: 'Career Mentorship',
      description: 'Get guidance from industry experts and career coaches.',
      icon: UserGroupIcon,
    },
  ];

  const stats = [
    { name: 'Active Users', value: '10,000+' },
    { name: 'Job Listings', value: '5,000+' },
    { name: 'Companies', value: '500+' },
    { name: 'Success Rate', value: '85%' },
  ];

  return (
    <div className="bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">SkillBridge</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <Link
                  to="/dashboard"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Bridge the Gap Between
              <span className="block text-blue-200">Skills and Opportunities</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-blue-100 max-w-2xl mx-auto">
              Connect with the right opportunities, develop your skills, and advance your career 
              with our AI-powered platform designed for modern professionals.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/register"
                className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Get Started
              </Link>
              <Link
                to="/jobs"
                className="text-sm font-semibold leading-6 text-white hover:text-blue-200"
              >
                Browse Jobs <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats section */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.name} className="text-center">
                <div className="text-3xl font-bold text-blue-600">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to advance your career
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Our platform combines cutting-edge technology with human expertise to help you succeed.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.name} className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Icon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{feature.name}</h3>
                    </div>
                  </div>
                  <p className="mt-2 text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="bg-blue-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to take the next step?
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              Join thousands of professionals who have already advanced their careers with SkillBridge.
            </p>
            <div className="mt-8">
              <Link
                to="/register"
                className="inline-flex items-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50"
              >
                Start Your Journey
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-lg font-semibold text-white">SkillBridge</h3>
              <p className="mt-2 text-gray-400">
                Connecting skills with opportunities for a better future.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">For Job Seekers</h4>
              <ul className="mt-2 space-y-2">
                <li><Link to="/jobs" className="text-gray-400 hover:text-white">Find Jobs</Link></li>
                <li><Link to="/companies" className="text-gray-400 hover:text-white">Browse Companies</Link></li>
                <li><Link to="/analytics" className="text-gray-400 hover:text-white">Career Analytics</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">For Employers</h4>
              <ul className="mt-2 space-y-2">
                <li><Link to="/register" className="text-gray-400 hover:text-white">Post Jobs</Link></li>
                <li><Link to="/companies" className="text-gray-400 hover:text-white">Company Profiles</Link></li>
                <li><Link to="/analytics" className="text-gray-400 hover:text-white">Hiring Analytics</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Support</h4>
              <ul className="mt-2 space-y-2">
                <li><Link to="/settings" className="text-gray-400 hover:text-white">Help Center</Link></li>
                <li><Link to="/chat" className="text-gray-400 hover:text-white">Contact Us</Link></li>
                <li><Link to="/settings" className="text-gray-400 hover:text-white">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8">
            <p className="text-center text-gray-400">
              © 2024 SkillBridge. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
