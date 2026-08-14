import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';
import { ProjectStatus } from '../types';

/**
 * These tests assert SEMANTIC tone classes, not raw palette values.
 *
 * The previous version asserted `bg-yellow-100` for Ongoing and `bg-red-100` for
 * Stalled, which locked in an inverted colour system: amber is reserved for "behind
 * schedule" and red for "the money is gone", so a healthy ongoing project was being
 * rendered as a warning. Asserting tokens instead means a future palette change does
 * not break the suite, but a change in MEANING does.
 */
describe('StatusBadge', () => {
  const toneOf = (status) => screen.getByText(status).closest('span');

  it('renders Planned in the planned tone', () => {
    render(<StatusBadge status={ProjectStatus.PLANNED} />);
    expect(toneOf(ProjectStatus.PLANNED)).toHaveClass('bg-planned-bg', 'text-planned-fg');
  });

  it('renders Ongoing in the in-progress tone, not a warning tone', () => {
    render(<StatusBadge status={ProjectStatus.ONGOING} />);
    const badge = toneOf(ProjectStatus.ONGOING);
    expect(badge).toHaveClass('bg-progress-bg', 'text-progress-fg');
    expect(badge).not.toHaveClass('bg-delayed-bg');
  });

  it('renders Completed in the done tone', () => {
    render(<StatusBadge status={ProjectStatus.COMPLETED} />);
    expect(toneOf(ProjectStatus.COMPLETED)).toHaveClass('bg-done-bg', 'text-done-fg');
  });

  it('renders Stalled achromatically, reserving red for money', () => {
    render(<StatusBadge status={ProjectStatus.STALLED} />);
    const badge = toneOf(ProjectStatus.STALLED);
    expect(badge).toHaveClass('bg-stalled-bg', 'text-stalled-fg');
    expect(badge).not.toHaveClass('bg-over-bg');
  });

  it('adds an over-budget flag when spend exceeds budget', () => {
    render(
      <StatusBadge project={{ status: ProjectStatus.ONGOING, budget: 100, spent: 120, progress: 40 }} />
    );
    expect(screen.getByText('Over budget')).toBeInTheDocument();
  });

  it('adds a delayed flag when the completion date has passed', () => {
    render(
      <StatusBadge
        project={{
          status: ProjectStatus.ONGOING,
          budget: 100,
          spent: 20,
          progress: 40,
          completionDate: '2020-01-01',
        }}
      />
    );
    expect(screen.getByText('Delayed')).toBeInTheDocument();
  });

  it('flags nothing on a healthy project', () => {
    render(
      <StatusBadge
        project={{
          status: ProjectStatus.ONGOING,
          budget: 100,
          spent: 20,
          progress: 40,
          completionDate: '2099-01-01',
        }}
      />
    );
    expect(screen.queryByText('Delayed')).not.toBeInTheDocument();
    expect(screen.queryByText('Over budget')).not.toBeInTheDocument();
  });
});
