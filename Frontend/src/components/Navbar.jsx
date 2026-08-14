import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../useAppStore';
import { UserRole } from '../types';
import { Button, cn } from './ui';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { useT } from '../i18n';

/**
 * Navbar. Spec: docs/design/03-components.md section 11.
 *
 * The saturated green bar and 4px yellow border are gone. A saturated bar across the top
 * of every page spends the loudest colour in the system on chrome, which leaves nothing
 * louder for the data. Green now lives in the wordmark and the accent; yellow is retired
 * from chrome entirely and reserved for the "delayed" status.
 *
 * Login is demoted from a yellow filled button to a quiet link: roughly one visitor in a
 * thousand signs in, and the strongest affordance on the page belongs to the primary task.
 *
 * The mobile menu gains what it did not have: focus trap, aria-expanded, Escape to close,
 * scroll lock, and focus returned to the trigger.
 */

const DASHBOARD_BY_ROLE = {
  [UserRole.ADMIN]: { to: '/admin', labelKey: 'nav.adminDashboard' },
  [UserRole.CONTRACTOR]: { to: '/contractor', labelKey: 'nav.myProjects' },
  [UserRole.DEVELOPER_ADMIN]: { to: '/dev-admin', labelKey: 'nav.developerPanel' },
};

const linkClass = ({ isActive }) =>
  cn(
    'relative py-1 text-body font-medium transition-colors duration-instant',
    isActive
      ? 'text-fg after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-accent'
      : 'text-fg-secondary hover:text-fg'
  );

export const Navbar = () => {
  const t = useT();
  const { user, logout } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  const dashboard = user ? DASHBOARD_BY_ROLE[user.role] : null;

  // Route change closes the menu, so back/forward never leaves it hanging open.
  useEffect(() => setIsMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [isMenuOpen]);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
      <a href="#main" className="skip-link">
        {t('nav.skipToContent')}
      </a>

      <nav aria-label="Primary" className="mx-auto flex h-14 max-w-content items-center justify-between gap-4 px-4 md:h-16 md:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-fill text-accent-fg">
            <i className="fas fa-helmet-safety" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-body font-semibold tracking-tight text-fg">BuildRight</span>
            <span className="text-overline uppercase text-fg-tertiary">Cameroon</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <NavLink to="/projects" className={linkClass}>
            {t('nav.projects')}
          </NavLink>
          <NavLink to="/developers" className={linkClass}>
            {t('nav.about')}
          </NavLink>

          <div className="ml-1 flex items-center gap-2 border-l border-line pl-5">
            <LanguageToggle className="mr-1" />
          <ThemeToggle />
            {user ? (
              <>
                {dashboard && (
                  <Button as={Link} to={dashboard.to} variant="secondary" size="sm">
                    {t(dashboard.labelKey)}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  {t('nav.signOut')}
                </Button>
              </>
            ) : (
              <Button as={Link} to="/login" variant="ghost" size="sm">
                Staff sign in
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Button
            ref={triggerRef}
            variant="ghost"
            size="md"
            iconOnly
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            leadingIcon={<i className={isMenuOpen ? 'fas fa-xmark' : 'fas fa-bars'} aria-hidden="true" />}
          />
        </div>
      </nav>

      {isMenuOpen && (
        <div
          id="mobile-menu"
          ref={menuRef}
          className="animate-fade-in border-t border-line bg-canvas px-4 py-4 md:hidden"
        >
          <div className="flex flex-col gap-1">
            <NavLink to="/projects" className="rounded-sm px-2 py-3 text-body font-medium text-fg hover:bg-sunken">
              {t('nav.projects')}
            </NavLink>
            <NavLink to="/developers" className="rounded-sm px-2 py-3 text-body font-medium text-fg hover:bg-sunken">
              {t('nav.about')}
            </NavLink>
          </div>

          <div className="mt-4 border-t border-line pt-4">
            {user ? (
              <div className="flex flex-col gap-3">
                <p className="text-caption text-fg-tertiary">
                  Signed in as <span className="font-medium text-fg">{user.name}</span>
                </p>
                {dashboard && (
                  <Button as={Link} to={dashboard.to} variant="secondary" size="lg" fullWidth>
                    {t(dashboard.labelKey)}
                  </Button>
                )}
                <Button variant="ghost" size="lg" fullWidth onClick={handleLogout}>
                  {t('nav.signOut')}
                </Button>
              </div>
            ) : (
              <Button as={Link} to="/login" variant="secondary" size="lg" fullWidth>
                Staff sign in
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
