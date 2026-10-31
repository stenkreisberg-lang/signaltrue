import React, { useEffect, useState } from 'react';
import AppShell from '../../components/app/AppShell';
import EmployeeDirectory from '../../components/EmployeeDirectory';
import OrganisationWorkspace from './OrganisationWorkspace';
import { getAuthenticatedContext } from '../../utils/authContext';

export default function Employees() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    let active = true;
    getAuthenticatedContext()
      .then((context) => {
        if (active) setUser(context.user);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const canManageTeamSetup = ['master_admin', 'admin', 'hr_admin'].includes(user?.role);

  return (
    <AppShell user={user} section="Organisation">
      {loading ? (
        <div className="app-panel">Loading team setup...</div>
      ) : canManageTeamSetup ? (
        <div className="space-y-4">
          <OrganisationWorkspace />
          <section className="app-panel">
            <button
              type="button"
              className="font-semibold text-slate-900 underline"
              aria-expanded={advanced}
              onClick={() => setAdvanced(!advanced)}
            >
              {advanced
                ? 'Hide directory import and advanced mapping tools'
                : 'Open directory import and advanced mapping tools'}
            </button>
            {advanced && (
              <div className="mt-4">
                <EmployeeDirectory />
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="app-panel">
          <h1>Team setup is restricted</h1>
          <p className="app-muted">
            An administrator or HR administrator must review team mappings.
          </p>
        </div>
      )}
    </AppShell>
  );
}
