import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, BarChart3, RefreshCw } from 'lucide-react';
import api from '../../utils/api';

const WINDOWS = [
  { id: '1W', label: '1W · daily', count: 7, source: 'daily' },
  { id: '1M', label: '1M', count: 5, source: 'weekly' },
  { id: '3M', label: '3M', count: 13, source: 'weekly' },
  { id: '6M', label: '6M', count: 26, source: 'weekly' },
];
const FEATURED = [
  'meetings',
  'meeting_hours',
  'after_hours',
  'focus_time',
  'back_to_back',
  'fragmentation',
];
const COLORS = {
  meetings: '#0284c7',
  meeting_hours: '#4f46e5',
  after_hours: '#d97706',
  focus_time: '#059669',
  back_to_back: '#7c3aed',
  fragmentation: '#475569',
};
function dateLabel(value, daily) {
  if (!value) return '';
  return new Date(value + 'T12:00:00Z').toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
  });
}
function valueLabel(value, unit) {
  if (value == null) return 'No measurement';
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit === '%' ? '%' : unit === 'hours' ? 'h' : unit === '/100' ? '/100' : ''}`;
}
function ChartPanel({ metric, points, baseline, availability, range }) {
  const measured = points.filter((p) => Number.isFinite(p[metric.key]));
  const latest = [...measured].reverse()[0];
  const previous = [...measured].reverse()[1];
  const available = availability?.available === true;
  // Meeting participant-hours are being audited for possible denominator errors.
  const requiresAudit = metric.key === 'meeting_hours';
  const series = points.map((p) => ({
    ...p,
    label: dateLabel(p.date, range === '1W'),
    value: available && !requiresAudit ? p[metric.key] : null,
  }));
  const baselineValue =
    available && !requiresAudit && Number.isFinite(baseline) && baseline > 0 ? baseline : null;
  const enough = measured.length >= 2;
  return (
    <article className="rounded-container border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-caption font-extrabold text-slate-900">{metric.label}</p>
          <p className="mt-1 text-caption text-slate-500">Time on X · {metric.unit} on Y</p>
        </div>
        {requiresAudit ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-caption font-semibold text-amber-800">
            Measure under verification
          </span>
        ) : available && enough ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-caption font-semibold text-emerald-800">
            Observed trend
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-caption font-semibold text-amber-800">
            Not assessable
          </span>
        )}
      </div>
      {available && !requiresAudit && enough ? (
        <>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-lead font-extrabold text-slate-900">
                {valueLabel(latest?.[metric.key], metric.unit)}
              </p>
              <p className="text-caption text-slate-500">
                Last recorded seven-day snapshot · {dateLabel(latest?.sourceDate || latest?.date)}
              </p>
            </div>
            {previous && (
              <p className="text-caption text-slate-600">
                Earlier point: {valueLabel(previous[metric.key], metric.unit)}
              </p>
            )}
          </div>
          <div
            className="mt-4 h-56 w-full"
            role="img"
            aria-label={`${metric.label} across ${range}. Missing observations shown as gaps.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 7, right: 17, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 4" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  interval="preserveStartEnd"
                  minTickGap={12}
                />
                <YAxis domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} width={43} />
                <Tooltip
                  formatter={(v) => valueLabel(v, metric.unit)}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.sourceDate || payload?.[0]?.payload?.date || ''
                  }
                />
                {baselineValue != null && (
                  <ReferenceLine
                    y={baselineValue}
                    stroke="#94a3b8"
                    strokeDasharray="5 4"
                    label={{
                      value: '6-week avg',
                      position: 'insideTopRight',
                      fontSize: 10,
                      fill: '#64748b',
                    }}
                  />
                )}
                <Line
                  type="linear"
                  name={metric.label}
                  dataKey="value"
                  stroke={COLORS[metric.key]}
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-caption text-slate-500">
            Dashed line: organization baseline where available. Gaps: no usable record. A trend does
            not establish a cause or outcome.
          </p>
        </>
      ) : (
        <div className="mt-4 flex min-h-[220px] flex-col justify-center rounded-control border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            <strong className="text-caption">No reliable chart available</strong>
          </div>
          <p className="mt-2 text-caption leading-6 text-amber-950">
            {requiresAudit
              ? 'Meeting participant-hours are withheld from the visual trend until the per-person denominator and aggregation are verified.'
              : !available
                ? `Current coverage does not support this metric. ${availability?.represented ?? '?'} of ${availability?.population ?? '?'} employees represented. ${availability?.reason || 'Verify the source connection and mapping.'}`
                : 'Fewer than two historical source records are available for this period. No values have been invented.'}
          </p>
        </div>
      )}
    </article>
  );
}
export default function ReportTrendExplorer({ brief }) {
  const [range, setRange] = useState('1M');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let active = true;
    api
      .get('/weekly-brief/trends')
      .then((res) => {
        if (active) setData(res.data);
      })
      .catch(() => {
        if (active)
          setError(
            'Historical trend data could not be loaded. The weekly report remains available.'
          );
      });
    return () => {
      active = false;
    };
  }, [brief?.generatedAt]);
  const window = WINDOWS.find((w) => w.id === range) || WINDOWS[1];
  const points = useMemo(
    () => (data?.[window.source] || []).slice(-window.count),
    [data, window.count, window.source]
  );
  const baselineMap = useMemo(
    () => Object.fromEntries((brief?.metrics || []).map((m) => [m.key, m.baseline])),
    [brief]
  );
  return (
    <section className="app-panel mb-6" aria-label="Timeline explorer">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-700" />
            <h2>How work patterns changed</h2>
          </div>
          <p className="app-muted mt-1">
            One measurement per graph. Compare the last week, month, three months or six months
            without mixing units.
          </p>
        </div>
        <div
          className="inline-flex flex-wrap rounded-control border border-slate-200 bg-slate-50 p-1"
          aria-label="Time range"
        >
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              aria-pressed={range === w.id}
              onClick={() => setRange(w.id)}
              className={`rounded-md px-3 py-2 text-caption font-bold ${range === w.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-white'}`}
            >
              {w.id}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4 rounded-control border border-blue-100 bg-blue-50 p-3 text-caption text-blue-950">
        {range === '1W'
          ? 'Daily points are rolling seven-day snapshots, not daily meeting counts.'
          : 'Each weekly point is the latest recorded rolling seven-day snapshot for that UTC week.'}{' '}
        Historical source coverage can vary; the latest week’s evidence gate controls metric
        availability. No missing records are interpolated.
      </div>
      {!data && !error && (
        <p className="flex items-center gap-2 text-caption text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading measured history…
        </p>
      )}
      {error && (
        <p className="rounded-control bg-amber-50 p-3 text-caption text-amber-950">{error}</p>
      )}
      {data && (
        <>
          {data.stale && (
            <div className="mb-4 rounded-control border border-amber-200 bg-amber-50 p-3 text-caption text-amber-950">
              <strong>History may be stale.</strong> Last organization metric record:{' '}
              {data.lastObservedDate || 'none'}. Check data collection before interpreting recent
              changes.
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {FEATURED.map((key) => {
              const metric = data.metrics?.find((m) => m.key === key);
              return metric ? (
                <ChartPanel
                  key={key}
                  metric={metric}
                  points={points}
                  baseline={baselineMap[key]}
                  availability={data.availability?.[key]}
                  range={range}
                />
              ) : null;
            })}
          </div>
          <p className="mt-4 text-caption text-slate-500">{data.method}</p>
        </>
      )}
      <div className="mt-5 flex flex-wrap gap-3 text-caption">
        <a
          href="/app/signals"
          className="rounded-control bg-slate-900 px-4 py-2.5 font-semibold text-white"
        >
          Review evidence and actions
        </a>
        <a
          href="#weekly-brief-context"
          className="rounded-control border border-slate-200 px-4 py-2.5 font-semibold text-slate-800"
        >
          Explain an unusual week
        </a>
      </div>
    </section>
  );
}
