import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';
import { GA_MEASUREMENT_ID } from '../../lib/analytics';

const conversionEvents = new Set([
  'demo_requested',
  'contact_form_submit',
  'contact_mailto_click',
  'pricing_contact_sales_click',
  'pricing_cta_clicked',
  'sample_report_click',
  'sample_report_request',
  'sample_report_view',
  'demo_cta_click',
  'cta_clicked',
  'early_signal_preview_requested',
  'form_start',
  'email_submitted',
  'trial_started',
]);

const formatEventName = (name) =>
  String(name || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const changeLabel = (current = 0, previous = 0) => {
  if (!previous) return 'No previous baseline';
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change);
  return `${rounded >= 0 ? '+' : ''}${rounded}% vs previous 30 days`;
};

export default function SiteAnalytics() {
  const [summary, setSummary] = useState(null);
  const [ga4, setGa4] = useState(null);
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

    Promise.allSettled([api.get('/analytics/summary'), api.get('/analytics/ga4/overview')])
      .then(([internalResult, ga4Result]) => {
        if (internalResult.status === 'fulfilled') setSummary(internalResult.value.data);
        if (ga4Result.status === 'fulfilled') setGa4(ga4Result.value.data);

        if (internalResult.status === 'rejected' && ga4Result.status === 'rejected') {
          throw internalResult.reason;
        }

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
  const ga4Summary = ga4?.summary || {};
  const ga4Previous = ga4?.previousSummary || {};
  const measuredConversions = ga4?.conversionEventCount ?? conversions;

  return (
    <AppShell user={user} section="Site analytics" width="wide">
      <PageHeader
        eyebrow="GA4 + internal event stream"
        title="Site analytics overview"
        description="A live operational view of traffic, engagement, top pages, acquisition channels, and conversion signals."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="app-dashboard-card">
          <span className="app-dashboard-card-value">{ga4?.connected ? 'Connected' : 'Setup'}</span>
          <span className="app-dashboard-card-label">GA4 status</span>
          <span className="app-dashboard-card-note">
            {GA_MEASUREMENT_ID} / property {ga4?.propertyId || '516781576'}
          </span>
        </div>
        <div className="app-dashboard-card">
          <span className="app-dashboard-card-value">{ga4Summary.activeUsers ?? '—'}</span>
          <span className="app-dashboard-card-label">Active users</span>
          <span className="app-dashboard-card-note">
            {changeLabel(ga4Summary.activeUsers, ga4Previous.activeUsers)}
          </span>
        </div>
        <div className="app-dashboard-card">
          <span className="app-dashboard-card-value">{ga4Summary.sessions ?? '—'}</span>
          <span className="app-dashboard-card-label">Sessions</span>
          <span className="app-dashboard-card-note">
            {changeLabel(ga4Summary.sessions, ga4Previous.sessions)}
          </span>
        </div>
        <div className="app-dashboard-card">
          <span className="app-dashboard-card-value">{ga4Summary.views ?? '—'}</span>
          <span className="app-dashboard-card-label">Views</span>
          <span className="app-dashboard-card-note">
            {changeLabel(ga4Summary.views, ga4Previous.views)}
          </span>
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

      {ga4?.connected && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="app-dashboard-card">
              <span className="app-dashboard-card-value">{ga4Summary.engagementRate ?? '—'}%</span>
              <span className="app-dashboard-card-label">Engagement rate</span>
              <span className="app-dashboard-card-note">GA4 engaged sessions / sessions.</span>
            </div>
            <div className="app-dashboard-card">
              <span className="app-dashboard-card-value">
                {ga4Summary.averageSessionDuration ?? '—'}s
              </span>
              <span className="app-dashboard-card-label">Avg session duration</span>
              <span className="app-dashboard-card-note">Last 30 days.</span>
            </div>
            <div className="app-dashboard-card">
              <span className="app-dashboard-card-value">{measuredConversions}</span>
              <span className="app-dashboard-card-label">Measured conversions</span>
              <span className="app-dashboard-card-note">
                Demo, pricing, form, preview, and sample-report actions.
              </span>
            </div>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-6 mb-8">
            <div className="app-section-heading">
              <div>
                <h2>Conversion actions</h2>
                <p>
                  GA4 event counts for high-intent actions. Mark these as key events in GA4 when
                  admin access is available.
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(ga4.conversionEvents || []).map((event) => (
                <div key={event.eventName} className="rounded-lg bg-slate-50 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">
                    {formatEventName(event.eventName)}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{event.eventCount}</div>
                  <div className="text-xs text-slate-500">GA4 event count</div>
                </div>
              ))}
              {(ga4.conversionEvents || []).length === 0 && (
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No conversion actions recorded in the selected GA4 window yet.
                </div>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6 mb-8">
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="app-section-heading">
                <div>
                  <h2>Traffic trend</h2>
                  <p>Daily sessions, views, and active users from GA4.</p>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ga4.daily || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="sessions" stroke="#2563eb" strokeWidth={2} />
                    <Line type="monotone" dataKey="views" stroke="#0f766e" strokeWidth={2} />
                    <Line type="monotone" dataKey="activeUsers" stroke="#d97706" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="app-section-heading">
                <div>
                  <h2>Traffic sources</h2>
                  <p>Sessions by default channel group.</p>
                </div>
              </div>
              <div className="space-y-3">
                {(ga4.trafficSources || []).map((source) => (
                  <div
                    key={source.channel}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-slate-800">{source.channel}</span>
                    <span className="text-sm text-slate-600">{source.sessions} sessions</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-6 mb-8">
            <div className="app-section-heading">
              <div>
                <h2>Top pages</h2>
                <p>Where visitors spend their attention.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Page</th>
                    <th className="py-2 pr-4">Views</th>
                    <th className="py-2 pr-4">Users</th>
                    <th className="py-2 pr-4">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {(ga4.topPages || []).map((page) => (
                    <tr key={`${page.path}-${page.title}`} className="border-t border-slate-100">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-slate-900">
                          {page.title || page.path}
                        </div>
                        <div className="text-xs text-slate-500">{page.path}</div>
                      </td>
                      <td className="py-3 pr-4">{page.views}</td>
                      <td className="py-3 pr-4">{page.activeUsers}</td>
                      <td className="py-3 pr-4">{page.engagementRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!ga4?.connected && status === 'ready' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 mb-8">
          GA4 reporting is not connected yet. {ga4?.reason || ga4?.message}
        </div>
      )}

      {status === 'ready' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="app-section-heading">
              <div>
                <h2>Internal events</h2>
                <p>Most common events recorded by the internal tracker.</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                {totalEvents} events · {pageViews} page views · {conversions} conversions
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
