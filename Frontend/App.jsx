/**
 * MAIN APP COMPONENT
 * This is the root component of the React Application.
 * It sets up the Router (navigation) and provides the Global Store to all pages.
 */

import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom'; // Using HashRouter for easier file-based deployment compatibility
import { AppProvider } from './store'; // The global state provider
import { Layout } from './components/Layout'; // The wrapper with Navbar and Footer

// Import Pages (The views of our app)
import { Home } from './pages/Home';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetails } from './pages/ProjectDetails';
import { Developers } from './pages/Developers';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { ContractorDashboard } from './pages/ContractorDashboard';
import { DeveloperDashboard } from './pages/DeveloperDashboard';

const App = () => {
    return (
        // AppProvider: WRAPS everything so all components can access 'user', 'projects', etc.
        <AppProvider>
            {/* HashRouter: Handles URL changes (e.g., /#/login) without needing server config */}
            <HashRouter>
                <Routes>
                    {/* Parent Route: Layout contains the Navbar and Footer */}
                    <Route path="/" element={<Layout />}>
                        
                        {/* Public Routes: Accessible by everyone */}
                        <Route index element={<Home />} /> {/* Homepage */}
                        <Route path="projects" element={<ProjectsPage />} />
                        <Route path="project/:id" element={<ProjectDetails />} /> {/* Dynamic Route: :id changes */}
                        <Route path="developers" element={<Developers />} />
                        <Route path="login" element={<Login />} />

                        {/* Protected Routes (Logic handled inside components for simplicity in this demo) */}
                        {/* Users are redirected if they try to access these without the right role */}
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
