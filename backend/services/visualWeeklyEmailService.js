// Gmail-compatible weekly visual brief. Tables and inline styles are intentional:
// most email clients do not reliably support inline SVG or JavaScript charts.
const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const format = (v, unit = '') => v == null || !Number.isFinite(Number(v)) ? 'Not measured' : `${Number(v).toLocaleString('en-GB', { maximumFractionDigits: 1 })}${unit === '%' ? '%' : unit === 'hours' ? 'h' : ''}`;
const shortDate = (v) => v ? new Date(v).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}) : '—';
function chartTable(points, metric, unit) {
  const values = points.filter(p => p && Number.isFinite(p[metric])).map(p => Number(p[metric]));
  if (values.length < 2) return '<p style="color:#92400e;font-size:13px;">Not enough comparable historical observations to show a timeline.</p>';
  const ceiling = Math.max(...values, 1) * 1.12;
  const bars = points.map(p => {
    const raw = p?.[metric];
    const measured = Number.isFinite(raw);
    const height = measured ? Math.max(3, Math.round(raw / ceiling * 125)) : 0;
    return `<td width="${Math.floor(100 / points.length)}%" style="height:158px;vertical-align:bottom;text-align:center;padding:0 3px;border-bottom:1px solid #cbd5e1;">
      <div style="font-size:10px;color:#475569;margin-bottom:6px;">${measured ? escapeHtml(format(raw,unit)) : '—'}</div>
      ${measured ? `<div style="height:${height}px;background:#0284c7;border-radius:4px 4px 0 0;margin:0 auto;width:65%;max-width:46px;"></div>` : '<div style="height:18px;border:1px dashed #cbd5e1;margin:0 auto;width:65%;"></div>'}
    </td>`;
  }).join('');
  const dates = points.map(p => `<td style="padding:7px 1px 0;text-align:center;color:#64748b;font-size:10px;">${escapeHtml(shortDate(p.date))}</td>`).join('');
  return `<table role="img" aria-label="Timeline of measured ${escapeHtml(metric)}. X axis is time, height represents measured value." width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border-collapse:collapse;"><tr>${bars}</tr><tr>${dates}</tr></table>`;
}
function metricCard(metric) {
  if (!metric) return '';
  const available = metric.available === true;
  const primary = available ? metric.display && String(metric.display).includes('Insufficient') ? 'Not measured' : format(metric.current, metric.unit) : 'Not measured';
  const delta = available && metric.changePct != null ? `${metric.changePct > 0 ? '+' : ''}${metric.changePct}% versus prior week` : 'Coverage / comparison unavailable';
  return `<td width="50%" valign="top" style="padding:5px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;"><tr><td style="padding:15px;"><div style="color:#64748b;font-size:11px;font-weight:700;">${escapeHtml(metric.label)}</div><div style="font-size:24px;color:#0f172a;font-weight:750;margin-top:5px;">${escapeHtml(primary)}</div><div style="font-size:11px;color:#475569;margin-top:4px;">${escapeHtml(delta)}</div></td></tr></table></td>`;
}
function chartSection(name, key, snapshot, trends, unit) {
  const metric = snapshot.metrics?.find(m => m.key === key);
  if (!metric) return '';
  if (key === 'meeting_hours') return '';
  if (metric.available !== true) {
    return `<div style="border:1px solid #fcd34d;background:#fffbeb;border-radius:10px;padding:14px;margin-top:12px;"><strong style="font-size:13px;color:#92400e;">${escapeHtml(name)}: insufficient evidence</strong><p style="font-size:12px;color:#78350f;margin:5px 0 0;">${escapeHtml(metric.readiness?.mappedUsers ?? '?')} of ${escapeHtml(metric.readiness?.totalUsers ?? '?')} employees represented. No organization-wide trend is inferred.</p></div>`;
  }
  const points = (trends?.weekly || []).slice(-7);
  const comparable = points.filter(p => p?.[key] != null);
  if (comparable.length < 2) return `<p style="font-size:13px;color:#64748b;">${escapeHtml(name)}: not enough historical points yet.</p>`;
  const baseline = metric.baseline == null ? '' : ` · six-week baseline: ${format(metric.baseline,unit)}`;
  return `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-top:14px;"><h3 style="font-size:15px;color:#0f172a;margin:0 0 5px;">${escapeHtml(name)}</h3><p style="font-size:11px;color:#64748b;margin:0 0 12px;">X: week · Y: ${escapeHtml(unit || 'count')} · last seven weekly source snapshots${escapeHtml(baseline)}</p>${chartTable(points,key,unit)}<p style="font-size:11px;color:#64748b;margin:11px 0 0;">Weekly bars use recorded rolling seven-day values. Missing records show as gaps.</p></div>`;
}
export function renderVisualWeeklyEmail(snapshot, trends, { appUrl = 'https://app.signaltrue.ai' } = {}) {
  if (!snapshot) throw new Error('Weekly report snapshot unavailable');
  const metrics = snapshot.metrics || [];
  const meetings = metrics.find(m => m.key === 'meetings');
  const focus = metrics.find(m => m.key === 'focus_time');
  const afterHours = metrics.find(m => m.key === 'after_hours');
  const calendarReady = meetings?.available === true;
  const allReady = [meetings, focus, afterHours].every(m => m?.available === true);
  const coverage = snapshot.coverage || {};
  const label = !calendarReady ? 'Calendar evidence incomplete' : !allReady ? 'Calendar trend observed · collaboration incomplete' : snapshot.status?.label || 'Report available';
  const health = !allReady ? 'Limited evidence: do not infer organization-wide stability from unavailable metrics.' : 'Observed activity is not a measure of wellbeing or productivity.';
  const topObservation = (snapshot.observations || []).find(o => o?.type !== 'data_quality')?.text || (calendarReady ? 'No material shift identified in eligible calendar metrics.' : 'There are not enough eligible measurements for a full assessment.');
  const nextAction = !afterHours?.available
    ? 'IT / administrator: verify Microsoft Teams permissions, message collection, and team/user mapping. Review coverage before interpreting messaging patterns.'
    : !focus?.available
      ? 'IT / administrator: verify focus-availability calculation and data coverage before using focus-time comparisons.'
      : snapshot.actions?.primary?.action || 'Continue observing the measured trend and investigate persistent changes before adjusting work design.';
  const p = '<p style="font-size:13px;line-height:1.6;color:#475569;margin:7px 0;">';
  const href = escapeHtml(appUrl.replace(/\/$/,'') + '/app/latest-brief');
  return `<!doctype html><html lang="en"><body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:18px 10px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">
  <tr><td style="background:#10223a;padding:26px 24px;color:white;"><div style="font-size:11px;font-weight:700;letter-spacing:1.3px;color:#93c5fd;">SIGNALTRUE · WEEKLY INTELLIGENCE</div><h1 style="font-size:23px;line-height:1.2;margin:10px 0 5px;color:white;">${escapeHtml(snapshot.orgName)}</h1><div style="font-size:12px;color:#cbd5e1;">${shortDate(snapshot.periodStart)} – ${shortDate(snapshot.periodEnd)}</div></td></tr>
  <tr><td style="padding:22px 20px 8px;"><div style="font-size:11px;color:#64748b;font-weight:700;">EXECUTIVE READOUT</div><h2 style="font-size:19px;line-height:1.35;margin:6px 0;">${escapeHtml(label)}</h2><p style="font-size:13px;line-height:1.6;color:#475569;margin:5px 0;">${escapeHtml(health)}</p><p style="font-size:12px;color:#64748b;">Evidence grade: <strong>${escapeHtml(snapshot.status?.evidenceGrade || 'Not available')}</strong> · User attribution: ${escapeHtml(coverage.mappingCoveragePct ?? '?')}%</p></td></tr>
  <tr><td style="padding:2px 15px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${metricCard(meetings)}${metricCard(afterHours)}</tr></table></td></tr>
  <tr><td style="padding:8px 20px;">${chartSection('Meeting count over time','meetings',snapshot,trends,'meetings')}${chartSection('After-hours messaging over time','after_hours',snapshot,trends,'%')}${chartSection('Uninterrupted time over time','focus_time',snapshot,trends,'hours')}</td></tr>
  <tr><td style="padding:18px 22px 4px;"><div style="border-left:4px solid #0284c7;background:#f1f5f9;padding:13px 15px;"><strong style="font-size:13px;">What changed</strong>${p}${escapeHtml(topObservation)}</p></div><div style="border-left:4px solid #d97706;background:#fffbeb;padding:13px 15px;margin-top:10px;"><strong style="font-size:13px;">Next action</strong>${p}${escapeHtml(nextAction)}</p></div></td></tr>
  <tr><td style="padding:18px 22px 20px;"><a href="${href}" style="display:block;text-align:center;background:#10223a;color:#ffffff;text-decoration:none;padding:14px;border-radius:8px;font-size:14px;font-weight:700;">Explore 1W / 1M / 3M / 6M timelines and decisions</a><p style="font-size:11px;line-height:1.6;color:#64748b;margin:15px 0 0;">Only recorded organization-level metadata is charted. A measurement can be missing even when other sources are connected. Historical source coverage and denominators may change. This report does not diagnose employee wellbeing, engagement, burnout or performance.</p></td></tr>
  </table></td></tr></table></body></html>`;
}
