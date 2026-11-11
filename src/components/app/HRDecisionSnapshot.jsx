import React from 'react';
import { Link } from 'react-router-dom';

const DIMENSIONS = [
  {
    key: 'meeting_hours',
    title: 'Koosolekuaeg inimese kohta',
    short: 'Koosolekuaeg',
    source: 'Outlook',
    description: 'Koosolekutel osalemise tunnid kalendrikasutaja kohta',
  },
  {
    key: 'messages',
    title: 'Sõnumid kokku',
    short: 'Sõnumid',
    source: 'Teams',
    description: 'Mõõdetud sõnumid kokku, mitte sõnumid töötaja kohta',
  },
  {
    key: 'after_hours',
    title: 'Sõnumid väljaspool tööaega',
    short: 'Pärast tööaega',
    source: 'Teams',
    description: 'Väljaspool kokkulepitud tööaega saadetud sõnumite osakaal',
  },
  {
    key: 'focus_time',
    title: 'Vaba kalendriaeg inimese kohta',
    short: 'Vaba kalendriaeg',
    source: 'Outlook',
    description: 'Pikemad kohtumisteta ajavahemikud, mitte tõend keskendunud tööst',
  },
];

function number(value) {
  return value != null && Number.isFinite(Number(value)) ? Number(value) : null;
}

export function formatHRMetric(metric, value = metric?.current) {
  if (!metric || metric.available !== true || number(value) == null) return 'Andmed puuduvad';
  const n = number(value);
  const formatted = n.toLocaleString('et-EE', {
    maximumFractionDigits: Number.isInteger(n) ? 0 : 1,
  });
  if (metric.unit === '%') return `${formatted}%`;
  if (metric.unit === 'hours') return `${formatted} h`;
  return formatted;
}

function absoluteComparison(metric) {
  if (!metric || metric.available !== true) return 'Mõõtmine vajab kontrolli';
  if (metric.comparisonReason) return 'Võrdlus puudub: ' + metric.comparisonReason;
  const prior = number(metric.previous);
  const current = number(metric.current);
  if (prior == null || current == null || metric.changePct == null) {
    return 'Võrreldavat eelmist perioodi pole';
  }
  const difference = current - prior;
  const sign = difference > 0 ? '+' : '';
  const unit = metric.unit === '%' ? ' protsendipunkti' : metric.unit === 'hours' ? ' h' : '';
  return `${sign}${difference.toLocaleString('et-EE', { maximumFractionDigits: 1 })}${unit} võrreldes eelmisega`;
}

export function buildHRDecisionDimensions(brief) {
  return DIMENSIONS.map((item) => ({
    ...item,
    metric: brief?.metrics?.find((metric) => metric.key === item.key) || null,
  }));
}

function shortDate(value) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return '';
  return new Date(value).toLocaleDateString('et-EE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Tallinn',
  });
}

export default function HRDecisionSnapshot({ brief, showReportLink = true }) {
  if (!brief) return null;
  const dimensions = buildHRDecisionDimensions(brief);
  const warnings = dimensions.filter(
    ({ metric }) => !metric || metric.available !== true || number(metric.current) == null
  );
  const meeting = dimensions.find((item) => item.key === 'meeting_hours')?.metric;
  const focus = dimensions.find((item) => item.key === 'focus_time')?.metric;
  const comparableChange = (metric) =>
    metric?.available === true &&
    !metric.comparisonReason &&
    metric.changePct != null &&
    number(metric.current) != null &&
    number(metric.previous) != null;
  const conclusion =
    comparableChange(meeting) &&
    comparableChange(focus) &&
    number(meeting.current) > number(meeting.previous) &&
    number(focus.current) < number(focus.previous)
      ? 'Koosolekutele kulunud aeg kasvas ja vaba kalendriaega jäi vähem.'
      : comparableChange(meeting) && number(meeting.current) > number(meeting.previous)
        ? 'Koosolekutele kulunud aeg kasvas. Muutuse põhjust tuleb kontrollida.'
        : 'Vaata nädala mõõtmisi ning uuri, millised muutused vajavad selgitust.';
  const sourceVerified = brief.dataQuality?.sourceToSnapshotParity?.status === 'PASS';
  const periodEnd = brief.periodEnd ? new Date(new Date(brief.periodEnd).getTime() - 1) : null;

  return (
    <section className="app-dashboard-section" aria-label="Nädala töökorralduse kokkuvõte">
      <div className="app-panel space-y-5 border-slate-200 bg-white">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              Nädala kokkuvõte · {shortDate(brief.periodStart)} kuni {shortDate(periodEnd)}
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Mis muutus töökorralduses?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{conclusion}</p>
            <p className="mt-1 text-xs text-slate-500">
              Need näitajad kirjeldavad tegevuse mustreid, mitte inimeste tulemuslikkust ega
              tervist.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
            <p>
              <strong>Seotud sündmusi:</strong> {brief.coverage?.mappingCoveragePct ?? '—'}%
            </p>
            <p className="mt-1">
              <strong>Algandmete kontroll:</strong> {sourceVerified ? 'kinnitatud' : 'kinnitamata'}
            </p>
            {warnings.length > 0 && (
              <p className="mt-1 text-amber-800">{warnings.length} mõõdiku andmed puuduvad</p>
            )}
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dimensions.map(({ key, short, source, description, metric }) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-800">{short}</h3>
                <span className="text-xs font-semibold text-teal-800">{source}</span>
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">
                {metric ? formatHRMetric(metric) : 'Andmed puuduvad'}
              </p>
              <p className="mt-1 min-h-10 text-xs leading-5 text-slate-700">
                {absoluteComparison(metric)}
              </p>
              <p className="mt-2 border-t border-slate-200 pt-2 text-xs leading-5 text-slate-500">
                {description}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Katvus: {metric?.readiness?.mappedUsers ?? '—'}/
                {metric?.readiness?.totalUsers ?? '—'}
              </p>
            </div>
          ))}
        </div>

        {!sourceVerified && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Algandmete ja aruande täielikku vastavust ei ole veel kinnitatud. Enne juhtimisotsust
            tuleb kontrollida Outlooki ja Teamsi sündmused ning tiimide koosseis.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Mida tasub uurida?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Kas muutus oli seotud ajutise projektietapiga või on tiimi iganädalane töökorraldus
              muutunud?
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Järgmine samm</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Kontrolli lähteandmed, aruta muutust tiimijuhiga ja pane otsus koos ülevaatuse
              kuupäevaga kirja.
            </p>
            <Link
              to="/app/latest-brief#action-reviews"
              className="mt-3 inline-block text-sm font-semibold text-teal-800 underline"
            >
              Ava tegevuste järelkontroll
            </Link>
          </div>
        </div>

        {showReportLink && (
          <div className="border-t border-slate-200 pt-4">
            <Link to="/app/latest-brief" className="text-sm font-semibold text-teal-800 underline">
              Vaata mõõtmiste ajalugu ja allikate selgitusi
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
