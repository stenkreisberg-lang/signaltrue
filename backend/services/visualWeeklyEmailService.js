/**
 * Decision-first weekly email.
 * Reports use one persisted evidence snapshot and the same comparable trend series
 * as the dashboard. Private PNGs are embedded with Content-ID; no external chart API.
 */
import { createTrendPng } from './weeklyChartPng.js';
import { buildHRReportPresentation, formatHRValue } from './weeklyReportPresentationService.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));
const number = (v, unit = '') => v == null || !Number.isFinite(Number(v)) ? 'Not measured'
  : Number(v).toLocaleString('en-GB', { maximumFractionDigits: 1 }) +
    (unit === '%' ? '%' : unit === 'hours' ? ' h' : unit === 'signals' ? '' : '');
const day = v => v ? new Date(v).toLocaleDateString('en-GB', {
  day: 'numeric', month: 'short', timeZone: 'UTC',
}) : '—';
const localDay = (v, timeZone = 'UTC') => v ? new Date(v).toLocaleDateString('en-GB', {
  day: 'numeric', month: 'short', timeZone,
}) : '—';
const isAvailable = m => m?.available === true && Number.isFinite(Number(m.current));
const metricByKey = (metrics, key) => metrics.find(m => m.key === key);
const PRIORITY = [
  'meeting_hours', 'after_hours', 'focus_time', 'fragmentation',
  'back_to_back', 'messages', 'recurring_load', 'meetings',
];
const HIST_KEYS = {
  meeting_hours: 'meeting_hours', after_hours: 'after_hours',
  focus_time: 'focus_time', fragmentation: 'fragmentation',
  back_to_back: 'back_to_back', messages: 'messages',
  recurring_load: 'recurring_load', meetings: 'meetings',
};
const HIST_UNITS = {
  meeting_hours: 'participant-hours', after_hours: '%',
  focus_time: 'hours', fragmentation: '/100',
  back_to_back: 'blocks', messages: 'messages',
  recurring_load: '%', meetings: 'meetings',
};
const section = (title, body) => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dbe3ef;border-radius:10px;margin-top:15px;">' +
  '<tr><td style="padding:15px 17px;"><h3 style="margin:0 0 9px;color:#10223a;font-size:15px;">' +
  esc(title) + '</h3>' + body + '</td></tr></table>';
