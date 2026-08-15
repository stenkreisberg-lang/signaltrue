import React, { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

const links = [
  { to: '/app/overview', label: 'Overview', group: 'Today' },
  {
    to: '/app/latest-brief',
    label: 'Weekly Brief',
    group: 'Today',
    roles: ['master_admin', 'admin', 'hr_admin', 'executive'],
  },
  { to: '/app/active-monitoring', label: 'Priority Signals', group: 'Investigate' },
  { to: '/app/signals', label: 'All Signals', group: 'Investigate' },
  { to: '/app/actions', label: 'Corrective Actions', group: 'Improve' },
  { to: '/app/signal-coverage', label: 'Coverage', group: 'Setup & governance' },
  {
    to: '/integrations',
    label: 'Data Sources',
    group: 'Setup & governance',
    roles: ['master_admin', 'admin', 'hr_admin', 'it_admin'],
  },
  {
    to: '/app/work-network',
    label: 'Work Network',
    group: 'Investigate',
    roles: ['master_admin', 'admin', 'hr_admin', 'org_admin', 'executive'],
  },
  { to: '/app/employees', label: 'Team Setup', group: 'Setup & governance', adminOnly: true },
  { to: '/app/privacy', label: 'Data Policy', group: 'Setup & governance' },
  {
    to: '/app/site-analytics',
    label: 'Site Analytics',
    group: 'Operations',
    roles: ['master_admin'],
  },
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

export default function AppShell({ children, user, section, width = 'wide' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationRef = useRef(null);
  const isImpersonating = Boolean(localStorage.getItem('impersonation_token'));

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
          <Link to="/app/overview" className="app-brand">
            <span className="app-brand-mark" />
            SignalTrue
          </Link>
          <nav ref={navigationRef} className="app-navigation" aria-label="Application navigation">
            {links
              .filter(
                (link) =>
                  (!link.adminOnly || ['master_admin', 'admin', 'hr_admin'].includes(user?.role)) &&
                  (!link.roles || link.roles.includes(user?.role))
              )
              .map((link, index, visibleLinks) => (
                <React.Fragment key={link.to}>
                  {(index === 0 || visibleLinks[index - 1]?.group !== link.group) && (
                    <span className="app-nav-group">{link.group}</span>
                  )}
                  <NavLink
                    to={link.to}
                    className={({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''}`}
                  >
                    {link.label}
                  </NavLink>
                </React.Fragment>
              ))}
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
          <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white">
            <span>
              Viewing as {localStorage.getItem('impersonation_org') || 'client organization'}.
              Superadmin impersonation is active.
            </span>
            <button
              type="button"
              className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-amber-800"
              onClick={returnToSuperadmin}
            >
              Return to Superadmin
            </button>
          </div>
        )}
        <main className={`app-main app-main-${width}`}>
          <div className="app-privacy-bar">
            <strong>Use with consultation.</strong> Signals support workplace risk review; they do
            not diagnose health, establish cause or rank individual performance.
            <Link to="/app/privacy">View data policy</Link>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
