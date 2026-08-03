import React, { useEffect, useState } from 'react';
import AppShell from '../../components/app/AppShell';
import EmployeeDirectory from '../../components/EmployeeDirectory';
import { getAuthenticatedContext } from '../../utils/authContext';

export default function Employees() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <AppShell user={user} section="Team Setup">
      {loading ? (
        <div className="app-panel">Loading team setup...</div>
      ) : canManageTeamSetup ? (
        <EmployeeDirectory />
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
