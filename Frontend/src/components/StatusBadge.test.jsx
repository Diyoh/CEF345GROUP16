import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';
import { ProjectStatus } from '../types';
import { I18nProvider } from '../i18n';
import { en } from '../i18n/en';

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
  // Status values are stored in English and DISPLAYED translated. These tests run in the
  // default English locale, where label === stored value, but the lookup goes through the
  // dictionary so the intent stays clear if the English wording is ever reworded.
  const toneOf = (status) => screen.getByText(en.status[status]).closest('span');

  it('renders Planned in the planned tone', () => {
    render(<I18nProvider><StatusBadge status={ProjectStatus.PLANNED} /></I18nProvider>);
    expect(toneOf(ProjectStatus.PLANNED)).toHaveClass('bg-planned-bg', 'text-planned-fg');
  });

  it('renders Ongoing in the in-progress tone, not a warning tone', () => {
    render(<I18nProvider><StatusBadge status={ProjectStatus.ONGOING} /></I18nProvider>);
    const badge = toneOf(ProjectStatus.ONGOING);
    expect(badge).toHaveClass('bg-progress-bg', 'text-progress-fg');
    expect(badge).not.toHaveClass('bg-delayed-bg');
  });

  it('renders Completed in the done tone', () => {
    render(<I18nProvider><StatusBadge status={ProjectStatus.COMPLETED} /></I18nProvider>);
    expect(toneOf(ProjectStatus.COMPLETED)).toHaveClass('bg-done-bg', 'text-done-fg');
  });

  it('renders Stalled achromatically, reserving red for money', () => {
    render(<I18nProvider><StatusBadge status={ProjectStatus.STALLED} /></I18nProvider>);
    const badge = toneOf(ProjectStatus.STALLED);
    expect(badge).toHaveClass('bg-stalled-bg', 'text-stalled-fg');
    expect(badge).not.toHaveClass('bg-over-bg');
  });

  it('adds an over-budget flag when spend exceeds budget', () => {
    render(
      <I18nProvider>
        <StatusBadge project={{ status: ProjectStatus.ONGOING, budget: 100, spent: 120, progress: 40 }} />
      </I18nProvider>
    );
    expect(screen.getByText('Over budget')).toBeInTheDocument();
  });

  it('adds a delayed flag when the completion date has passed', () => {
    render(
      <I18nProvider>
        <StatusBadge
          project={{
            status: ProjectStatus.ONGOING,
            budget: 100,
            spent: 20,
            progress: 40,
            completionDate: '2020-01-01',
          }}
        />
      </I18nProvider>
    );
    expect(screen.getByText('Delayed')).toBeInTheDocument();
  });

  it('flags nothing on a healthy project', () => {
    render(
      <I18nProvider>
        <StatusBadge
          project={{
            status: ProjectStatus.ONGOING,
            budget: 100,
            spent: 20,
            progress: 40,
            completionDate: '2099-01-01',
          }}
        />
      </I18nProvider>
    );
    expect(screen.queryByText('Delayed')).not.toBeInTheDocument();
    expect(screen.queryByText('Over budget')).not.toBeInTheDocument();
  });
});
