import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

const links = [
  { to: '/app/overview', label: 'Overview' },
  { to: '/app/signals', label: 'Signals' },
  { to: '/app/active-monitoring', label: 'Monitoring' },
  { to: '/app/actions', label: 'Actions' },
  { to: '/app/executive-summary', label: 'Executive Summary' },
  { to: '/app/signal-coverage', label: 'Data Coverage' },
  { to: '/app/site-analytics', label: 'Site Analytics' },
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
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('orgId');
    localStorage.removeItem('teamId');
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
            {links.map((link) => (
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
        <main className={`app-main app-main-${width}`}>
          <div className="app-privacy-bar">
            <strong>Privacy protected.</strong> Metadata only, aggregated at team level. No message
            content or individual performance ranking.
            <Link to="/app/privacy">View data policy</Link>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
