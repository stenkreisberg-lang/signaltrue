import { createHash } from 'node:crypto';

// The dashboard, export and HR email must use the exact same saved weekly brief.
// This layer presents existing figures; it never reads Graph or recalculates them.
export const HR_REPORT_FIELDS = Object.freeze([
  { key: 'meeting_hours', label: 'Koosolekuaeg inimese kohta', short: 'Koosolekuaeg', source: 'Kalender' },
  { key: 'messages', label: 'Sõnumid kokku', short: 'Sõnumid', source: 'Sõnumid' },
  { key: 'after_hours', label: 'Sõnumid väljaspool tööaega', short: 'Pärast tööaega', source: 'Sõnumid' },
  { key: 'focus_time', label: 'Vaba kalendriaeg inimese kohta', short: 'Vaba kalendriaeg', source: 'Kalender' },
]);

export function reportLanguage(snapshot) {
  if (['et', 'en'].includes(snapshot?.reportLanguage)) return snapshot.reportLanguage;
  return snapshot?.reportTimeZone === 'Europe/Tallinn' ? 'et' : 'en';
}

const englishFields = {
  meeting_hours: ['Meeting hours per calendar contributor', 'Meeting hours', 'Calendar'],
  messages: ['Total messages', 'Messages', 'Messaging'],
  after_hours: ['Share of messages outside working hours', 'After-hours messages', 'Messaging'],
  focus_time: ['Available hours per calendar contributor', 'Available calendar time', 'Calendar'],
};

const numeric = value => typeof value === 'number' && Number.isFinite(value)
  ? Number(value) : null;

export function reportVersion(snapshot) {
  if (!snapshot) throw new Error('A saved report snapshot is required');
  const date = snapshot.periodStart ? new Date(snapshot.periodStart).toISOString().slice(0, 10).replaceAll('-', '') : 'unknown';
  const relevant = {
    orgId: String(snapshot.orgId || ''),
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    reportMode: snapshot.reportMode,
    metrics: snapshot.metrics,
    coverage: snapshot.coverage,
    status: snapshot.status,
    actionOutcomes: snapshot.actionOutcomes,
  };
  return 'ST-' + date + '-' + createHash('sha256').update(JSON.stringify(relevant)).digest('hex').slice(0, 8).toUpperCase();
}

export function buildHRReportPresentation(snapshot, language = 'et') {
  if (!snapshot) throw new Error('A saved report snapshot is required');
  const metrics = HR_REPORT_FIELDS.map(definition => {
    const original = (snapshot.metrics || []).find(item => item.key === definition.key);
    const available = original?.available === true && numeric(original.current) !== null;
    // The value can be shown even if the comparison cannot: source or cohort
    // changes must never turn into an invented directional trend.
    const previous = numeric(original?.previous);
    const comparable = available && !original?.comparisonReason && previous !== null &&
      original?.changePct !== null && original?.changePct !== undefined;
    const [label, short, source] = englishFields[definition.key];
    const fields = language === 'en' ? { ...definition, label, short, source } : definition;
    return {
      ...fields, unit: original?.unit || (definition.key === 'after_hours' ? '%' : definition.key === 'messages' ? 'messages' : 'hours'),
      current: available ? numeric(original.current) : null,
      previous: comparable ? previous : null,
      delta: comparable ? Number((numeric(original.current) - previous).toFixed(2)) : null,
      available, comparable,
      withheldReason: !available ? (original?.readiness?.reason || original?.display || (language === 'et' ? 'Allika mõõtmine puudub' : 'Source measurement unavailable'))
        : original?.comparisonReason || (!comparable ? (language === 'et' ? 'Võrreldav eelmine periood puudub' : 'Comparable prior period unavailable') : null),
      mappedUsers: original?.readiness?.mappedUsers ?? null,
      totalUsers: original?.readiness?.totalUsers ?? snapshot.coverage?.totalUsers ?? null,
      measurementType: original?.measurementType || 'observed',
      note: original?.note || null,
    };
  });
  const comparable = metrics.filter(item => item.comparable);
  const changes = comparable.filter(item => item.delta !== 0);
  const meeting = changes.find(item => item.key === 'meeting_hours');
  const focus = changes.find(item => item.key === 'focus_time');
  const et = language === 'et';
  const description = !comparable.length
    ? (et ? 'Selle nädala muutust ei saa hinnata. Võrreldav eelmine periood puudub.' : 'There is no comparable prior period for these measurements.')
    : meeting && focus && meeting.delta > 0 && focus.delta < 0
    ? (et ? 'Koosolekutele kulunud aeg kasvas ja vaba kalendriaega jäi vähem.' : 'Meeting time rose and available calendar time fell.')
    : meeting && meeting.delta > 0
      ? (et ? 'Koosolekutele kulunud aeg kasvas. Muutuse põhjust tuleb eraldi kontrollida.' : 'Meeting time rose. Check which meetings account for the increase.')
      : meeting && meeting.delta < 0
        ? (et ? 'Koosolekutele kulunud aeg vähenes. Vabanenud aeg ei tõenda iseenesest keskendumist.' : 'Meeting time fell. The calendar does not show how people used the available time.')
        : (et ? 'Vaata mõõdetud muutusi ja kontrolli perioodide võrreldavust enne järeldusi.' : 'Review comparable changes and coverage before drawing a conclusion.');
  // An operationally ready baseline is not proof that source events were reconciled.
  const sourceReconciled = snapshot.dataQuality?.sourceToSnapshotParity?.status === 'PASS';
  const warning = !sourceReconciled
    ? (et ? 'Algandmete ja aruande täielik vastavuskontroll ei ole kinnitatud.' : 'The full report has not been reconciled to its source records.')
    : null;
  return {
    version: reportVersion(snapshot),
    snapshotId: String(snapshot.id || ''),
    orgName: String(snapshot.orgName || 'Organisatsioon'),
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    generatedAt: snapshot.generatedAt,
    reportMode: snapshot.reportMode,
    coverage: snapshot.coverage || {},
    sourceReconciled,
    sourceWarning: warning,
    description,
    metrics,
    sourceMetrics: (snapshot.metrics || []).map(item => ({
      key: item.key, label: item.label, unit: item.unit,
      current: item.available === true ? numeric(item.current) : null,
      available: item.available === true, comparisonReason: item.comparisonReason || null,
      mappedUsers: item.readiness?.mappedUsers ?? null,
      source: item.readiness?.source || null,
    })),
    teamReadiness: snapshot.teamReadiness || [],
    actions: snapshot.actions || {},
    actionOutcomes: snapshot.actionOutcomes || [],
    status: snapshot.status || {},
  };
}

export function formatHRValue(metric, value = metric?.current, language = 'et') {
  const n = numeric(value);
  if (n === null) return language === 'et' ? 'Andmed puuduvad' : 'Unavailable';
  const text = n.toLocaleString(language === 'et' ? 'et-EE' : 'en-GB', { maximumFractionDigits: Number.isInteger(n) ? 0 : 1 });
  return text + (metric?.unit === 'hours' ? ' h' : metric?.unit === '%' ? '%' : '');
}

export function formatHRDelta(metric, language = 'et') {
  if (!metric.comparable || !Number.isFinite(metric.delta)) return null;
  const unit = metric.unit === '%' ? '' : metric.unit;
  const value = formatHRValue({ unit }, metric.delta, language);
  const suffix = metric.unit === '%' ? (language === 'et' ? ' protsendipunkti' : ' pp') : '';
  return (metric.delta > 0 ? '+' : '') + value + suffix;
}
