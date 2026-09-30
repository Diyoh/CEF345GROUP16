/**
 * MAIN APP COMPONENT
 *
 * Routing note: the admin and developer surfaces moved from single pages to nested
 * routes under their own shell (docs/design/02-ia-ux.md section 3.3). Every previously
 * working path still works: /admin and /dev-admin redirect to their first section.
 */

import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ToastProvider } from './components/ui';
import { I18nProvider } from './i18n';
import { UserRole } from './types';

import { Home } from './pages/Home';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetails } from './pages/ProjectDetails';
import { Developers } from './pages/Developers';
import { Governance } from './pages/Governance';
import { Money } from './pages/Money';
import { Ledger } from './pages/Ledger';
import { EntityPage } from './pages/EntityPage';
import { Login } from './pages/Login';
import { Skeleton, SkeletonRegion } from './components/ui';

/**
 * Staff pages load on demand. Citizens are nearly every visitor and never open
 * them, so they no longer pay for them in the first download on a metered
 * mobile connection.
 */
const staffPage = (load, name) => {
  const Page = lazy(() => load().then((m) => ({ default: m[name] })));
  const Staff = () => (
    <Suspense
      fallback={
        <SkeletonRegion label="Loading" className="p-6">
          <Skeleton className="h-64 w-full rounded-lg" />
        </SkeletonRegion>
      }
    >
      <Page />
    </Suspense>
  );
  Staff.displayName = `Staff(${name})`;
  return Staff;
};

const ContractorDashboard = staffPage(() => import('./pages/ContractorDashboard'), 'ContractorDashboard');
const AdminOverview = staffPage(() => import('./pages/admin/AdminOverview'), 'AdminOverview');
const AdminProjects = staffPage(() => import('./pages/admin/AdminProjects'), 'AdminProjects');
const AdminContractors = staffPage(() => import('./pages/admin/AdminContractors'), 'AdminContractors');
const AdminReports = staffPage(() => import('./pages/admin/AdminReports'), 'AdminReports');
const DevAccess = staffPage(() => import('./pages/admin/DevAccess'), 'DevAccess');
const DevTeam = staffPage(() => import('./pages/admin/DevTeam'), 'DevTeam');
const DeskProjects = staffPage(() => import('./pages/desk/DeskProjects'), 'DeskProjects');
const VerificationQueue = staffPage(() => import('./pages/desk/VerificationQueue'), 'VerificationQueue');
const DeskFinance = staffPage(() => import('./pages/desk/DeskFinance'), 'DeskFinance');
const MinfiAllocations = staffPage(() => import('./pages/desk/MinfiAllocations'), 'MinfiAllocations');

const App = () => {
  return (
    /* I18nProvider is outermost: it sets <html lang> and the number/date formatters, which
       every other provider's children depend on being correct from the first paint. */
    <I18nProvider>
      <AppProvider>
        {/* Toasts replace the blocking "saved successfully" modal, so the live regions have
            to exist from mount rather than being inserted at announcement time. */}
        <ToastProvider>
        <HashRouter>
          <Routes>
            {/* Public portal and the contractor surface share the public shell. */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="project/:id" element={<ProjectDetails />} />
              <Route path="governance" element={<Governance />} />
              <Route path="money" element={<Money />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="entity/:code" element={<EntityPage />} />
              <Route path="developers" element={<Developers />} />
              <Route path="login" element={<Login />} />
              <Route path="contractor" element={<ContractorDashboard />} />
            </Route>

            {/* Admin: sidebar shell, role guard in the layout. */}
            <Route path="/admin" element={<AdminLayout role={UserRole.ADMIN} variant="admin" title="Admin" />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<AdminOverview />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="contractors" element={<AdminContractors />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>

            {/* Entity desk: council and ministry administrators. */}
            <Route
              path="/desk"
              element={<AdminLayout role={UserRole.ENTITY_ADMIN} variant="entity" title="Desk" />}
            >
              <Route index element={<Navigate to="projects" replace />} />
              <Route path="projects" element={<DeskProjects />} />
              <Route path="verification" element={<VerificationQueue />} />
              <Route path="finance" element={<DeskFinance />} />
              <Route path="allocations" element={<MinfiAllocations />} />
            </Route>

            {/* Developer control panel. */}
            <Route
              path="/dev-admin"
              element={<AdminLayout role={UserRole.DEVELOPER_ADMIN} variant="dev" title="Developer" />}
            >
              <Route index element={<Navigate to="access" replace />} />
              <Route path="access" element={<DevAccess />} />
              <Route path="team" element={<DevTeam />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
        </ToastProvider>
      </AppProvider>
    </I18nProvider>
  );
};

export default App;
