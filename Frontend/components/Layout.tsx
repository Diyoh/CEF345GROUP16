import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

// Layout wrapper to ensure Navbar/Footer are always present
export const Layout: React.FC = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <main className="flex-grow bg-gray-50">
      <Outlet />
    </main>
    <Footer />
  </div>
);