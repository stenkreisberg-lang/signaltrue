import React, { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

/**
 * Navigation is ordered by the week's actual sequence — read what changed,
 * look into it, do something about it — rather than by feature area.
 *
 * Labels avoid near-duplicates: "Priority Signals" beside "All Signals", or
 * "Coverage" beside "Data Sources", asks the reader to work out a distinction
 * instead of pointing somewhere. Configuration is marked secondary and tucked
 * below, because it is visited during setup and rarely afterwards.
 */
const links = [
  { to: '/app/overview', label: 'Overview', group: 'This week' },
  {
    to: '/app/latest-brief',
    label: 'Weekly Brief',
    group: 'This week',
    roles: ['master_admin', 'admin', 'hr_admin', 'executive'],
  },
  { to: '/app/signals', label: 'Signals', group: 'Act' },
  { to: '/app/actions', label: 'Actions', group: 'Act' },
  {
    to: '/app/manager-coaching',
    label: 'Manager Coach',
    group: 'Act',
    roles: ['manager'],
  },
  {
    to: '/app/control-reviews',
    label: 'Control reviews',
    group: 'Act',
    roles: ['master_admin', 'admin', 'hr_admin', 'org_admin', 'compliance', 'executive', 'manager'],
  },
  { to: '/app/active-monitoring', label: 'Risk feed', group: 'Explore' },
  {
    to: '/app/work-network',
    label: 'Work Network',
    group: 'Explore',
    roles: ['master_admin', 'admin', 'hr_admin', 'org_admin', 'executive'],
  },
  {
    to: '/app/executive-summary',
    label: 'For leadership',
    group: 'Explore',
    roles: ['master_admin', 'admin', 'hr_admin', 'executive'],
  },
  {
    to: '/app/signal-coverage',
    label: 'What is measured',
    group: 'Settings',
    secondary: true,
  },
  {
    to: '/integrations',
    label: 'Connections',
    group: 'Settings',
    secondary: true,
    roles: ['master_admin', 'admin', 'hr_admin', 'it_admin'],
  },
  {
    to: '/app/employees',
    label: 'People and teams',
    group: 'Settings',
    secondary: true,
    adminOnly: true,
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

  const visibleLinks = links.filter(
    (link) =>
      (!link.adminOnly || ['master_admin', 'admin', 'hr_admin'].includes(user?.role)) &&
      (!link.roles || link.roles.includes(user?.role))
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
          <Link to="/app/overview" className="app-brand">
            <span className="app-brand-mark" />
            SignalTrue
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
                    className={({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''}`}
                  >
                    {link.label}
                  </NavLink>
                </React.Fragment>
              ))}

            {secondaryLinks.length > 0 && (
              <details className="app-nav-secondary" open={isOnSecondaryPage}>
                <summary className="app-nav-group app-nav-summary">Settings</summary>
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
