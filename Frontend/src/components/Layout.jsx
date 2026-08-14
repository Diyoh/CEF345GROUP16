import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

/**
 * `#main` is the skip-link target and is focusable so keyboard users land inside the
 * content rather than at the top of the document.
 */
export const Layout = () => (
  <div className="flex min-h-screen flex-col bg-canvas">
    <Navbar />
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      <Outlet />
    </main>
    <Footer />
  </div>
);
