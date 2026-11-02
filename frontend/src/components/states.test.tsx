import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { EmptyState, ErrorState } from './states';

describe('ErrorState', () => {
  it('shows a permission message without retry for 403', () => {
    render(<ErrorState error={new ApiError(403, 'FORBIDDEN', 'nope')} onRetry={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('You do not have permission');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('shows a not found message without retry for 404', () => {
    render(<ErrorState error={new ApiError(404, 'NOT_FOUND', 'missing')} onRetry={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Not found');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('shows a generic message and calls onRetry once for a network error', async () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new Error('Failed to fetch')} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState', () => {
  it('renders title, description and action', () => {
    render(
      <EmptyState
        title="No projects yet"
        description="Create your first project"
        action={<button type="button">Create project</button>}
      />,
    );
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first project')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create project' })).toBeInTheDocument();
  });
});
