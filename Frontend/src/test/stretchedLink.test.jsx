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
