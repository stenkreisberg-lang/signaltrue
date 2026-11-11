// Manager-only analytics are isolated in /app/manager; this chart remains HR-scoped.
import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { AlertTriangle, BarChart3, Users } from 'lucide-react';
import api from '../../utils/api';

const WINDOWS = {
  '1W': ['daily', 7],
  '1M': ['weekly', 4],
  '3M': ['weekly', 13],
  '6M': ['weekly', 26],
};
const KEYS = ['meetings', 'after_hours', 'focus_time', 'back_to_back', 'fragmentation'];
const ET_METRICS = {
  meetings: 'Koosolekute arv',
  after_hours: 'Pärast tööaega saadetud sõnumid',
  focus_time: 'Vaba kalendriaeg',
  back_to_back: 'Järjestikused koosolekud',
  fragmentation: 'Kalendri killustatus',
  meeting_hours: 'Koosolekutunnid',
  messages: 'Sõnumite arv',
  recurring_load: 'Korduvkoosolekud',
};
const etMetric = (key, fallback) => ET_METRICS[key] || fallback || key;
const COLOR = {
  meetings: '#2563eb',
  after_hours: '#d97706',
  focus_time: '#0f766e',
  back_to_back: '#7c3aed',
  fragmentation: '#64748b',
};
const label = (d) =>
  d
    ? new Date(d + 'T12:00:00Z').toLocaleDateString('et-EE', { day: 'numeric', month: 'short' })
    : '';
const fmt = (v, unit = '') =>
  v == null
    ? 'Andmed puuduvad'
    : Number(v).toLocaleString('et-EE', { maximumFractionDigits: 2 }) +
      (unit === '%' ? '%' : unit === 'hours' ? ' h' : '');
