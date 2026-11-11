import { createHash } from 'node:crypto';

// The dashboard, export and HR email must use the exact same saved weekly brief.
// This layer presents existing figures; it never reads Graph or recalculates them.
export const HR_REPORT_FIELDS = Object.freeze([
  { key: 'meeting_hours', label: 'Koosolekuaeg inimese kohta', short: 'Koosolekuaeg', source: 'Outlook / kalender' },
  { key: 'messages', label: 'Sõnumid kokku', short: 'Sõnumid', source: 'Teams / vestlused' },
  { key: 'after_hours', label: 'Sõnumid väljaspool tööaega', short: 'Pärast tööaega', source: 'Teams / vestlused' },
  { key: 'focus_time', label: 'Vaba kalendriaeg inimese kohta', short: 'Vaba kalendriaeg', source: 'Outlook / kalender' },
]);

const numeric = value => value !== null && value !== undefined && Number.isFinite(Number(value))
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

export function buildHRReportPresentation(snapshot) {
  if (!snapshot) throw new Error('A saved report snapshot is required');
  const metrics = HR_REPORT_FIELDS.map(definition => {
    const original = (snapshot.metrics || []).find(item => item.key === definition.key);
    const available = original?.available === true && numeric(original.current) !== null;
    // The value can be shown even if the comparison cannot: source or cohort
    // changes must never turn into an invented directional trend.
    const previous = numeric(original?.previous);
    const comparable = available && !original?.comparisonReason && previous !== null &&
      original?.changePct !== null && original?.changePct !== undefined;
    return {
      ...definition, unit: original?.unit || (definition.key === 'after_hours' ? '%' : 'hours'),
      current: available ? numeric(original.current) : null,
      previous: comparable ? previous : null,
      delta: comparable ? Number((numeric(original.current) - previous).toFixed(2)) : null,
      available, comparable,
      withheldReason: !available ? (original?.readiness?.reason || original?.display || 'Allika mõõtmine puudub')
        : original?.comparisonReason || (!comparable ? 'Võrreldav eelmine periood puudub' : null),
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
  const description = meeting && focus && meeting.delta > 0 && focus.delta < 0
    ? 'Koosolekutele kulunud aeg kasvas ja vaba kalendriaega jäi vähem.'
    : meeting && meeting.delta > 0
      ? 'Koosolekutele kulunud aeg kasvas. Muutuse põhjust tuleb eraldi kontrollida.'
      : meeting && meeting.delta < 0
        ? 'Koosolekutele kulunud aeg vähenes. Vabanenud aeg ei tõenda iseenesest keskendumist.'
        : 'Vaata mõõdetud muutusi ja kontrolli perioodide võrreldavust enne järeldusi.';
  // An operationally ready baseline is not proof that source events were reconciled.
  const sourceReconciled = snapshot.dataQuality?.sourceToSnapshotParity?.status === 'PASS';
  const warning = !sourceReconciled
    ? 'Algandmete ja aruande täielik vastavuskontroll ei ole kinnitatud.'
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

export function formatHRValue(metric, value = metric?.current) {
  const n = numeric(value);
  if (n === null) return 'Andmed puuduvad';
  const text = n.toLocaleString('et-EE', { maximumFractionDigits: Number.isInteger(n) ? 0 : 1 });
  return text + (metric?.unit === 'hours' ? ' h' : metric?.unit === '%' ? '%' : '');
}
