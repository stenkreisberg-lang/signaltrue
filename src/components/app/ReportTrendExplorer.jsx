import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { AlertTriangle, BarChart3, Users } from 'lucide-react';
import api from '../../utils/api';

const WINDOWS = { '1W': ['daily', 7], '1M': ['weekly', 4], '3M': ['weekly', 13], '6M': ['weekly', 26] };
const KEYS = ['meetings', 'after_hours', 'focus_time', 'back_to_back', 'fragmentation'];
const COLOR = { meetings: '#2563eb', after_hours: '#d97706', focus_time: '#0f766e', back_to_back: '#7c3aed', fragmentation: '#64748b' };
const label = d => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
const fmt = (v, unit = '') => v == null ? 'Not measured' : Number(v).toLocaleString('en-GB', { maximumFractionDigits: 2 }) + (unit === '%' ? '%' : unit === 'hours' ? ' h' : '');
const week = date => { const d = new Date(date); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0, 10); };
function Plot({ points, keyName, unit, baseline, events = [], range, color = '#2563eb' }) {
  const rows = points.map(p => ({ ...p, tick: label(p.date), amount: p[keyName] == null ? null : Number(p[keyName]) }));
  if (rows.filter(r => Number.isFinite(r.amount)).length < 2) return (
    <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-600">
      Fewer than two comparable recorded observations. Missing measurements are not shown as zero.
    </div>);
  const markers = events.map(e => ({ ...e, key: range === '1W' ? e.date : week(e.date) })).filter(e => rows.some(r => r.date === e.key));
  return <div>
    <div className="h-64 sm:h-72" role="img" aria-label="Measured trend, time on X and value on Y">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 15, right: 18, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 5" stroke="#e2e8f0" />
          <XAxis dataKey="tick" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" minTickGap={18} />
          <YAxis domain={[0, 'auto']} width={45} tick={{ fontSize: 10, fill: '#64748b' }} />
          <Tooltip formatter={v => fmt(v, unit)} labelFormatter={(_, payload) => payload?.[0]?.payload?.sourceDate || payload?.[0]?.payload?.date || ''} />
          {baseline != null && <ReferenceLine y={baseline} stroke="#64748b" strokeDasharray="5 4" label={{ value: 'Earlier median', position: 'insideTopRight', fontSize: 10 }} />}
          {markers.map((e, i) => <ReferenceLine key={i} x={label(e.key)} stroke={e.kind === 'context' ? '#a78bfa' : '#0f766e'} strokeDasharray="3 4"
            label={{ value: e.kind === 'context' ? 'Event' : 'Action', position: 'top', fontSize: 9 }} />)}
          <Line dataKey="amount" stroke={color} strokeWidth={3} connectNulls={false} type="linear" dot={{ r: 2.5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
    <p className="text-xs leading-5 text-slate-500">X: {range === '1W' ? 'observation date' : 'completed UTC week'} · Y: {unit}.
      Each recorded value covers the preceding seven days. Gaps mean missing records. Lines show correlation, not causation.</p>
  </div>;
}
function TeamDetail({ data, window, range }) {
  const teams = data.teams || [];
  const [selected, setSelected] = useState('');
  const team = teams.find(t => t.id === selected) || teams[0];
  if (!team) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
    <strong>No privacy-eligible comparisons.</strong> Teams that lack sufficient mapped actors or a comparable historical baseline are not named.
    The minimum is {data.privacy?.minimumGroupSize || 8} actors per reported team-week.
  </div>;
  const comparable = teams.filter(t => t.changePct != null).slice(0, 10);
  const events = (data.annotations || []).filter(e => e.kind === 'intervention' && e.teamId === team.id);
  return <>
    {comparable.length > 1 ? <div className="h-52" role="img" aria-label="Changes in team meeting instances per mapped person relative to earlier baseline">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={comparable} layout="vertical" margin={{ top: 5, right: 22, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 5" horizontal={false} />
          <XAxis type="number" tickFormatter={v => v + '%'} tick={{ fontSize: 10 }} />
          <YAxis dataKey="name" type="category" width={115} tick={{ fontSize: 10 }} />
          <Tooltip formatter={v => [v + '%', 'Change from own baseline']} />
          <ReferenceLine x={0} stroke="#64748b" />
          <Bar dataKey="changePct" maxBarSize={20}>
            {comparable.map(t => <Cell key={t.id} fill={t.changePct >= 0 ? '#7c3aed' : '#0284c7'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div> : <p className="text-sm text-slate-600">One eligible team is available. A comparative ranking requires two.</p>}
    <p className="my-3 text-xs leading-5 text-slate-600">Normalized meeting-instance counts per distinct mapped actor. These are NOT individual meeting attendance,
      performance scores, or health outcomes. Suppressed groups are excluded entirely.</p>
    <label htmlFor="report-team" className="text-sm font-bold">Explore an eligible team</label>
    <select id="report-team" className="ml-3 max-w-full rounded-md border border-slate-300 p-2 text-sm" value={team.id} onChange={e => setSelected(e.target.value)}>
      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
    <div className="mt-4 rounded-xl border border-slate-200 p-3 sm:p-5">
      <h3 className="font-bold text-slate-900">{team.name}: meeting instances per mapped actor</h3>
      <p className="my-2 text-sm text-slate-700">Last completed week: {fmt(team.current)} · Earlier six-week median: {fmt(team.baseline)}</p>
      <Plot points={team.points.slice(-window[1])} keyName="meetingsPerRepresentedPerson" unit="meetings per mapped actor" range={range}
        baseline={team.baseline} events={events} color="#7c3aed" />
      {events.length ? events.slice(-4).map((e, i) => <p key={i} className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        <strong>{e.title}</strong> · Started {label(e.date)} · Review {label(e.reviewAt) || 'not set'}.
        {' '}{e.outcome ? 'Recorded follow-up: ' + e.outcome.replaceAll('_', ' ') + '.' : 'Outcome not recorded yet.'}
        {e.observedBefore != null && e.observedAfter != null ? ' Recorded before ' + e.observedBefore + ', after ' + e.observedAfter + '.' : ''}
        <span className="block text-xs text-slate-500">Before/after action figures retain their original scope and units. Not proof of causal impact.</span>
      </p>) : <p className="mt-3 text-sm text-slate-500">No recorded interventions for this eligible team in the selected history.</p>}
    </div>
  </>;
}
export default function ReportTrendExplorer({ brief }) {
  const [range, setRange] = useState('3M');
  const [metric, setMetric] = useState('meetings');
  const [tab, setTab] = useState('org');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let active = true;
    api.get('/weekly-brief/trends').then(r => { if (active) setData(r.data); })
      .catch(() => { if (active) setError('Source-backed history is currently unavailable.'); });
    return () => { active = false; };
  }, [brief?.generatedAt]);
  const window = WINDOWS[range];
  const points = useMemo(() => (data?.[window[0]] || []).slice(-window[1]), [data, window]);
  const meta = data?.metrics?.find(m => m.key === metric);
  const ready = data?.availability?.[metric]?.available === true;
  const insights = (data?.insights || []).filter(i => data?.availability?.[i.metric]?.available);
  const signals = insights.filter(i => i.material).slice(0, 3);
  const baseline = insights.find(i => i.metric === metric)?.baseline;
  const latest = [...points].reverse().find(p => p[metric] != null);
  return <section className="app-panel mb-6" aria-label="Work-pattern history">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-700" /> What changed over time?</h2>
        <p className="app-muted mt-1">See the evidence, compare teams safely and inspect outcomes of recorded actions.</p></div>
      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 p-1">
        {Object.keys(WINDOWS).map(k => <button type="button" key={k} aria-pressed={range === k} onClick={() => setRange(k)}
          className={'rounded-md px-3 py-2 text-xs font-bold ' + (range === k ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50')}>{k}</button>)}
      </div>
    </div>
    {error && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
    {!data && !error && <p className="text-sm">Loading measured trends…</p>}
    {data && <>
      {data.stale && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        <AlertTriangle className="mr-1 inline h-4 w-4" /> Source records may be stale. Last recorded: {data.lastObservedDate || 'unknown'}.</p>}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs uppercase text-slate-600">Evidence</p>
          <p className="mt-2 text-xl font-bold text-slate-900">{KEYS.filter(k => data.availability?.[k]?.available).length} / {KEYS.length}</p>
          <p className="text-xs text-slate-500">Metrics ready for review</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs uppercase text-slate-600">Changes to investigate</p>
          <p className="mt-2 text-xl font-bold">{signals.length || 'None confirmed'}</p>
          <p className="text-xs text-slate-500">Consecutive weeks and historical baseline required</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs uppercase text-slate-600">Next step</p>
          <p className="mt-2 text-sm font-bold">{data.teams?.length === 0 && signals.length === 0
            ? 'Improve source coverage or keep observing' : brief?.actions?.primary?.title || 'Review context before changing work'}</p>
          <p className="text-xs text-slate-500">No automated causal claims</p>
        </div>
      </div>
      {signals.length ? <div className="mb-4 grid gap-2 sm:grid-cols-3">{signals.map(item =>
        <button key={item.metric} type="button" onClick={() => { setTab('org'); setMetric(item.metric); setRange('3M'); }}
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left hover:border-amber-400">
          <span className="font-bold text-amber-950">{data.metrics.find(m => m.key === item.metric)?.label}</span>
          <span className="block text-lg font-bold">{item.deltaPct > 0 ? '+' : ''}{item.deltaPct}%</span>
          <span className="text-xs text-amber-900">{item.statement}</span>
        </button>)}</div> :
        <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No sustained change can be established from the comparable historical evidence. This is not a claim of healthy conditions.</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        {[['org', 'Organization trends'], ['teams', 'Team comparisons and interventions']].map(([k, text]) =>
          <button type="button" key={k} onClick={() => setTab(k)} aria-pressed={tab === k}
            className={'rounded-lg px-3 py-2 text-sm font-bold ' + (tab === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700')}>
            {k === 'teams' && <Users className="mr-1 inline h-4 w-4" />}{text}</button>)}
      </div>
      {tab === 'teams' ? <TeamDetail data={data} window={window} range={range} /> : <>
        <div className="mb-3 flex flex-wrap gap-2">{KEYS.map(k => <button type="button" key={k} onClick={() => setMetric(k)} aria-pressed={metric === k}
          className={'rounded-full border px-3 py-2 text-xs font-semibold ' + (metric === k ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700')}>
          {data.metrics.find(m => m.key === k)?.label || k}{!data.availability?.[k]?.available ? ' · limited' : ''}</button>)}</div>
        <div className="rounded-xl border border-slate-200 p-3 sm:p-5">
          <h3 className="font-bold">{meta?.label || metric}</h3>
          {!ready ? <p className="mt-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mr-2 inline h-4 w-4" /> Insufficient evidence.
            {' '}{data.availability?.[metric]?.reason || 'Check connection, mapping and metric readiness.'}
          </p> : <>
            <p className="my-3 text-sm text-slate-700">Latest complete period: <strong>{fmt(latest?.[metric], meta?.unit)}</strong>
              {baseline != null ? ' · Earlier six-week median: ' + fmt(baseline, meta?.unit) : ''}</p>
            <Plot points={points} keyName={metric} unit={meta?.unit || 'count'} baseline={range === '1W' ? null : baseline}
              range={range} events={(data.annotations || []).filter(e => e.kind === 'context')} color={COLOR[metric]} />
            {insights.find(i => i.metric === metric) && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {insights.find(i => i.metric === metric).statement} Validate context before acting.</p>}
          </>}
        </div>
        {(data.annotations || []).filter(e => e.kind === 'context').slice(-4).map((e,i) =>
          <p className="mt-2 text-xs text-slate-600" key={i}>{label(e.date)}: {e.title}. Context does not dismiss a change.</p>)}
      </>}
      <p className="mt-4 text-xs leading-5 text-slate-500">The 1W view contains rolling seven-day snapshots, not daily totals.
        Completed weeks are sampled consistently on UTC weekday {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][data.anchorDay]}.
        Incomplete periods are excluded from weekly comparison. {data.method}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <a href="/app/signals" className="rounded-lg bg-slate-900 px-4 py-2.5 font-bold text-white">Review recommended actions</a>
        <a href="#weekly-brief-context" className="rounded-lg border border-slate-200 px-4 py-2.5 font-bold text-slate-800">Add event context</a>
      </div>
    </>}
  </section>;
}
