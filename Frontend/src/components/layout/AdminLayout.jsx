import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../useAppStore';
import { Button, cn } from '../ui';
import { ThemeToggle } from '../ThemeToggle';
import { LanguageToggle } from '../LanguageToggle';
import { ChangePasswordModal } from '../ChangePasswordModal';
import { AuthPending } from '../AuthPending';
import { useT } from '../../i18n';

/**
 * Admin and developer shell. Spec: docs/design/02-ia-ux.md section 3.3.
 *
 * Replaces the single long scroll where the project table, the admin's primary work
 * object, sat below a chart, a comment feed and a contractor list. Each section is now a
 * route, so moving between them is one click instead of a full-page scroll, and each
 * section keeps its own scroll position.
 *
 * The role guard lives here rather than being repeated in every section component.
 */

export const Sidebar = ({ sections, title, open, onClose, user, onChangePassword, onLogout }) => {
  // Sidebar is exported separately, so it needs its own hook — it does not inherit `t`
  // from AdminLayout.
  const t = useT();

  return (
  <>
    {/* Mobile drawer scrim */}
    {open && (
      <div
        className="fixed inset-0 z-40 bg-[rgb(var(--overlay)/0.55)] lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
    )}

    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-line bg-surface',
        'transition-transform duration-base ease-standard lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-14 items-center gap-2.5 border-b border-line px-4 md:h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-fill text-accent-fg">
            <i className="fas fa-helmet-safety" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-body font-semibold text-fg">BuildRight</span>
            <span className="text-overline uppercase text-fg-tertiary">{title}</span>
          </span>
        </Link>
      </div>

      <nav aria-label={t('admin.sectionsFor', { title })} className="flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-0.5">
          {sections.map((s) => (
            <li key={s.to}>
              <NavLink
                to={s.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-body transition-colors duration-instant',
                    isActive
                      ? 'bg-canvas font-medium text-fg before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-accent'
                      : 'text-fg-secondary hover:bg-sunken hover:text-fg'
                  )
                }
              >
                <i className={cn('fas w-4 text-center text-fg-tertiary', s.icon)} aria-hidden="true" />
                {t(s.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-line p-3">
        {/* Account actions live here BELOW lg only.
            On a 360px screen the header could not hold a hamburger, two toggles and two
            text buttons — "Change password" is already long and becomes "Changer le mot de
            passe" in French — so the row overflowed the viewport. The drawer is reachable
            from the hamburger and has room, and these are infrequent actions that do not
            need to occupy the top bar on a phone.
            Hidden from lg up, where the sidebar is permanent and the header shows them. */}
        {user && (
          <div className="mb-2 flex flex-col gap-0.5 border-b border-line-subtle pb-2 lg:hidden">
            <p className="truncate px-3 py-1 text-caption text-fg-tertiary" title={user.name}>
              {user.name}
            </p>
            <button
              type="button"
              onClick={onChangePassword}
              className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-left text-caption text-fg-secondary hover:bg-sunken hover:text-fg"
            >
              <i className="fas fa-key w-4 text-center" aria-hidden="true" />
              {t('admin.changePassword')}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-left text-caption text-fg-secondary hover:bg-sunken hover:text-fg"
            >
              <i className="fas fa-right-from-bracket w-4 text-center" aria-hidden="true" />
              {t('nav.signOut')}
            </button>
          </div>
        )}

        <Link
          to="/"
          className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-caption text-fg-tertiary hover:bg-sunken hover:text-fg"
        >
          <i className="fas fa-arrow-up-right-from-square w-4 text-center" aria-hidden="true" />
          {t('nav.viewPublicSite')}
        </Link>
      </div>
    </aside>
  </>
  );
};

const SECTIONS = {
  admin: [
    { to: '/admin/overview', labelKey: 'admin.overview', icon: 'fa-chart-simple' },
    { to: '/admin/projects', labelKey: 'admin.projects', icon: 'fa-diagram-project' },
    { to: '/admin/contractors', labelKey: 'admin.contractors', icon: 'fa-people-group' },
    { to: '/admin/reports', labelKey: 'admin.citizenReports', icon: 'fa-comments' },
  ],
  dev: [
    { to: '/dev-admin/access', labelKey: 'admin.accessCodes', icon: 'fa-key' },
    { to: '/dev-admin/team', labelKey: 'admin.team', icon: 'fa-users' },
  ],
  entity: [
    { to: '/desk/projects', labelKey: 'admin.projects', icon: 'fa-diagram-project' },
    { to: '/desk/finance', labelKey: 'desk.finance', icon: 'fa-coins' },
  ],
};

export const AdminLayout = ({ role, variant = 'admin', title = 'Admin' }) => {
  const t = useT();
  const { user, logout, authChecked } = useAppStore();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  // Decide only once the session check has finished. Reading `user` before then reports
  // every visitor as logged out, including one holding a perfectly valid cookie.
  if (!authChecked) return <AuthPending />;
  if (!user || user.role !== role) return <Navigate to="/login" replace />;

  // The verification queue is a power, not a menu default: it appears only for
  // the ministry that holds it.
  const sections = variant === 'entity'
    ? [
        ...SECTIONS.entity,
        ...(user.entityCode === 'MINTP'
          ? [{ to: '/desk/verification', labelKey: 'admin.verification', icon: 'fa-user-check' }]
          : []),
        ...(user.entityCode === 'MINFI'
          ? [{ to: '/desk/allocations', labelKey: 'desk.allocations', icon: 'fa-money-bill-transfer' }]
          : []),
      ]
    : SECTIONS[variant];

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar
        sections={sections}
        title={variant === 'entity' ? user.entityCode || title : title}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        onChangePassword={() => {
          setDrawerOpen(false);
          setPasswordOpen(true);
        }}
        onLogout={logout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 min-w-0 items-center justify-between gap-2 border-b border-line bg-canvas px-3 md:h-16 md:gap-3 md:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="md"
              iconOnly
              className="lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-expanded={drawerOpen}
              aria-label={t('admin.openSections')}
              leadingIcon={<i className="fas fa-bars" aria-hidden="true" />}
            />
            <a href="#admin-main" className="skip-link">
              {t('nav.skipToContent')}
            </a>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            {/* Staff switch language too: a francophone administrator should not have to
                work in English, and the toggle living in only one shell meant crossing to
                the public site to change it. */}
            <LanguageToggle className="mr-1" />
            <ThemeToggle />
            <span className="hidden max-w-[16ch] truncate text-caption text-fg-tertiary lg:inline">
              {user.name}
            </span>
            {/* Below md these live in the drawer instead — see the Sidebar footer. Two text
                buttons plus two toggles cannot fit a 360px bar, and the labels grow in
                French. */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => setPasswordOpen(true)}
            >
              {t('admin.changePassword')}
            </Button>
            <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={logout}>
              {t('nav.signOut')}
            </Button>
          </div>
        </header>

        <main id="admin-main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          <div className="mx-auto max-w-admin px-4 py-6 md:px-6 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <ChangePasswordModal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
};

/** Page header used by every admin section, so the surfaces cannot drift apart. */
export const PageHeader = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
    <div>
      <h1 className="text-h1 text-fg">{title}</h1>
      {description && <p className="mt-1.5 text-body text-fg-secondary">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);
