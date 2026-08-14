import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/**
 * Smoke tests: every refactored page must render without throwing, with realistic data
 * AND with the empty/undefined shapes the API actually returns (missing images array,
 * missing dates, zero budget). A build passing only proves it compiles.
 */

const project = {
  id: 'p1',
  title: 'Yaoundé-Douala Highway Phase 2',
  description: 'Construction of the remaining 60km section.',
  location: 'Edéa',
  region: 'Littoral',
  budget: 85000000000,
  spent: 45000000000,
  progress: 55,
  status: 'Ongoing',
  contractorId: 'u2',
  contractorName: 'BTP Cameroun S.A.',
  startDate: '2023-01-15',
  completionDate: '2026-06-30',
  images: ['/pictures/a.jpg', '/pictures/b.jpg'],
  updates: [{ id: 'up1', date: '2023-11-20', message: 'Foundation complete.', author: 'Site Manager' }],
};

// The shape that used to crash ProjectCard: no images array, no dates, zero budget.
const sparseProject = {
  id: 'p2',
  title: 'Untitled works',
  location: 'Maroua',
  status: 'Planned',
  budget: 0,
  spent: 0,
  progress: 0,
};

const store = {
  projects: [project, sparseProject],
  comments: [
    { id: 'c1', projectId: 'p1', authorName: 'Ada', authorType: 'Citizen', text: 'Work has stopped.', images: [], date: '2024-01-02' },
  ],
  teamMembers: [{ id: 't1', name: 'Dev Lead', role: 'Engineering', bio: 'Builds things.', imageUrl: '/x.jpg' }],
  contractors: [{ id: 'u2', name: 'BTP Cameroun S.A.' }],
  accessCodes: [],
  user: null,
  loading: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  addComment: vi.fn(),
  fetchProjectComments: vi.fn(),
  // ProjectDetails loads the full record on mount: the change log and narrative updates
  // come only from the detail endpoint, not from the list used at boot.
  fetchProject: vi.fn().mockResolvedValue({ success: true }),
  updateProject: vi.fn(),
  addProject: vi.fn(),
  deleteComment: vi.fn(),
  generateAccessCode: vi.fn(),
  updateTeamMember: vi.fn(),
  fetchContractorStats: vi.fn().mockResolvedValue(null),
};

vi.mock('../useAppStore', () => ({ useAppStore: () => store }));

import { Home } from '../pages/Home';
import { ProjectsPage } from '../pages/ProjectsPage';
import { ProjectDetails } from '../pages/ProjectDetails';
import { Login } from '../pages/Login';
import { Developers } from '../pages/Developers';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ProjectCard } from '../components/ProjectCard';
import { I18nProvider } from '../i18n';

const errors = [];
beforeEach(() => {
  errors.length = 0;
  vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args.join(' ')));
});
afterEach(() => vi.restoreAllMocks());

const renderAt = (ui, path = '/') =>
  render(<I18nProvider><MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter></I18nProvider>);

describe('page smoke tests', () => {
  it('Home renders the hero and the totals', () => {
    renderAt(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(errors).toEqual([]);
  });

  it('ProjectsPage renders and reports the result count', () => {
    renderAt(<ProjectsPage />, '/projects');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(errors).toEqual([]);
  });

  it('ProjectDetails renders the build against spend panel', () => {
    renderAt(
      <Routes>
        <Route path="/project/:id" element={<ProjectDetails />} />
      </Routes>,
      '/project/p1'
    );
    expect(screen.getByRole('heading', { name: /build against spend/i })).toBeInTheDocument();
    expect(errors).toEqual([]);
  });

  it('ProjectDetails handles an unknown id without throwing', () => {
    renderAt(
      <Routes>
        <Route path="/project/:id" element={<ProjectDetails />} />
      </Routes>,
      '/project/does-not-exist'
    );
    expect(screen.getByText(/project not found/i)).toBeInTheDocument();
  });

  it('ProjectCard survives a project with no images array', () => {
    renderAt(<ProjectCard project={sparseProject} />);
    expect(screen.getByText('Untitled works')).toBeInTheDocument();
    expect(errors).toEqual([]);
  });

  it('Login renders with labelled inputs', () => {
    renderAt(<Login />, '/login');
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(errors).toEqual([]);
  });

  it('Developers renders the team', () => {
    renderAt(<Developers />, '/developers');
    expect(screen.getByText('Dev Lead')).toBeInTheDocument();
    expect(errors).toEqual([]);
  });

  it('Navbar and Footer render', () => {
    renderAt(
      <>
        <Navbar />
        <Footer />
      </>
    );
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
    expect(errors).toEqual([]);
  });
});
