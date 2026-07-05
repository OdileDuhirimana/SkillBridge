import React from 'react';
import { render } from '@testing-library/react';
import { renderStars } from './renderStars';

describe('renderStars', () => {
  it('renders 5 star icons total for any rating between 0 and 5', () => {
    const { container } = render(<>{renderStars(3.5)}</>);
    expect(container.querySelectorAll('svg')).toHaveLength(5);
  });

  it('renders 0 filled stars for a rating of 0', () => {
    const { container } = render(<>{renderStars(0)}</>);
    expect(container.querySelectorAll('svg')).toHaveLength(5);
    // With a rating of 0, every star should render as the empty/outline variant.
    expect(container.querySelectorAll('svg.text-yellow-400')).toHaveLength(0);
  });

  it('applies the requested icon size class to every star', () => {
    const { container } = render(<>{renderStars(4, 'h-6 w-6')}</>);
    expect(container.querySelectorAll('svg.h-6.w-6')).toHaveLength(5);
  });
});
