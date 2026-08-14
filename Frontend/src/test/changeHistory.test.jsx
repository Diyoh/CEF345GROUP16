/**
 * CHANGE HISTORY PRESENTATION
 *
 * The log only does its job if a citizen can read it. These assert that the OLD value
 * survives to the screen, that each field renders in its own units, and that a downward
 * revision of reported progress is visibly marked.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect } from 'vitest';

import { ChangeHistory } from '../components/ChangeHistory';
import { I18nProvider } from '../i18n';

const change = (over = {}) => ({
  id: Math.random().toString(36).slice(2),
  field: 'progress',
  oldValue: '60',
  newValue: '30',
  actorName: 'BTP Cameroun S.A.',
  actorRole: 'CONTRACTOR',
  changedAt: '2026-03-12T10:00:00Z',
  ...over,
});

describe('ChangeHistory', () => {
  test('shows what the value was, not only what it is now', () => {
    render(<ChangeHistory changes={[change()]} />);
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  test('marks a downward revision of reported progress', () => {
    render(<ChangeHistory changes={[change({ oldValue: '60', newValue: '30' })]} />);
    expect(screen.getByText(/reported progress reduced/i)).toBeInTheDocument();
  });

  test('does not mark progress moving forward', () => {
    render(<ChangeHistory changes={[change({ oldValue: '30', newValue: '60' })]} />);
    expect(screen.queryByText(/reported progress reduced/i)).not.toBeInTheDocument();
  });

  test('renders money fields as money, not bare numbers', () => {
    render(
      <ChangeHistory
        changes={[change({ field: 'spent', oldValue: '200000000', newValue: '450000000' })]}
      />
    );
    expect(screen.getByText(/200\.0m FCFA/)).toBeInTheDocument();
    expect(screen.getByText(/450\.0m FCFA/)).toBeInTheDocument();
  });

  test('attributes every change to a person and a role', () => {
    render(<ChangeHistory changes={[change()]} />);
    expect(screen.getByText(/BTP Cameroun S\.A\./)).toBeInTheDocument();
    expect(screen.getByText(/contractor/i)).toBeInTheDocument();
  });

  test('explains itself when a project has never been edited', () => {
    render(<ChangeHistory changes={[]} />);
    expect(screen.getByText(/no changes recorded yet/i)).toBeInTheDocument();
  });

  test('collapses a long history and expands on request', async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      change({ id: `c${i}`, oldValue: String(i), newValue: String(i + 1) })
    );
    render(<ChangeHistory changes={many} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(8);

    await userEvent.click(screen.getByRole('button', { name: /show all 12 changes/i }));
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
  });

  test('survives a null previous value', () => {
    render(<ChangeHistory changes={[change({ field: 'completionDate', oldValue: null, newValue: '2026-12-31' })]} />);
    expect(screen.getByText('not set')).toBeInTheDocument();
  });
});
