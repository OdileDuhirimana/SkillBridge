import React from 'react';
import { render } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders without crashing at the default size', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('applies the requested size class', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    expect(container.querySelector('.w-12.h-12')).toBeInTheDocument();
  });
});
