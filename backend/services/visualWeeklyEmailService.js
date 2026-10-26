// Email-safe executive reporting. Pure HTML tables + inline styles work without JS,
// externally hosted charts or SVG. Historical records are source-backed and null-safe.
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const num = (v, unit = '') => v == null || !Number.isFinite(Number(v)) ? 'Not measured'
  : Number(v).toLocaleString('en-GB', { maximumFractionDigits: 1 }) + (unit === '%' ? '%' : unit === 'hours' ? ' h' : '');
const date = v => v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '—';
function headerCard(metric) {
  if (!metric) return '';
  const eligible = metric.available === true;
  const latest = eligible ? num(metric.current, metric.unit) : 'Unavailable';
  const change = eligible && metric.changePct != null ?
    (metric.changePct > 0 ? '+' : '') + metric.changePct + '% versus previous report' : 'Insufficient comparable evidence';
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;">' +
    '<tr><td style="padding:15px 16px;"><span style="font-size:12px;color:#64748b;font-weight:bold;">' + esc(metric.label) + '</span>' +
    '<div style="font-size:26px;font-weight:bold;color:#10223a;margin:7px 0;">' + esc(latest) + '</div>' +
    '<div style="font-size:12px;color:#475569;">' + esc(change) + '</div></td></tr></table>';
}
// Each horizontal bar is a completed, consistently sampled rolling-seven-day
// observation. Its width encodes Y against zero; the row date is the time axis.
// No fake bars, no browser-only gradients, no truncated cellphone columns.
export function emailTimeline(points, key, unit = '') {
  const observed = (points || []).filter(p => Number.isFinite(p?.[key]));
  if (observed.length < 2) return '<p style="font-size:13px;color:#64748b;">Insufficient comparable historical observations. No trend chart is shown.</p>';
  const max = Math.max(1, ...observed.map(p => Number(p[key])));
  const rows = (points || []).map(p => {
    const value = p?.[key];
    const available = Number.isFinite(value);
    const width = available ? Math.min(100, Math.max(3, Math.round(value / max * 100))) : 0;
    return '<tr>' +
      '<td width="79" style="padding:7px 8px 7px 0;color:#64748b;font-size:11px;white-space:nowrap;">' + esc(date(p.date)) + '</td>' +
      '<td style="padding:7px 5px;"><div style="background:#f1f5f9;height:11px;border-radius:3px;">' +
      (available ? '<div style="height:11px;width:' + width + '%;background:#2563eb;border-radius:3px;"></div>' : '') +
      '</div></td><td width="82" style="text-align:right;color:#10223a;font-size:11px;font-weight:bold;padding:7px 0;">' +
      esc(available ? num(value, unit) : 'No data') + '</td></tr>';
  }).join('');
  return '<table role="img" aria-label="Historical ' + esc(key) + ' measured for completed weeks" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border-collapse:collapse;">' + rows + '</table>';
}
function trendBlock(snapshot, trend, key, title, unit) {
  const metric = snapshot.metrics?.find(m => m.key === key);
  if (!metric) return '';
  if (metric.available !== true) {
    const covered = metric.readiness?.mappedUsers, total = metric.readiness?.totalUsers;
    return '<table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;">' +
      '<tr><td style="padding:12px 15px;"><strong style="font-size:13px;color:#92400e;">' + esc(title) + ': coverage insufficient</strong>' +
      '<p style="font-size:12px;line-height:1.5;color:#78350f;margin:5px 0 0;">' +
      (covered != null && total != null ? esc(covered + ' of ' + total + ' people represented. ') : '') +
      'No organization-wide trend is inferred. Source access or mapping requires review.</p></td></tr></table>';
  }
  const history = (trend?.weekly || []).slice(-6);
  if (history.filter(p => Number.isFinite(p?.[key])).length < 2) return '';
  const insight = trend?.insights?.find(i => i.metric === key);
  return '<table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="margin-top:13px;border:1px solid #e2e8f0;border-radius:8px;">' +
    '<tr><td style="padding:13px 14px;"><strong style="font-size:14px;color:#10223a;">' + esc(title) + '</strong>' +
    '<p style="font-size:11px;line-height:1.4;color:#64748b;margin:5px 0 8px;">Six completed weeks · consistent observation weekday · rolling seven-day values · Y: ' + esc(unit) + '</p>' +
    emailTimeline(history, key, unit) +
    (insight ? '<p style="font-size:12px;line-height:1.5;color:#334155;margin:10px 0 0;">Earlier median: ' +
      esc(num(insight.baseline, unit)) + ' · ' + esc(insight.statement) + '</p>' : '') +
    '</td></tr></table>';
}
export function renderVisualWeeklyEmail(snapshot, trends, { appUrl = 'https://www.signaltrue.ai' } = {}) {
  if (!snapshot) throw new Error('Weekly snapshot unavailable');
  const metrics = snapshot.metrics || [];
  const meetings = metrics.find(m => m.key === 'meetings');
  const afterHours = metrics.find(m => m.key === 'after_hours');
  const focus = metrics.find(m => m.key === 'focus_time');
  const gaps = !meetings?.available || !afterHours?.available || !focus?.available;
  const label = !meetings?.available ? 'Not enough calendar evidence' :
    gaps ? 'Partial evidence, calendar activity observed' : snapshot.status?.label || 'Weekly evidence available';
  const changes = (trends?.insights || []).filter(i => i.material && metrics.some(m => m.key === i.metric && m.available)).slice(0, 2);
  const first = changes[0];
  const observation = first ?
    'Observed ' + (metrics.find(m => m.key === first.metric)?.label || first.metric).toLowerCase() +
      ' is ' + Math.abs(first.deltaPct) + '% ' + (first.deltaPct > 0 ? 'above' : 'below') +
      ' the earlier six-week median. ' + first.statement :
    (snapshot.observations || []).find(o => o.type === 'measured_change')?.observation ||
      'No sustained historical change is confirmed from the available comparable observations.';
  const action = !afterHours?.available
    ? 'IT / administrator: verify Microsoft Teams permissions, message collection and user/team mapping. Review coverage before interpreting messaging patterns.'
    : !focus?.available
      ? 'Administrator: verify calendar calculation and sufficient measurement coverage before interpreting uninterrupted availability.'
      : snapshot.actions?.primary?.action || 'Continue observing comparable trends. Verify organizational context before changing how work is arranged.';
  const owner = snapshot.actions?.primary?.owner ? 'Owner: ' + esc(snapshot.actions.primary.owner) + '. ' : '';
  const review = snapshot.actions?.primary?.reviewWindow ? 'Review: ' + esc(snapshot.actions.primary.reviewWindow) + '.' : '';
  const contexts = (trends?.annotations || []).filter(e => e.kind === 'context').slice(-2);
  const contextLine = contexts.length ? '<p style="font-size:11px;line-height:1.5;color:#64748b;">Context logged: ' +
    contexts.map(e => esc(date(e.date) + ' ' + e.title)).join('; ') + '. Context may explain a change but cannot dismiss evidence.</p>' : '';
  const href = esc(appUrl.replace(/\/$/, '') + '/app/latest-brief');
  const box = (title, content, bg, border) => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + bg +
    ';border-left:4px solid ' + border + ';margin-top:10px;"><tr><td style="padding:13px 15px;">' +
    '<strong style="font-size:13px;color:#10223a;">' + esc(title) + '</strong><p style="font-size:13px;line-height:1.6;color:#334155;margin:7px 0 0;">' +
    content + '</p></td></tr></table>';
  return '<!doctype html><html lang="en"><body style="margin:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#10223a;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:12px 7px;">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;">' +
    '<tr><td style="background:#10223a;padding:24px 20px;color:#ffffff;">' +
    '<div style="font-size:11px;color:#93c5fd;font-weight:bold;letter-spacing:1.1px;">SIGNALTRUE · WEEKLY WORK-PATTERN INTELLIGENCE</div>' +
    '<h1 style="font-size:23px;line-height:1.25;margin:10px 0 5px;color:#ffffff;">' + esc(snapshot.orgName) + '</h1>' +
    '<div style="font-size:12px;color:#cbd5e1;">' + esc(date(snapshot.periodStart)) + ' – ' + esc(date(snapshot.periodEnd)) + '</div></td></tr>' +
    '<tr><td style="padding:20px 17px;"><div style="font-size:11px;color:#64748b;font-weight:bold;">THE ONE-MINUTE READ</div>' +
    '<h2 style="font-size:19px;line-height:1.3;margin:7px 0 4px;">' + esc(label) + '</h2>' +
    '<p style="font-size:12px;line-height:1.55;color:#64748b;margin:5px 0 14px;">' +
    (gaps ? 'Not all work patterns can be assessed. Missing measurements are not proof of stability.' :
      'These are recorded activity patterns, not a measure of wellbeing, productivity or engagement.') +
    ' Evidence grade: ' + esc(snapshot.status?.evidenceGrade || 'not assessed') + '.</p>' +
    headerCard(meetings) +
    box('What deserves attention', esc(observation), '#f1f5f9', '#2563eb') +
    box('Next action', esc(action) + '<br><small>' + owner + review + '</small>', '#fffbeb', '#d97706') +
    trendBlock(snapshot, trends, 'meetings', 'Meeting count over time', 'meetings') +
    trendBlock(snapshot, trends, 'after_hours', 'After-hours messaging over time', '%') +
    trendBlock(snapshot, trends, 'focus_time', 'Uninterrupted calendar availability over time', 'hours') +
    contextLine +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr><td style="background:#10223a;padding:14px 12px;text-align:center;">' +
    '<a href="' + href + '" style="font-size:13px;font-weight:bold;color:#ffffff;text-decoration:none;">Explore the interactive dashboard: 1W · 1M · 3M · 6M</a></td></tr></table>' +
    '<p style="font-size:11px;line-height:1.6;color:#64748b;margin:15px 0 0;">Each historical bar is a consistently sampled seven-day observation from a completed UTC week. No missing value is invented. Team detail and technical diagnostics are available only in the access-controlled dashboard.</p>' +
    '</td></tr></table></td></tr></table></body></html>';
}