const p = value => '<p style="font-size:13px;line-height:1.55;color:#334155;margin:6px 0 0;">' + esc(value) + '</p>';
const mild = value => '<p style="font-size:11px;line-height:1.5;color:#64748b;margin:6px 0 0;">' + esc(value) + '</p>';
const severityScore = value => {
  const str = String(value || '').toLowerCase();
  return str.includes('critical') ? 4 : str.includes('high') || str.includes('risk') ? 3 :
    str.includes('watch') || str.includes('moderate') ? 2 : 1;
};
function difference(metric) {
  if (!isAvailable(metric) || metric.previous == null || !Number.isFinite(Number(metric.previous))) return 'No comparable previous period';
  const delta = Number(metric.current) - Number(metric.previous);
  const sign = delta > 0 ? '+' : '';
  const unit = metric.unit === '%' ? ' percentage points' : metric.unit === 'hours' ? ' h' : '';
  return sign + Number(delta.toFixed(1)).toLocaleString('en-GB') + unit + ' versus previous week';
}
function metricCard(metric) {
  if (!metric) return '';
  const available = isAvailable(metric);
  return '<td width="33.33%" valign="top" style="padding:5px;">' +
    '<table role="presentation" width="100%" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;">' +
    '<tr><td style="padding:12px;"><div style="font-size:11px;font-weight:bold;color:#475569;">' + esc(metric.label) +
    '</div><div style="font-size:23px;font-weight:bold;color:#10223a;margin:7px 0;">' +
    esc(available ? number(metric.current, metric.unit) : 'Unavailable') + '</div>' +
    '<div style="font-size:11px;line-height:1.4;color:#475569;">' +
    esc(available ? difference(metric) : metric.readiness?.reason || 'Source data unavailable') +
    '</div></td></tr></table></td>';
}
function evidenceTable(metrics) {
  return '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
    metrics.map(metric => '<tr><td style="border-bottom:1px solid #e2e8f0;padding:7px 2px;font-size:12px;color:#334155;">' +
      esc(metric.label) + '</td><td align="right" style="border-bottom:1px solid #e2e8f0;padding:7px 2px;font-size:12px;font-weight:bold;color:#10223a;">' +
      esc(isAvailable(metric) ? number(metric.current, metric.unit) : 'Unavailable') +
      '</td></tr>' + (!isAvailable(metric) ? '<tr><td colspan="2" style="padding:3px 2px 8px;color:#9a3412;font-size:11px;">' +
      esc(metric.display || metric.readiness?.reason || metric.note || 'No validated observations') + '</td></tr>' : '')).join('') + '</table>';
}
function dateSeries(points, key, unit) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border-collapse:collapse;"><tr>' +
    points.map(point => '<td align="center" valign="top" style="font-size:10px;padding:4px 1px;color:#64748b;">' +
      esc(day(point.date)) + '</td>').join('') + '</tr><tr>' +
    points.map(point => '<td align="center" style="font-size:10px;font-weight:bold;color:#10223a;padding:2px 1px 5px;">' +
      esc(Number.isFinite(point?.[key]) ? number(point[key], unit) : '—') + '</td>').join('') + '</tr></table>';
}
// Email-safe fallback: trend data remain readable when an email client blocks CID images.
export function emailTimeline(points, key, unit = '') {
  const observed = (points || []).filter(point => Number.isFinite(point?.[key]));
  if (observed.length < 3) return mild('Insufficient comparable historical observations. Trend withheld; current evidence is listed below.');
  const max = Math.max(1, ...observed.map(point => point[key]));
  const cells = (points || []).map(point => {
    const v = point?.[key];
    const height = Number.isFinite(v) ? Math.max(3, Math.round(v / max * 85)) : 0;
    return '<td valign="bottom" align="center" style="height:96px;vertical-align:bottom;padding:0 3px;">' +
      (Number.isFinite(v) ? '<table role="presentation" width="58%" cellpadding="0" cellspacing="0"><tr><td height="' +
      height + '" style="background:#2563eb;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>' : '') + '</td>';
  }).join('');
  return '<table role="presentation" width="100%" style="table-layout:fixed;border-collapse:collapse;"><tr>' +
    cells + '</tr></table>' + dateSeries(points, key, unit);
}
function chartSection(metric, trends, key, embedded = false) {
  const history = (trends?.weekly || []).slice(-8);
  const measured = history.filter(point => Number.isFinite(point?.[key]));
  if (measured.length < 3) return '';
  const trendSignal = (trends?.insights || []).find(item => item.metric === key);
  const baseline = trendSignal?.baseline ?? (Number.isFinite(metric.baseline) ? metric.baseline : null);
  const chart = embedded
    ? '<img src="cid:st-weekly-' + esc(key) + '" alt="Historical line chart for ' + esc(metric.label) +
      ', with blue measured trend and dashed reference baseline" width="540" height="171" style="display:block;width:100%;max-width:540px;height:auto;border:0;margin:8px 0;" />'
    : emailTimeline(history, key, HIST_UNITS[metric.key] || metric.unit);
  const info = trendSignal?.statement ||
    'Observed historical measurements. A change is not proof of a cause or an employee outcome.';
  return section(metric.label + ' · historical pattern',
    mild('Eight completed reporting weeks where available. Missing data remain gaps. Units: ' +
      (HIST_UNITS[metric.key] || metric.unit) + '.') +
    chart + (embedded ? dateSeries(history, key, HIST_UNITS[metric.key] || metric.unit) : '') +
    mild((baseline == null ? 'No validated reference baseline. ' :
      'Reference baseline: ' + number(baseline, metric.unit) + '. ') + info));
}
function signalCards(signals) {
  const eligible = (signals || []).filter(item => item && item.title && item.evidence)
    .sort((a, b) => severityScore(b.severity) - severityScore(a.severity)).slice(0, 3);
  if (!eligible.length) return section('What needs attention',
    p('No source-verified priority signal is available this week. This is not proof that work patterns are healthy.'));
  return section('What needs attention · recorded signals', eligible.map((item, index) =>
    '<div style="border-bottom:1px solid #e2e8f0;padding:9px 0;">' +
    '<div style="font-size:13px;font-weight:bold;color:#10223a;">' + (index + 1) + '. ' +
    esc(item.title) + ' <span style="font-weight:normal;color:#64748b;">(' +
    esc(item.severity || 'review') + ')</span></div>' +
    p(item.evidence) + (item.action ? mild('Possible next step: ' + item.action) : '') +
    '</div>').join('') + mild('These are rule-based review prompts, not diagnoses or evidence of causation.'));
}
function teamSection(snapshot) {
  const teams = snapshot.workPattern?.teams || [];
  if (!teams.length) return '';
  return section('Team patterns with validated coverage', teams.slice(0, 4).map(t =>
    '<p style="font-size:12px;line-height:1.55;color:#334155;margin:7px 0;">' +
    '<strong>' + esc(t.teamName) + '</strong>: internal deviation index ' +
    esc(number(t.deviationIndex)) + ' / 100, ' + esc(t.state || 'review') +
    '. Data-readiness ' + esc(number(t.dataReadiness)) +
    '. ' + esc((t.drivers || []).slice(0, 2).map(d => d.label).join(', ')) + '</p>').join('') +
    mild('Team observations are shown only for approved aggregation cohorts. Smaller groups may exist without attributable analytics.'));
}
function outcomeSection(snapshot) {
  const outcomes = (snapshot.actionOutcomes || []).slice(0, 3);
  if (!outcomes.length) return '';
  return section('Did a previous action work?', outcomes.map(a =>
    '<p style="font-size:12px;line-height:1.55;color:#334155;margin:8px 0;">' +
    '<strong>' + esc(a.title) + '</strong> · ' + esc(a.status || 'in progress') +
    (a.targetMetric ? ' · ' + esc(a.targetMetric) : '') +
    (a.outcome?.result ? '<br>Observed: ' + esc(a.outcome.result) : '<br>Review not yet verified') +
    '</p>').join('') + mild('Observed post-action changes are associations, not causal proof.'));
}
// Use frozen, saved historical points whenever present. An email should not
// attach a newer live chart to an older report snapshot.
export function savedEmailTrends(snapshot, fallback = null) {
  if (!Array.isArray(snapshot?.trend) || snapshot.trend.length === 0) return fallback;
  return {
    weekly: snapshot.trend.map((point) => ({
      date: point.weekStart || point.date,
      meeting_hours: point.meetingHours ?? null,
      messages: point.messagesPerPerson ?? null,
      after_hours: point.afterHoursPct ?? null,
      focus_time: point.focusHours ?? null,
      meetings: point.meetings ?? null,
      fragmentation: point.fragmentation ?? null,
    })),
    insights: [],
  };
}

