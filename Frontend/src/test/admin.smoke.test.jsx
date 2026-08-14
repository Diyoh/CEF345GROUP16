import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ui';

/**
 * Admin and contractor surfaces must render without throwing, including the components
 * that previously crashed: ProjectModal (undefined makeMainImage) and
 * ContractorProjectCard (project.images read unconditionally).
 */

const project = {
  id: 'p1',
  title: 'Ring Road Section 4',
  location: 'Bamenda',
  region: 'North West',
  budget: 12000000000,
  spent: 11400000000,
  progress: 30,
  status: 'Ongoing',
  contractorId: 'u2',
  contractorName: 'BTP Cameroun S.A.',
  completionDate: '2020-01-01',
  images: ['/a.jpg'],
};

const noImagesProject = { ...project, id: 'p2', title: 'No photos yet', images: undefined };

const store = {
  projects: [project, noImagesProject],
  comments: [{ id: 'c1', projectId: 'p1', authorName: 'Ada', authorType: 'NGO', text: 'Stalled.', date: '2024-01-01' }],
  contractors: [{ id: 'u2', name: 'BTP Cameroun S.A.', email: 'a@b.cm' }],
  accessCodes: [{ code: 'ABC-123', role: 'CONTRACTOR', isUsed: false, generatedBy: 'dev' }],
  teamMembers: [{ id: 't1', name: 'Dev Lead', role: 'Engineering', bio: 'x', imageUrl: '/x.jpg' }],
  user: { id: 'u2', name: 'BTP Cameroun S.A.', role: 'CONTRACTOR' },
  // The session check has completed. Guards refuse to decide before this is true, because
  // `user` is null until getMe() returns and a guard reading it alone reports every
  // visitor as logged out.
  authChecked: true,
  loading: false,
  error: null,
  updateProject: vi.fn(),
  addProjectUpdate: vi.fn().mockResolvedValue({ success: true }),
  addProject: vi.fn(),
  deleteComment: vi.fn(),
  fetchContractors: vi.fn(),
  fetchContractorStats: vi.fn().mockResolvedValue(null),
  generateAccessCode: vi.fn(),
  updateTeamMember: vi.fn(),
  changePassword: vi.fn(),
  logout: vi.fn(),
};

vi.mock('../useAppStore', () => ({ useAppStore: () => store }));

import { ContractorDashboard } from '../pages/ContractorDashboard';
import { ProjectTable } from '../components/dashboard/ProjectTable';
import { ProjectModal } from '../components/dashboard/ProjectModal';
import { FinancialChart } from '../components/dashboard/FinancialChart';
import { AccessCodeManager } from '../components/dashboard/AccessCodeManager';
import { CommentManager } from '../components/dashboard/CommentManager';
import { I18nProvider } from '../i18n';

const errors = [];
beforeEach(() => {
  errors.length = 0;
  vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args.join(' ')));
});
afterEach(() => vi.restoreAllMocks());

const renderApp = (ui) =>
  render(
    <I18nProvider><MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter></I18nProvider>
  );

describe('admin and contractor smoke tests', () => {
  it('ContractorDashboard renders assigned projects', () => {
    renderApp(<ContractorDashboard />);
    expect(screen.getByRole('heading', { name: /your projects/i })).toBeInTheDocument();
    expect(screen.getByText('No photos yet')).toBeInTheDocument();
    expect(errors).toEqual([]);
  });

  it('ContractorDashboard waits for the session check instead of showing logged-out', () => {
    // Before this, a guard reading `user` alone redirected on every page load, so
    // refreshing the dashboard bounced an authenticated contractor to the login screen —
    // for up to ~30s on a Render cold start, long enough to retype credentials.
    store.authChecked = false;
    try {
      renderApp(<ContractorDashboard />);
      // Queried by text, not by role name: `status` is not a name-from-content role, and
      // ToastProvider renders a second role="status" region, so getByRole is ambiguous.
      const pending = screen.getByText(/checking your session/i);
      expect(pending).toBeInTheDocument();
      expect(pending.closest('[role="status"]')).not.toBeNull();
      expect(screen.queryByRole('heading', { name: /your projects/i })).not.toBeInTheDocument();
      expect(errors).toEqual([]);
    } finally {
      store.authChecked = true;
    }
  });

  it('ProjectTable renders both the table and the mobile list', () => {
    renderApp(<ProjectTable projects={[project, noImagesProject]} onEdit={vi.fn()} />);
    expect(screen.getAllByText('Ring Road Section 4').length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  it('ProjectModal renders without the undefined makeMainImage crash', () => {
    renderApp(
      <ProjectModal
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        editingProject={project}
        contractors={store.contractors}
      />
    );
    expect(screen.getByLabelText(/project title/i)).toBeInTheDocument();
    expect(screen.getByText('Cover')).toBeInTheDocument();
    expect(errors).toEqual([]);
  });

  it('FinancialChart renders and states its finding', () => {
    renderApp(<FinancialChart projects={[project, noImagesProject]} />);
    // The phrase appears twice by design: the chart title and the caption of the hidden
    // data table that is the accessible alternative.
    expect(screen.getByRole('heading', { name: /budget against spend/i })).toBeInTheDocument();
    expect(screen.getByText(/spending faster than they are building/i)).toBeInTheDocument();
    expect(errors).toEqual([]);
  });

  it('FinancialChart handles an empty portfolio', () => {
    renderApp(<FinancialChart projects={[]} />);
    expect(screen.getByText(/no projects with a recorded budget/i)).toBeInTheDocument();
  });

  it('AccessCodeManager renders the generator and the issued codes', () => {
    renderApp(<AccessCodeManager accessCodes={store.accessCodes} onGenerate={vi.fn()} />);
    expect(screen.getByRole('button', { name: /generate code/i })).toBeInTheDocument();
    expect(screen.getByText('ABC-123')).toBeInTheDocument();
    expect(errors).toEqual([]);
  });

  it('CommentManager renders reports', () => {
    renderApp(<CommentManager comments={store.comments} onDelete={vi.fn()} />);
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(errors).toEqual([]);
  });
});