const week = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};
function Plot({ points, keyName, unit, baseline, events = [], range, color = '#2563eb' }) {
  const rows = points.map((p) => ({
    ...p,
    tick: label(p.date),
    amount: p[keyName] == null ? null : Number(p[keyName]),
  }));
  if (rows.filter((r) => Number.isFinite(r.amount)).length < 2)
    return (
      <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-600">
        Võrreldavaid mõõtmisi on vähem kui kaks. Puuduvat mõõtmist ei kuvata nullina.
      </div>
    );
  const markers = events
    .map((e) => ({ ...e, key: range === '1W' ? e.date : week(e.date) }))
    .filter((e) => rows.some((r) => r.date === e.key));
  return (
    <div>
      <div
        className="h-64 sm:h-72"
        role="img"
        aria-label="Mõõdetud muutus ajas, kuupäev horisontaalteljel ja väärtus vertikaalteljel"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 15, right: 18, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 5" stroke="#e2e8f0" />
            <XAxis
              dataKey="tick"
              tick={{ fontSize: 10, fill: '#64748b' }}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis domain={[0, 'auto']} width={45} tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip
              formatter={(v) => fmt(v, unit)}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.sourceDate || payload?.[0]?.payload?.date || ''
              }
            />
            {baseline != null && (
              <ReferenceLine
                y={baseline}
                stroke="#64748b"
                strokeDasharray="5 4"
                label={{ value: 'Varasem mediaan', position: 'insideTopRight', fontSize: 10 }}
              />
            )}
            {markers.map((e, i) => (
              <ReferenceLine
                key={i}
                x={label(e.key)}
                stroke={e.kind === 'context' ? '#a78bfa' : '#0f766e'}
                strokeDasharray="3 4"
                label={{
                  value: e.kind === 'context' ? 'Sündmus' : 'Tegevus',
                  position: 'top',
                  fontSize: 9,
                }}
              />
            ))}
            <Line
              dataKey="amount"
              stroke={color}
              strokeWidth={3}
              connectNulls={false}
              type="linear"
              dot={{ r: 2.5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        X: {range === '1W' ? 'mõõtmise kuupäev' : 'lõppenud nädal'} · Y: {unit}. Iga punkt põhineb
        seitsme päeva andmetel. Puuduv nädal jääb tühjaks. Muutus ei tõenda põhjust.
      </p>
    </div>
  );
}
const TEAM_DIMENSIONS = [
  ['meetingHoursPerRepresentedPerson', 'Koosolekutunnid kalendrikasutaja kohta', 'hours/person'],
  ['meetingsPerRepresentedPerson', 'Koosolekute arv kalendrikasutaja kohta', 'meetings/person'],
  ['messagesPerRepresentedPerson', 'Sõnumid saatja kohta', 'messages/person'],
  ['afterHoursPct', 'Väljaspool tööaega saadetud sõnumite osakaal', '%'],
  ['focusHoursPerRepresentedPerson', 'Vaba kalendriaeg inimese kohta', 'hours/person'],
  ['recurringLoadPct', 'Korduvkoosolekute osakaal', '%'],
  ['calendarFragmentation', 'Kalendri killustatuse indeks', '/100'],
];
function TeamDetail({ data, window, range }) {
  const teams = data.teams || [];
  const [selected, setSelected] = useState('');
  const [metricKey, setMetricKey] = useState('meetingHoursPerRepresentedPerson');
  const team = teams.find((t) => t.id === selected) || teams[0];
  const meta = TEAM_DIMENSIONS.find(([key]) => key === metricKey) || TEAM_DIMENSIONS[0];
  const summaries = (selectedTeam) => selectedTeam?.metricSummaries?.[metricKey] || null;
  const summary = summaries(team);
  const comparable = teams
    .map((t) => ({ id: t.id, name: t.name, changePct: summaries(t)?.changePct ?? null }))
    .filter((t) => t.changePct != null)
    .slice(0, 15);
  if (!team)
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Ühelgi tiimil pole veel piisavalt allikaga seotud mõõtmisi. Igal tiimil kehtib sama{' '}
        {data.privacy?.minimumGroupSize || 2} seotud töötaja miinimum. Puuduvaid nädalaid ei loeta
        nulliks.
      </div>
    );
  const events = (data.annotations || []).filter(
    (e) => e.kind === 'intervention' && e.teamId === team.id
  );
  return (
    <>
      <div className="mt-3 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm font-bold" htmlFor="report-team">
          Tiim
          <select
            id="report-team"
            className="max-w-full rounded-md border border-slate-300 p-2 text-sm font-normal"
            value={team.id}
            onChange={(e) => setSelected(e.target.value)}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold" htmlFor="report-team-metric">
          Mõõdik
          <select
            id="report-team-metric"
            className="max-w-full rounded-md border border-slate-300 p-2 text-sm font-normal"
            value={metricKey}
            onChange={(e) => setMetricKey(e.target.value)}
          >
            {TEAM_DIMENSIONS.map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {comparable.length > 1 && (
        <div
          className="mt-4 h-52"
          role="img"
          aria-label={`Tiimide võrdlus mõõdikul ${meta[1]} varasema kuue nädala taustal`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={comparable}
              layout="vertical"
              margin={{ top: 5, right: 22, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 5" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => v + '%'} tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" width={115} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [v + '%', 'Muutus võrreldava baasväärtusega']} />
              <ReferenceLine x={0} stroke="#64748b" />
              <Bar dataKey="changePct" maxBarSize={20}>
                {comparable.map((t) => (
                  <Cell key={t.id} fill={t.changePct >= 0 ? '#7c3aed' : '#0284c7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-4 rounded-xl border border-slate-200 p-3 sm:p-5">
        <h3 className="font-bold text-slate-900">
          {team.name}: {meta[1]}
        </h3>
        {summary?.current != null ? (
          <p className="my-2 text-sm text-slate-700">
            Viimane lõppenud nädal: <strong>{fmt(summary.current, meta[2])}</strong>
            {summary.baseline != null
              ? ' · Eelmise kuue nädala mediaan: ' + fmt(summary.baseline, meta[2])
              : ' · Võrreldav baasväärtus puudub'}
            {summary.changePct != null ? ' · Muutus: ' + summary.changePct + '%' : ''}
          </p>
        ) : (
          <p className="my-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Selle tiimi viimase lõppenud nädala allikamõõtmist ei ole kinnitatud.
          </p>
        )}
        <Plot
          points={team.points.slice(-window[1])}
          keyName={metricKey}
          unit={meta[2]}
          range={range}
          baseline={summary?.verifiedComparison ? summary.baseline : null}
          events={events}
          color="#7c3aed"
        />
        <p className="mt-2 text-xs leading-5 text-slate-600">
          Kalendri ja sõnumite mõõtmistel kasutatakse vastava allika seotud töötajate hulka.
          Võrdluseks on vaja vähemalt nelja mõõdetud nädalat varasemast kuuest. Puuduv nädal on
          tühi, mitte null. Tulemused ei kirjelda töötaja sooritust ega tõenda põhjust.
        </p>
        {events.length ? (
          events.slice(-4).map((e, i) => (
            <p key={i} className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <strong>{e.title}</strong> · Algas {label(e.date)} · Ülevaatus{' '}
              {label(e.reviewAt) || 'määramata'}.{' '}
              {e.outcome
                ? 'Järelkontroll: ' + e.outcome.replaceAll('_', ' ') + '.'
                : 'Tulemus pole veel kirjas.'}
              {e.observedBefore != null && e.observedAfter != null
                ? ' Enne ' + e.observedBefore + ', pärast ' + e.observedAfter + ' (algses ühikus).'
                : ''}
              <span className="block text-xs text-slate-500">
                Pärast tegevust mõõdetud muutus ei tõenda, et tegevus selle põhjustas.
              </span>
            </p>
          ))
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Valitud perioodil ei ole selle tiimi kohta tegevusi salvestatud.
          </p>
        )}
      </div>
    </>
  );
}
export default function ReportTrendExplorer({ brief }) {
  const [range, setRange] = useState('3M');
  const [metric, setMetric] = useState('meetings');
  const [tab, setTab] = useState('org');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let active = true;
    api
      .get('/weekly-brief/trends')
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch(() => {
        if (active) setError('Mõõdetud ajalugu ei ole praegu kättesaadav.');
      });
    return () => {
      active = false;
    };
  }, [brief?.generatedAt]);
  const window = WINDOWS[range];
  const points = useMemo(() => (data?.[window[0]] || []).slice(-window[1]), [data, window]);
  const meta = data?.metrics?.find((m) => m.key === metric);
  const ready = data?.availability?.[metric]?.available === true;
  const insights = (data?.insights || []).filter((i) => data?.availability?.[i.metric]?.available);
  const signals = insights.filter((i) => i.material).slice(0, 3);
  const baseline = insights.find((i) => i.metric === metric)?.baseline;
  const latest = [...points].reverse().find((p) => p[metric] != null);
  return (
    <section className="app-panel mb-6" aria-label="Töökorralduse mõõtmiste ajalugu">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-700" /> Kuidas töökorralduse näitajad ajas
            muutusid?
          </h2>
          <p className="app-muted mt-1">
            Võrdle mõõdetud perioode ja tiime ning vaata varasemate tegevuste tulemusi.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 p-1">
          {Object.keys(WINDOWS)
            .filter((k) => tab !== 'teams' || k !== '1W')
            .map((k) => (
              <button
                type="button"
                key={k}
                aria-pressed={range === k}
                onClick={() => setRange(k)}
                className={
                  'rounded-md px-3 py-2 text-xs font-bold ' +
                  (range === k ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50')
                }
              >
                {k}
              </button>
            ))}
        </div>
      </div>
      {error && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
      {!data && !error && <p className="text-sm">Mõõdetud ajaloo laadimine…</p>}
      {data && (
        <>
          {data.stale && (
            <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mr-1 inline h-4 w-4" /> Algandmed võivad olla aegunud.
              Viimane mõõtmine: {data.lastObservedDate || 'teadmata'}.
            </p>
          )}
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase text-slate-600">Mõõtmised</p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {KEYS.filter((k) => data.availability?.[k]?.available).length} / {KEYS.length}
              </p>
              <p className="text-xs text-slate-500">Mõõdikud, mida saab uurida</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase text-slate-600">Muutused, mida uurida</p>
              <p className="mt-2 text-xl font-bold">
                {signals.length || 'Kinnitatud muutus puudub'}
              </p>
              <p className="text-xs text-slate-500">
                Vajalikud on võrreldavad nädalad ja baasväärtus
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase text-slate-600">Järgmine samm</p>
              <p className="mt-2 text-sm font-bold">
                {data.teams?.length === 0 && signals.length === 0
                  ? 'Kontrolli andmekatvust või jätka mõõtmist'
                  : brief?.actions?.primary?.title || 'Enne muudatust kontrolli tööolukorda'}
              </p>
              <p className="text-xs text-slate-500">Automaatseid põhjuslikke järeldusi ei tehta</p>
            </div>
          </div>
          {signals.length ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              {signals.map((item) => (
                <button
                  key={item.metric}
                  type="button"
                  onClick={() => {
                    setTab('org');
                    setMetric(item.metric);
                    setRange('3M');
                  }}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left hover:border-amber-400"
                >
                  <span className="font-bold text-amber-950">
                    {etMetric(item.metric, data.metrics.find((m) => m.key === item.metric)?.label)}
                  </span>
                  <span className="block text-lg font-bold">
                    {item.deltaPct > 0 ? '+' : ''}
                    {item.deltaPct}%
                  </span>
                  <span className="text-xs text-amber-900">{item.statement}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Võrreldud ajaloost ei saa kinnitada püsivat muutust. See ei tähenda, et olukord oleks
              tingimata hea.
            </p>
          )}
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              ['org', 'Organisatsiooni ajalugu'],
              ['teams', 'Tiimide võrdlus ja tegevused'],
            ].map(([k, text]) => (
              <button
                type="button"
                key={k}
                onClick={() => {
                  setTab(k);
                  if (k === 'teams' && range === '1W') setRange('1M');
                }}
                aria-pressed={tab === k}
                className={
                  'rounded-lg px-3 py-2 text-sm font-bold ' +
                  (tab === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700')
                }
              >
                {k === 'teams' && <Users className="mr-1 inline h-4 w-4" />}
                {text}
              </button>
            ))}
          </div>
          {tab === 'teams' ? (
            <TeamDetail data={data} window={window} range={range} />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {KEYS.map((k) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => setMetric(k)}
                    aria-pressed={metric === k}
                    className={
                      'rounded-full border px-3 py-2 text-xs font-semibold ' +
                      (metric === k
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700')
                    }
                  >
                    {etMetric(k, data.metrics.find((m) => m.key === k)?.label)}
                    {!data.availability?.[k]?.available ? ' · piiratud' : ''}
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-slate-200 p-3 sm:p-5">
                <h3 className="font-bold">{etMetric(metric, meta?.label)}</h3>
                {!ready ? (
                  <p className="mt-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertTriangle className="mr-2 inline h-4 w-4" /> Andmed puudulikud.{' '}
                    {data.availability?.[metric]?.reason ||
                      'Kontrolli ühendust, töötajate seoseid ja mõõdiku valmisolekut.'}
                  </p>
                ) : (
                  <>
                    <p className="my-3 text-sm text-slate-700">
                      Viimane täielik periood: <strong>{fmt(latest?.[metric], meta?.unit)}</strong>
                      {baseline != null
                        ? ' · Varasema kuue nädala mediaan: ' + fmt(baseline, meta?.unit)
                        : ''}
                    </p>
                    <Plot
                      points={points}
                      keyName={metric}
                      unit={meta?.unit || 'count'}
                      baseline={range === '1W' ? null : baseline}
                      range={range}
                      events={(data.annotations || []).filter((e) => e.kind === 'context')}
                      color={COLOR[metric]}
                    />
                    {insights.find((i) => i.metric === metric) && (
                      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                        {insights.find((i) => i.metric === metric).statement} Enne otsust kontrolli
                        olukorra tausta.
                      </p>
                    )}
                  </>
                )}
              </div>
              {(data.annotations || [])
                .filter((e) => e.kind === 'context')
                .slice(-4)
                .map((e, i) => (
                  <p className="mt-2 text-xs text-slate-600" key={i}>
                    {label(e.date)}: {e.title}. Taustinfo ei muuda mõõdetud fakti olematuks.
                  </p>
                ))}
            </>
          )}
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Ühe nädala vaade näitab seitsme päeva libisevaid mõõtmisi, mitte päevade summat.
            Lõppenud nädala näidud on võetud UTC nädalapäeval{' '}
            {
              ['pühapäev', 'esmaspäev', 'teisipäev', 'kolmapäev', 'neljapäev', 'reede', 'laupäev'][
                data.anchorDay
              ]
            }
            . Poolikuid perioode nädalavõrdlusse ei kaasata.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a
              href="/app/signals"
              className="rounded-lg bg-slate-900 px-4 py-2.5 font-bold text-white"
            >
              Vaata soovitatud tegevusi
            </a>
            <a
              href="#weekly-brief-context"
              className="rounded-lg border border-slate-200 px-4 py-2.5 font-bold text-slate-800"
            >
              Lisa nädala taustinfo
            </a>
          </div>
        </>
      )}
    </section>
  );
}
