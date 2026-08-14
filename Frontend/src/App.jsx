/**
 * MAIN APP COMPONENT
 *
 * Routing note: the admin and developer surfaces moved from single pages to nested
 * routes under their own shell (docs/design/02-ia-ux.md section 3.3). Every previously
 * working path still works: /admin and /dev-admin redirect to their first section.
 */

import React from 'react';
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
import { Login } from './pages/Login';
import { ContractorDashboard } from './pages/ContractorDashboard';

import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminProjects } from './pages/admin/AdminProjects';
import { AdminContractors } from './pages/admin/AdminContractors';
import { AdminReports } from './pages/admin/AdminReports';
import { DevAccess } from './pages/admin/DevAccess';
import { DevTeam } from './pages/admin/DevTeam';

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
