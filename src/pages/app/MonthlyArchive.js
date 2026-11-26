import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

function date(value) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Not recorded';
  return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function MonthlyArchive() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const context = await getAuthenticatedContext();
        if (!context.orgId) throw new Error('No organisation selected');
        if (active) setUser(context.user);
        const { data } = await api.get('/reports/monthly/org/' + context.orgId + '/archive');
        if (!Array.isArray(data.reports)) throw new Error('Archive unavailable');
        if (active) setReports(data.reports);
      } catch {
        if (active) setError(true);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell user={user} section="Reports">
      <PageHeader
        title="Monthly report archive"
        description="Saved reporting periods and recorded email delivery. Historical scores are not republished."
        action={<Link to="/app/latest-brief">Open weekly brief</Link>}
      />
      <section className="app-panel">
        {error ? (
          <p role="alert">The archive is unavailable. Please try again later.</p>
        ) : reports === null ? (
          <p role="status">Loading saved reports…</p>
        ) : reports.length === 0 ? (
          <p>No monthly reports have been recorded.</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {reports.map((report) => (
              <article key={report._id} className="py-4">
                <h2 className="font-semibold">
                  {date(report.periodStart)} to {date(report.periodEnd)}
                </h2>
                <p className="text-sm text-slate-600">
                  {report.reportMode === 'decision'
                    ? 'Decision brief'
                    : report.reportMode === 'setup'
                      ? 'Setup brief'
                      : 'Report type not recorded'}
                  {' · '}
                  {report.accessStatus === 'archived' ? 'Archived' : 'Saved'}
                </p>
                <p className="text-sm text-slate-600">
                  Generated: {date(report.generatedAt)} · Email sent: {date(report.emailSentAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
