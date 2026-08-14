/**
 * STRETCHED-LINK CONTAINMENT REGRESSION
 *
 * ProjectCard expands its title link across the whole card with `after:absolute
 * after:inset-0`. An absolutely positioned overlay resolves against the nearest POSITIONED
 * ancestor — so if Card is not `relative`, the overlay escapes to the initial containing
 * block and covers the entire viewport. Every rendered card then paints a full-page click
 * target, and the last one in the DOM captures almost every click on the site.
 *
 * This is invisible: nothing throws, nothing looks wrong, the page is simply unusable.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';

import { Card } from '../components/ui/Card';
import { ProjectCard } from '../components/ProjectCard';
import { I18nProvider } from '../i18n';

const project = {
  id: 'p1',
  title: 'Yaoundé-Douala Highway Phase 2',
  location: 'Edéa',
  region: 'Littoral',
  budget: 1000,
  spent: 500,
  progress: 40,
  status: 'Ongoing',
  images: [],
};

describe('Card positioning', () => {
  test('every variant establishes a positioning context', () => {
    for (const variant of ['static', 'interactive', 'inset', 'plain']) {
      const { container, unmount } = render(<Card variant={variant}>content</Card>);
      expect(container.firstChild.className).toContain('relative');
      unmount();
    }
  });

  test('a caller-supplied className cannot drop `relative`', () => {
    const { container } = render(<Card className="mt-4 w-full">content</Card>);
    expect(container.firstChild.className).toContain('relative');
  });
});

describe('ProjectCard stretched link', () => {
  const renderCard = () =>
    render(
      <I18nProvider><MemoryRouter>
        <ProjectCard project={project} />
      </MemoryRouter></I18nProvider>
    );

  test('the overlay link is contained by a positioned ancestor', () => {
    const { container } = renderCard();

    const link = screen.getByRole('link', { name: /Yaoundé-Douala/i });
    expect(link.className).toContain('after:absolute');

    // Walk up from the link and require a positioning context before we reach the root.
    let node = link.parentElement;
    let positioned = false;
    while (node && node !== container) {
      if (node.className && String(node.className).split(/\s+/).includes('relative')) {
        positioned = true;
        break;
      }
      node = node.parentElement;
    }

    expect(positioned).toBe(true);
  });

  test('the card exposes exactly one link, so the overlay cannot compete with siblings', () => {
    renderCard();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
});

/**
 * BADGE READABILITY OVER PHOTOGRAPHS
 *
 * Contractors upload whatever they photograph, so the pixels behind a card badge may be
 * white sky, dark tarmac or a bright jacket. The outlined flag rank uses a transparent
 * background, which is correct on a known surface and invisible over an image — amber text
 * on a bright photo disappeared entirely.
 *
 * A gradient scrim would not fix this: it fades, so a badge landing in its light end is
 * still unreadable. Only an opaque fill gives the same contrast over every photo.
 */
describe('badges over media', () => {
  const flagged = {
    ...project,
    flags: [
      { code: 'past_due', severity: 'warning', label: 'Past its completion date', detail: '60 days past.', params: { days: 60 } },
      { code: 'stalled', severity: 'warning', label: 'Reported as stalled', detail: 'Stalled.', params: {} },
    ],
  };

  const renderCard = (p = flagged) =>
    render(
      <I18nProvider>
        <MemoryRouter>
          <ProjectCard project={p} />
        </MemoryRouter>
      </I18nProvider>
    );

  test('no badge over the photo is transparent', () => {
    const { container } = renderCard();
    const overlay = container.querySelector('.absolute.inset-x-2');
    expect(overlay).not.toBeNull();

    const badges = overlay.querySelectorAll('span.rounded-full');
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((b) => {
      expect(b.className).not.toContain('bg-transparent');
    });
  });

  test('every overlay badge carries an opaque tone fill', () => {
    const { container } = renderCard();
    const overlay = container.querySelector('.absolute.inset-x-2');
    const badges = [...overlay.querySelectorAll('span.rounded-full')];
    // bg-*-bg is the opaque token fill; ring separates the chip from the image.
    badges.forEach((b) => {
      expect(b.className).toMatch(/bg-\w+-bg/);
      expect(b.className).toContain('ring-1');
    });
  });

  test('card flags use the short label so two do not collide', () => {
    renderCard();
    expect(screen.getByText(/^Overdue$/i)).toBeInTheDocument();
    expect(screen.queryByText(/past its completion date/i)).not.toBeInTheDocument();
  });
});

describe('card badges do not repeat themselves', () => {
  const stalled = {
    ...project,
    status: 'Stalled',
    flags: [
      { code: 'past_due', severity: 'warning', label: 'Past its completion date', detail: '60 days past.', params: { days: 60 } },
      { code: 'stalled', severity: 'warning', label: 'Reported as stalled', detail: 'Stalled.', params: {} },
    ],
  };

  test('a stalled project does not show STALLED twice', () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <ProjectCard project={stalled} />
        </MemoryRouter>
      </I18nProvider>
    );
    // The lifecycle badge already says it; the flag beside it is pure repetition.
    expect(screen.getAllByText(/^Stalled$/i)).toHaveLength(1);
    // The non-redundant flag survives.
    expect(screen.getByText(/^Overdue$/i)).toBeInTheDocument();
  });
});
