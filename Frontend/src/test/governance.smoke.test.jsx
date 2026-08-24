/**
 * GOVERNANCE BROWSER SMOKE TESTS
 *
 * The hierarchy pages must render the tree, respect the reader's language for
 * entity names, and survive the failure and empty shapes the API can return.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from '../i18n';

vi.mock('../api', async () => {
  const actual = await vi.importActual('../api');
  return {
    ...actual,
    api: {
      getEntities: vi.fn(),
      getEntity: vi.fn(),
    },
  };
});

import { api } from '../api';
import { Governance } from '../pages/Governance';
import { EntityPage } from '../pages/EntityPage';

const TREE = {
  national: { id: 'e-cmr', type: 'NATIONAL', code: 'CMR', nameEn: 'Republic of Cameroon', nameFr: 'République du Cameroun', projectCount: 1 },
  ministries: [
    { id: 'e-mintp', type: 'MINISTRY', code: 'MINTP', nameEn: 'Ministry of Public Works', nameFr: 'Ministère des Travaux publics', projectCount: 4 },
  ],
  regions: [
    {
      id: 'e-nw', type: 'REGION', code: 'NW', nameEn: 'North-West', nameFr: 'Nord-Ouest', projectCount: 3,
      councils: [
        { id: 'e-bam', type: 'COUNCIL', code: 'NW-BAMENDA-I', nameEn: 'Bamenda I', nameFr: 'Bamenda I', projectCount: 1 },
      ],
    },
  ],
};

const ENTITY = {
  entity: { id: 'e-nw', type: 'REGION', code: 'NW', nameEn: 'North-West', nameFr: 'Nord-Ouest', parentId: 'e-cmr' },
  parent: { id: 'e-cmr', type: 'NATIONAL', code: 'CMR', nameEn: 'Republic of Cameroon', nameFr: 'République du Cameroun' },
  children: [
    { id: 'e-bam', type: 'COUNCIL', code: 'NW-BAMENDA-I', nameEn: 'Bamenda I', nameFr: 'Bamenda I', projectCount: 1 },
  ],
  projects: [
    {
      id: 'p1', title: 'Ring Road Section 4', location: 'Bamenda', region: 'North West',
      budget: 1000, spent: 500, progress: 40, status: 'Ongoing', images: [], flags: [],
    },
  ],
};

const renderGov = (locale = 'en') =>
  render(
    <I18nProvider initialLocale={locale}>
      <MemoryRouter>
        <Governance />
      </MemoryRouter>
    </I18nProvider>
  );

const renderEntity = (code = 'NW', locale = 'en') =>
  render(
    <I18nProvider initialLocale={locale}>
      <MemoryRouter initialEntries={[`/entity/${code}`]}>
        <Routes>
          <Route path="/entity/:code" element={<EntityPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  api.getEntities.mockResolvedValue({ success: true, data: TREE });
  api.getEntity.mockResolvedValue({ success: true, data: ENTITY });
});

describe('Governance browser', () => {
  it('renders regions with council counts and ministries with project counts', async () => {
    renderGov();
    await waitFor(() => expect(screen.getByText('North-West')).toBeInTheDocument());
    expect(screen.getByText('1 council')).toBeInTheDocument();
    expect(screen.getByText('Ministry of Public Works')).toBeInTheDocument();
    expect(screen.getByText('4 projects')).toBeInTheDocument();
  });

  it('shows entity names in French when the reader is francophone', async () => {
    renderGov('fr');
    await waitFor(() => expect(screen.getByText('Nord-Ouest')).toBeInTheDocument());
    expect(screen.getByText('Ministère des Travaux publics')).toBeInTheDocument();
    expect(screen.queryByText('North-West')).not.toBeInTheDocument();
  });

  it('states that the council list is still being verified', async () => {
    // The honesty note is part of the page contract, not decoration: shipping an
    // incomplete official register without saying so is how trust is lost.
    renderGov();
    await waitFor(() =>
      expect(screen.getByText(/checked against the official register/i)).toBeInTheDocument()
    );
  });

  it('survives an API failure with an explanation instead of a blank page', async () => {
    api.getEntities.mockRejectedValue(new Error('down'));
    renderGov();
    await waitFor(() => expect(screen.getByText(/institution not found/i)).toBeInTheDocument());
  });
});

describe('Entity page', () => {
  it('renders the profile with its councils and projects', async () => {
    renderEntity();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'North-West' })).toBeInTheDocument()
    );
    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(screen.getByText('Bamenda I')).toBeInTheDocument();
    expect(screen.getByText('Ring Road Section 4')).toBeInTheDocument();
  });

  it('renders French names and type labels for francophone readers', async () => {
    renderEntity('NW', 'fr');
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Nord-Ouest' })).toBeInTheDocument()
    );
    expect(screen.getByText('Région')).toBeInTheDocument();
  });

  it('explains an unknown code instead of rendering nothing', async () => {
    api.getEntity.mockResolvedValue({ success: false, error: 'Entity not found' });
    renderEntity('NOPE');
    await waitFor(() => expect(screen.getByText(/institution not found/i)).toBeInTheDocument());
  });

  it('shows the empty state when a body has no projects yet', async () => {
    api.getEntity.mockResolvedValue({ success: true, data: { ...ENTITY, projects: [] } });
    renderEntity();
    await waitFor(() =>
      expect(screen.getByText(/no projects recorded for this body yet/i)).toBeInTheDocument()
    );
  });
});
