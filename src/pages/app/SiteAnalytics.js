import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';
import { GA_MEASUREMENT_ID } from '../../lib/analytics';

const conversionEvents = new Set([
  'demo_requested',
  'contact_form_submit',
  'contact_mailto_click',
  'pricing_contact_sales_click',
  'sample_report_view',
  'demo_cta_click',
  'cta_clicked',
  'email_submitted',
  'trial_started',
]);

const formatEventName = (name) =>
  String(name || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function SiteAnalytics() {
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }

    api
      .get('/analytics/summary')
      .then((response) => {
        setSummary(response.data);
        setStatus('ready');
      })
      .catch((err) => {
        setError(err?.response?.data?.message || err.message || 'Unable to load analytics.');
        setStatus('error');
      });
  }, []);

  const eventRows = useMemo(
    () =>
      [...(summary?.events || [])]
        .map((event) => ({
          name: formatEventName(event._id),
          eventName: event._id,
          count: event.count || 0,
        }))
        .sort((a, b) => b.count - a.count),
    [summary]
  );

  const totalEvents = eventRows.reduce((sum, event) => sum + event.count, 0);
  const pageViews = eventRows.find((event) => event.eventName === 'page_view')?.count || 0;
  const conversions = eventRows
    .filter((event) => conversionEvents.has(event.eventName))
    .reduce((sum, event) => sum + event.count, 0);
  const topEvents = eventRows.slice(0, 8);
  const recentEvents = summary?.recentEvents || [];

  return (
    <AppShell user={user} section="Site analytics" width="wide">
      <PageHeader
        eyebrow="GA4 + internal event stream"
        title="Site analytics overview"
        description="A live operational view of page activity, conversion events, and recent tracking signals. GA4 is loaded on the public site; internal events are stored for quick inspection here."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="app-dashboard-card">
          <span className="app-dashboard-card-value">Connected</span>
          <span className="app-dashboard-card-label">GA4 status</span>
          <span className="app-dashboard-card-note">{GA_MEASUREMENT_ID}</span>
        </div>
        <div className="app-dashboard-card">
          <span className="app-dashboard-card-value">{totalEvents}</span>
          <span className="app-dashboard-card-label">Tracked events</span>
          <span className="app-dashboard-card-note">Stored in internal analytics.</span>
        </div>
        <div className="app-dashboard-card">
          <span className="app-dashboard-card-value">{pageViews}</span>
          <span className="app-dashboard-card-label">App page views</span>
          <span className="app-dashboard-card-note">SPA route changes included.</span>
        </div>
        <div className="app-dashboard-card">
          <span className="app-dashboard-card-value">{conversions}</span>
          <span className="app-dashboard-card-label">Conversion events</span>
          <span className="app-dashboard-card-note">Demo, contact, email, trial.</span>
        </div>
      </div>

      {status === 'loading' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          Loading analytics overview...
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          {error}
        </div>
      )}

      {status === 'ready' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="app-section-heading">
              <div>
                <h2>Top events</h2>
                <p>Most common events recorded by the internal tracker.</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEvents}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    height={70}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="app-section-heading">
              <div>
                <h2>Recent activity</h2>
                <p>Latest events received by the backend tracker.</p>
              </div>
            </div>
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <div key={event._id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-slate-900">
                      {formatEventName(event.eventName)}
                    </strong>
                    <span className="text-xs text-slate-500">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {event.payload && (
                    <pre className="mt-2 max-h-20 overflow-auto text-xs text-slate-600">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
              {recentEvents.length === 0 && (
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                  No recent events yet. Activity will appear after visitors trigger tracked actions.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
