import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ProjectDetails } from './pages/ProjectDetails';
import { Developers } from './pages/Developers';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { ContractorDashboard } from './pages/ContractorDashboard';
import { DeveloperDashboard } from './pages/DeveloperDashboard';

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="project/:id" element={<ProjectDetails />} />
            <Route path="developers" element={<Developers />} />
            <Route path="login" element={<Login />} />
            
            {/* Protected Routes (Logic handled inside components for simplicity) */}
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="contractor" element={<ContractorDashboard />} />
            <Route path="dev-admin" element={<DeveloperDashboard />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
};

export default App;