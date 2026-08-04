import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

const links = [
  { to: '/app/overview', label: 'Overview' },
  {
    to: '/app/latest-brief',
    label: 'Latest Brief',
    roles: ['master_admin', 'admin', 'hr_admin', 'executive'],
  },
  { to: '/app/signals', label: 'Signals' },
  { to: '/app/active-monitoring', label: 'Monitoring' },
  { to: '/app/actions', label: 'Actions' },
  { to: '/app/signal-coverage', label: 'Data Coverage' },
  {
    to: '/app/work-network',
    label: 'Work Network',
    roles: ['master_admin', 'admin', 'hr_admin', 'org_admin', 'executive'],
  },
  { to: '/app/employees', label: 'Team Setup', adminOnly: true },
  { to: '/app/site-analytics', label: 'Site Analytics' },
  { to: '/app/validation', label: 'Validation' },
  { to: '/app/methodology', label: 'Methodology' },
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
  const isImpersonating = Boolean(localStorage.getItem('impersonation_token'));

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
          <nav className="app-navigation" aria-label="Application navigation">
            {links
              .filter(
                (link) =>
                  (!link.adminOnly || ['master_admin', 'admin', 'hr_admin'].includes(user?.role)) &&
                  (!link.roles || link.roles.includes(user?.role))
              )
              .map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''}`}
                >
                  {link.label}
                </NavLink>
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
            <strong>Privacy protected.</strong> Metadata only, aggregated at team level. No message
            content or individual performance ranking.
            <Link to="/app/privacy">View data policy</Link>
          </div>
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            <strong>Measurement note.</strong> Counts and durations are observed; ratios are
            derived. SignalTrue 0-100 indices and review bands are internal descriptive models, not
            validated probabilities, diagnoses, causal findings, or performance scores.{' '}
            <Link className="font-bold underline" to="/app/methodology">
              Methods and limits
            </Link>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
