import React, { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

/**
 * Five customer tasks, with specialised evidence tools placed behind a
 * secondary disclosure. Route guards remain authoritative for access.
 */
const links = [
  { to: '/app/overview', label: 'Overview', group: 'Start' },
  {
    to: '/app/employees',
    label: 'Organisation & teams',
    group: 'Start',
    roles: ['master_admin', 'admin', 'hr_admin'],
  },
  {
    to: '/app/control-reviews',
    label: 'Actions & reviews',
    group: 'Start',
    roles: ['master_admin', 'admin', 'hr_admin', 'org_admin', 'compliance', 'executive'],
  },
  {
    to: '/app/latest-brief',
    label: 'Reports',
    group: 'Start',
    roles: ['master_admin', 'admin', 'hr_admin', 'executive'],
  },
  { to: '/app/signal-coverage', label: 'Settings & access', group: 'Start' },
  { to: '/app/signals', label: 'Work-pattern evidence', group: 'Explore', secondary: true },
  { to: '/app/active-monitoring', label: 'Pattern history', group: 'Explore', secondary: true },
  { to: '/app/actions', label: 'Action records', group: 'Explore', secondary: true },
  {
    to: '/app/work-network',
    label: 'How teams work together',
    group: 'Explore',
    secondary: true,
    roles: ['master_admin', 'admin', 'hr_admin', 'org_admin', 'executive'],
  },
  {
    to: '/app/executive-summary',
    label: 'Leadership summary',
    group: 'Explore',
    secondary: true,
    roles: ['master_admin', 'admin', 'hr_admin', 'executive'],
  },
  {
    to: '/integrations',
    label: 'Microsoft and other connections',
    group: 'Settings',
    secondary: true,
    roles: ['master_admin', 'admin', 'hr_admin', 'it_admin'],
  },
  {
    to: '/app/admin/manager-reporting',
    label: 'Manager access & invitations',
    group: 'Settings',
    secondary: true,
    roles: ['master_admin', 'admin', 'hr_admin', 'org_admin'],
  },
  { to: '/app/privacy', label: 'Data policy', group: 'Settings', secondary: true },
  {
    to: '/app/trust-pack',
    label: 'Trust pack',
    group: 'Settings',
    secondary: true,
    roles: ['master_admin', 'admin', 'hr_admin', 'org_admin', 'it_admin', 'compliance'],
  },
  {
    to: '/app/site-analytics',
    label: 'Site analytics',
    group: 'Settings',
    secondary: true,
    roles: ['master_admin'],
  },
];
const managerLinks = [
  { to: '/app/manager', label: 'My team', group: 'Start' },
  { to: '/app/manager#actions', label: 'Actions & reviews', group: 'Start' },
  { to: '/app/manager#reports', label: 'Reports', group: 'Start' },
];

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="app-page-header">
      <div>
        {eyebrow && <p className="app-eyebrow">{eyebrow}</p>}
        <h1 className="app-page-title">{title}</h1>
        {description && <p className="app-page-description">{description}</p>}
      </div>
      {action && <div className="app-page-action">{action}</div>}
    </div>
  );
}

export default function AppShell({ children, user, section, width = 'wide', mode = 'hr' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationRef = useRef(null);
  const isImpersonating = Boolean(localStorage.getItem('impersonation_token'));

  const visibleLinks = (mode === 'manager' ? managerLinks : links).filter(
    (link) =>
      (mode === 'manager' ||
        !link.adminOnly ||
        ['master_admin', 'admin', 'hr_admin'].includes(user?.role)) &&
      (mode === 'manager' || !link.roles || link.roles.includes(user?.role))
  );
  const secondaryLinks = visibleLinks.filter((link) => link.secondary);
  // Keep the settings group open when the current page lives inside it, so the
  // active item is never hidden behind a closed disclosure.
  const isOnSecondaryPage = secondaryLinks.some((link) => location.pathname.startsWith(link.to));

  useEffect(() => {
    if (!window.matchMedia('(max-width: 1040px)').matches) return;

    navigationRef.current
      ?.querySelector('.app-nav-link.is-active')
      ?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
  }, [location.pathname]);

  const returnToSuperadmin = () => {
    const originalToken = localStorage.getItem('impersonation_token');
    if (originalToken) {
      localStorage.setItem('token', originalToken);
    }
    localStorage.removeItem('impersonation_token');
    localStorage.removeItem('impersonation_org');
    localStorage.removeItem('user');
    navigate('/superadmin');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('orgId');
    localStorage.removeItem('teamId');
    localStorage.removeItem('impersonation_token');
    localStorage.removeItem('impersonation_org');
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-inner">
          <Link to={mode === 'manager' ? '/app/manager' : '/app/overview'} className="app-brand">
            <span className="app-brand-mark" aria-hidden="true">
              ST
            </span>
            <span className="font-display font-bold tracking-tight">SignalTrue</span>
          </Link>
          <nav ref={navigationRef} className="app-navigation" aria-label="Application navigation">
            {visibleLinks
              .filter((link) => !link.secondary)
              .map((link, index, primaryLinks) => (
                <React.Fragment key={link.to}>
                  {(index === 0 || primaryLinks[index - 1]?.group !== link.group) && (
                    <span className="app-nav-group">{link.group}</span>
                  )}
                  <NavLink
                    to={link.to}
                    className={({ isActive }) => {
                      const active =
                        mode === 'manager'
                          ? location.hash ===
                            (link.to.includes('#') ? '#' + link.to.split('#')[1] : '')
                          : isActive;
                      return 'app-nav-link ' + (active ? 'is-active' : '');
                    }}
                  >
                    {link.label}
                  </NavLink>
                </React.Fragment>
              ))}

            {mode !== 'manager' && secondaryLinks.length > 0 && (
              <details className="app-nav-secondary" open={isOnSecondaryPage}>
                <summary className="app-nav-group app-nav-summary">
                  Additional tools and settings
                </summary>
                {/* A details element slots everything after the summary into a
                    single anonymous box, so flex on the details itself does not
                    reach these links. They need their own container. */}
                <div className="app-nav-secondary-links">
                  {secondaryLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''}`}
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              </details>
            )}
          </nav>
          <div className="app-account">
            {section && <span className="app-section-pill">{section}</span>}
            {user && <span className="app-user-name">{user.name || user.email}</span>}
            {user && (
              <button type="button" className="app-logout" onClick={logout}>
                Log out
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="app-workspace">
        {isImpersonating && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-700 px-5 py-2.5 text-caption font-semibold text-white">
            <span>
              Viewing as {localStorage.getItem('impersonation_org') || 'client organization'}.
              Superadmin impersonation is active.
            </span>
            <button
              type="button"
              className="rounded-control bg-white px-3 py-1.5 text-caption font-bold text-amber-800"
              onClick={returnToSuperadmin}
            >
              Return to Superadmin
            </button>
          </div>
        )}
        <main className={`app-main app-main-${width}`}>
          <div className="app-privacy-bar">
            <strong>Team-level evidence, not employee scoring.</strong> SignalTrue separates
            observed work patterns from interpretation. Worker consultation and human judgement
            remain part of the review; the product does not diagnose health or establish cause.
            <Link to={mode === 'manager' ? '/privacy' : '/app/privacy'}>View data policy</Link>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
