import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorState from './ErrorState';

describe('ErrorState', () => {
  it('renders the provided message inside an alert region', () => {
    render(<ErrorState message="Failed to load jobs." />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Failed to load jobs.');
  });

  it('does not render a retry button when onRetry is not provided', () => {
    render(<ErrorState message="No retry available." />);
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('calls onRetry when the retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    render(<ErrorState message="Network error." onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