function buildEmail(snapshot, trends, { appUrl = 'https://www.signaltrue.ai', embeddedKeys = [] } = {}) {
  if (!snapshot) throw new Error('Weekly snapshot unavailable');
  const view = buildHRReportPresentation(snapshot);
  const sharedTrends = savedEmailTrends(snapshot, trends);
  const rows = view.metrics.map(m => {
    const change = m.comparable
      ? (m.delta > 0 ? '+' : '') + formatHRValue({ unit: m.unit }, m.delta)
      : 'Võrdlus puudub';
    return '<td style="padding:7px;vertical-align:top;width:50%;">' +
      '<div style="border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc;padding:13px;">' +
      '<div style="font-size:12px;font-weight:bold;color:#475569;">' + esc(m.short) + '</div>' +
      '<div style="font-size:25px;font-weight:bold;color:#14253b;margin:8px 0;">' +
      esc(m.available ? formatHRValue(m) : 'Andmed puuduvad') + '</div>' +
      '<div style="font-size:11px;color:#475569;">' + esc(change) + '</div>' +
      '</div></td>';
  });
  const metricsGrid = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    '<tr>' + rows.slice(0, 2).join('') + '</tr><tr>' + rows.slice(2).join('') + '</tr></table>';
  const provenance = view.metrics.map(m =>
    '<tr><td style="padding:8px 4px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#334155;">' +
    esc(m.label) + '</td><td style="text-align:right;padding:8px 4px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#64748b;">' +
    esc(m.source) + ' · ' + esc(m.mappedUsers == null ? 'katvus puudub' : m.mappedUsers + '/' + (m.totalUsers ?? '?')) +
    '</td></tr>').join('');
  const baseUrl = String(appUrl).endsWith('/') ? String(appUrl).slice(0, -1) : String(appUrl);
  const reportUrl = esc(baseUrl + '/app/latest-brief');
  const trendMetric = (snapshot.metrics || []).find(m => m.key === 'meeting_hours');
  const chart = trendMetric && trendMetric.available
    ? chartSection(trendMetric, sharedTrends, 'meeting_hours', embeddedKeys.includes('meeting_hours')) : '';
  const next = 'Uuri olulist muutust tiimiga ja pane kokkulepitud tegevus koos kontrollkuupäevaga kirja.';
  return '<!doctype html><html lang="et"><body style="margin:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#14253b;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 8px;">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:white;border-radius:12px;">' +
    '<tr><td style="padding:24px;background:#14253b;color:white;">' +
    '<div style="font-size:11px;font-weight:bold;color:#9ee1d0;">SIGNALTRUE</div>' +
    '<h1 style="font-size:23px;line-height:1.3;margin:10px 0 5px;color:white;">Nädala töökorralduse ülevaade</h1>' +
    '<div style="font-size:12px;color:#cbd5e1;">' + esc(view.orgName) + ' · ' +
    esc(localDay(view.periodStart, snapshot.reportTimeZone)) + ' – ' +
    esc(localDay(new Date(view.periodEnd).getTime() - 1, snapshot.reportTimeZone)) +
    ' · ' + esc(view.version) + '</div></td></tr>' +
    '<tr><td style="padding:20px;">' +
    '<h2 style="font-size:17px;color:#14253b;margin:0 0 8px;">Mis töökorralduses muutus?</h2>' +
    p(view.description) +
    (view.sourceWarning ? '<p style="margin:12px 0;padding:10px;background:#fffbeb;color:#92400e;font-size:12px;">' +
      esc(view.sourceWarning) + '</p>' : '') +
    '<div style="margin-top:14px;">' + metricsGrid + '</div>' +
    section('Mida järgmisena kontrollida?', p(next) +
      mild('Põhjus selgub pärast allikate ja tiimi tööolukorra kontrolli. Sõnumite arv ei näita töö tulemuslikkust.')) +
    chart +
    section('Mõõdikute allikad ja katvus', '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
      provenance + '</table>') +
    (view.actionOutcomes.length
      ? section('Varasemate tegevuste järelkontroll', view.actionOutcomes.slice(0, 3).map(a =>
          p((a.title || 'Kokkulepitud tegevus') + ': ' +
            (a.outcome?.result || 'mõõdetud tulemus puudub'))).join(''))
      : '') +
    '<table role="presentation" width="100%" style="margin-top:20px;"><tr><td align="center" style="background:#14253b;padding:15px;">' +
    '<a href="' + reportUrl + '" style="font-weight:bold;color:white;text-decoration:none;">Ava sama aruande mõõtmised ja tegevused</a>' +
    '</td></tr></table>' +
    mild('Aruande versioon ' + view.version + '. Töölaua numbrid, HR PDF ja see e-kiri pärinevad samast salvestatud aruandest. Järelkontroll ei tõenda üksinda põhjuslikku seost.') +
    '</td></tr></table></td></tr></table></body></html>';
}
export function renderVisualWeeklyEmail(snapshot, trends, options = {}) {
  return buildEmail(snapshot, trends, options);
}
export function renderVisualWeeklyEmailPackage(snapshot, trends, options = {}) {
  const metrics = snapshot?.metrics || [];
  const eligible = PRIORITY.map(key => metricByKey(metrics, key)).filter(isAvailable);
  const historical = savedEmailTrends(snapshot, trends);
  const embeddedKeys = [];
  const attachments = [];
  for (const metric of eligible) {
    if (attachments.length >= 1) break;
    if (metric.key !== 'meeting_hours') continue;
    const key = HIST_KEYS[metric.key];
    if (!key) continue;
    const history = (historical?.weekly || []).slice(-8);
    const reference = (historical?.insights || []).find(item => item.metric === key)?.baseline ?? metric.baseline;
    const png = createTrendPng(history, key, { baseline: Number.isFinite(reference) ? reference : null });
    if (!png) continue;
    embeddedKeys.push(metric.key);
    attachments.push({
      filename: 'signaltrue-' + key + '.png',
      content: png.toString('base64'),
      contentId: 'st-weekly-' + key,
      content_type: 'image/png',
    });
  }
  return { html: buildEmail(snapshot, historical, { ...options, embeddedKeys }), attachments };
}
