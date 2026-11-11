import React from 'react';
import { Link } from 'react-router-dom';

const DIMENSIONS = [
  {
    key: 'meeting_hours',
    title: 'Meeting load',
    description: 'Participant-hours per covered person',
  },
  {
    key: 'messages',
    title: 'Messaging activity',
    description: 'Observed messages; volume is not performance',
  },
  {
    key: 'after_hours',
    title: 'Outside working hours',
    description: 'Share of observed messages sent after hours',
  },
  {
    key: 'focus_time',
    title: 'Uninterrupted calendar space',
    description: 'Hours available, not proven focus or output',
  },
];

function number(value) {
  return Number.isFinite(Number(value)) && value != null ? Number(value) : null;
}

export function formatHRMetric(metric, value = metric?.current) {
  if (!metric || metric.available !== true || number(value) == null) return 'Not verified';
  const n = number(value);
  const formatted = n.toLocaleString('en', {
    maximumFractionDigits: Number.isInteger(n) ? 0 : 1,
  });
  if (metric.unit === '%') return `${formatted}%`;
  if (metric.unit === 'hours') return `${formatted}h`;
  return formatted;
}

function absoluteComparison(metric) {
  if (!metric || metric.available !== true) return 'Source evidence insufficient';
  const prior = number(metric.previous);
  const current = number(metric.current);
  if (prior == null || current == null) return 'No comparable prior period';
  return `Previous period: ${formatHRMetric(metric, prior)}`;
}

export function buildHRDecisionDimensions(brief) {
  return DIMENSIONS.map((item) => ({
    ...item,
    metric: brief?.metrics?.find((metric) => metric.key === item.key) || null,
  }));
}

function shortDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function HRDecisionSnapshot({ brief, showReportLink = true }) {
  if (!brief) return null;
  const dimensions = buildHRDecisionDimensions(brief);
  const action = brief?.actions?.primary;
  const period = [shortDate(brief.periodStart), shortDate(brief.periodEnd)].filter(Boolean).join(' to ');
  const teams = (brief.workPattern?.teams || []).filter((team) => team?.teamName).slice(0, 4);
  const unavailableCount = dimensions.filter(({ metric }) =>
    !metric || metric.available !== true || number(metric.current) == null).length;

  return (
    <section className="app-dashboard-section" aria-label="HR decision summary">
      <div className="app-panel space-y-5 border-slate-300 bg-white">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              HR summary · {period || 'Latest saved period'}
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              What changed in how work happens?
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Review measured patterns before deciding whether a team needs support.
              These numbers describe activity, not employee performance or wellbeing.
            </p>
          </div>
          <div className="text-sm text-slate-700">
            <p><strong>Evidence:</strong> {brief.status?.evidenceGrade || 'Not assessed'}</p>
            <p><strong>Activity mapped:</strong> {brief.coverage?.mappingCoveragePct == null
              ? 'Unknown' : `${brief.coverage.mappingCoveragePct}%`}</p>
            {unavailableCount > 0 && (
              <p className="font-semibold text-amber-800">
                {unavailableCount} of 4 dimensions unverified
              </p>
            )}
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dimensions.map(({ key, title, description, metric }) => {
            const available = metric?.available === true && number(metric.current) != null;
            return (
              <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                <p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">
                  {available ? formatHRMetric(metric) : 'Unavailable'}
                </p>
                <p className="mt-1 text-sm text-slate-600">{absoluteComparison(metric)}</p>
                <p className="mt-3 text-xs leading-5 text-slate-600">{description}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Question to investigate</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {brief.questions?.[0] ||
                'Do the reported changes reflect a real shift, a temporary event, or a change in source coverage?'}
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Confirm the underlying evidence with the team before inferring a cause.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Next review step</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {action?.action ||
                'Verify source coverage and discuss the most material observation before choosing an intervention.'}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              {action?.owner ? `Owner: ${action.owner}` : 'Owner: HR and relevant team leader'}
              {action?.reviewWindow ? ` · Review: ${action.reviewWindow}` : ''}
            </p>
          </div>
        </div>

        {teams.length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-bold text-slate-900">Teams to discuss</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {teams.map((team) => (
                <div key={team.teamId || team.teamName}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  <span className="font-semibold text-slate-800">{team.teamName}</span>
                  <span className="text-slate-600">
                    {team.state || 'Review data'}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Team classifications are descriptive model flags, not health assessments.
            </p>
          </div>
        )}

        {showReportLink && (
          <div className="border-t border-slate-200 pt-4">
            <Link to="/app/latest-brief"
              className="text-sm font-semibold text-blue-700 underline">
              Read the full evidence and record a decision
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
