import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Shared error-state UI, used across every page that fetches from the API.
 * Centralizing this ensures every data-fetching page distinguishes loading
 * vs. error vs. empty (previously only ~2 of 14 pages handled errors at
 * all, per the portfolio audit's FE-02 finding), and gives users an
 * explicit retry action instead of a silently blank screen.
 */
const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Something went wrong while loading this data.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`text-center py-12 ${className}`} role="alert">
      <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" aria-hidden="true" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to load data</h3>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
