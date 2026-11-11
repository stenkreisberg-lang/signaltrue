import PDFDocument from 'pdfkit';
import { buildHRReportPresentation, formatHRValue } from './weeklyReportPresentationService.js';

const NAVY = '#12253B';
const TEXT = '#26374B';
const MUTED = '#64748B';
const LINE = '#E2E8F0';
const TEAL = '#0F766E';
const WARN = '#92400E';
const MARGIN = 44;
const WIDTH = 595.28;
const DATE_FORMAT = new Intl.DateTimeFormat('et-EE', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Tallinn',
});
const dateLabel = value => value && Number.isFinite(new Date(value).getTime())
  ? DATE_FORMAT.format(new Date(value)) : 'kuupäev puudub';
const safeText = value => String(value ?? '').replace(/[\x00-\x1f]/g, ' ').slice(0, 320);

function paragraph(doc, value, x, y, width, size = 10, color = TEXT) {
  doc.font('Helvetica').fontSize(size).fillColor(color).text(safeText(value), x, y, {
    width, lineGap: 3,
  });
  return doc.y;
}

function pageHead(doc, orgName, title, period) {
  doc.rect(0, 0, WIDTH, 134).fill(NAVY);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#9EE1D0').text('SIGNALTRUE', MARGIN, 29);
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#FFFFFF').text(title, MARGIN, 54, { width: 500 });
  doc.font('Helvetica').fontSize(10).fillColor('#DAE4EF')
    .text(safeText(orgName) + ' | ' + safeText(period), MARGIN, 103, { width: 500 });
}

function section(doc, title, y) {
  doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY).text(title, MARGIN, y);
  return y + 25;
}

function drawMetricCard(doc, metric, x, y, width) {
  doc.roundedRect(x, y, width, 103, 8).fill('#F3F6FA');
  doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT).text(metric.short, x + 12, y + 12, {
    width: width - 24,
  });
  doc.font('Helvetica-Bold').fontSize(21).fillColor(NAVY)
    .text(metric.available ? formatHRValue(metric) : 'Puudub', x + 12, y + 35, { width: width - 24 });
  let comparison = metric.comparable
    ? (metric.delta > 0 ? '+' : '') + formatHRValue({ unit: metric.unit }, metric.delta) + ' eelmisega'
    : 'Võrdlus vajab kontrolli';
  if (!metric.available) comparison = 'Andmeid ei ole';
  doc.font('Helvetica').fontSize(8.5).fillColor(metric.comparable ? TEAL : WARN)
    .text(comparison, x + 12, y + 73, { width: width - 24 });
}

function chart(doc, snapshot, y) {
  const history = (snapshot.trend || []).slice(-7);
  const points = history.map((row, index) => ({
    x: index,
    value: row.meetingHours == null || !Number.isFinite(Number(row.meetingHours)) ? null : Number(row.meetingHours),
    label: safeText(row.label || ''),
  }));
  const valid = points.filter(p => p.value !== null);
  if (valid.length < 2) return paragraph(doc,
    'Koosolekuaja ajalugu: võrreldavaid mõõdetud perioode ei ole veel piisavalt.', MARGIN, y, 500, 10, MUTED);
  const x0 = MARGIN + 28, w = 445, h = 92;
  const vals = valid.map(p => p.value);
  const ymin = Math.min(0, ...vals);
  const ymax = Math.max(1, ...vals) * 1.15;
  doc.strokeColor(LINE).lineWidth(0.7).moveTo(x0, y + h).lineTo(x0 + w, y + h).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(MUTED);
  let previous = null;
  for (const point of points) {
    const px = x0 + (points.length > 1 ? point.x * w / (points.length - 1) : 0);
    doc.text(point.label, px - 15, y + h + 7, { width: 45, align: 'center' });
    if (point.value === null) {
      previous = null;
      continue; // Never join a line across a missing week.
    }
    const py = y + h - ((point.value - ymin) / (ymax - ymin)) * h;
    if (previous) {
      doc.strokeColor(TEAL).lineWidth(2).moveTo(previous.x, previous.y).lineTo(px, py).stroke();
    }
    doc.circle(px, py, 2.5).fill(TEAL);
    previous = { x: px, y: py };
  }
  return y + h + 32;
}

function footer(doc, version, page) {
  const y = 805;
  doc.strokeColor(LINE).moveTo(MARGIN, y - 8).lineTo(WIDTH - MARGIN, y - 8).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
    .text(safeText(version) + ' | Allikas: salvestatud nädala aruanne | Lk ' + page, MARGIN, y, { width: 480 });
}

export function renderWeeklyHRPdf(snapshot, stream) {
  const view = buildHRReportPresentation(snapshot);
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, info: {
    Title: 'SignalTrue | Nädala töökorralduse aruanne',
    Author: 'SignalTrue',
    Subject: view.version,
  } });
  doc.pipe(stream);
  const period = dateLabel(view.periodStart) + ' kuni ' + dateLabel(
    new Date(new Date(view.periodEnd).getTime() - 1)
  );
  pageHead(doc, view.orgName, 'Nädala töökorralduse aruanne', period);
  doc.roundedRect(MARGIN, 153, 506, 85, 8).fill('#E8F4F0');
  doc.font('Helvetica-Bold').fontSize(10).fillColor(TEAL)
    .text('NÄDALA TÄHELEPANEK', MARGIN + 14, 168);
  paragraph(doc, view.description, MARGIN + 14, 188, 474, 11);
  let y = 257;
  y = section(doc, 'Peamised mõõtmised', y);
  const cardWidth = 246;
  view.metrics.forEach((m, i) => drawMetricCard(
    doc, m, MARGIN + (i % 2) * (cardWidth + 14), y + Math.floor(i / 2) * 116, cardWidth
  ));
  y += 247;
  y = section(doc, 'Koosolekuaeg läbi nädalate', y);
  y = chart(doc, snapshot, y);
  if (y < 730) {
    y = section(doc, 'Mida edasi kontrollida?', y + 6);
    paragraph(doc, 'Võrdle muutust tiimi töökorralduse ja teadaolevate sündmustega. ' +
      'Ära järelda sõnumite arvust töötaja tulemuslikkust ega tööaja kogukestust.', MARGIN, y, 505);
  }
  footer(doc, view.version, 1);

  doc.addPage();
  pageHead(doc, view.orgName, 'Mõõtmise taust ja järelkontroll', period);
  y = section(doc, 'Mõõdikute päritolu ja võrreldavus', 157);
  for (const metric of view.metrics) {
    doc.strokeColor(LINE).moveTo(MARGIN, y + 58).lineTo(WIDTH - MARGIN, y + 58).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT).text(metric.label, MARGIN, y, { width: 314 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY)
      .text(metric.available ? formatHRValue(metric) : 'Andmed puuduvad', MARGIN + 356, y, { width: 147, align: 'right' });
    paragraph(doc, metric.source + ' | Katvus: ' +
      (metric.mappedUsers == null ? 'teadmata' : metric.mappedUsers + '/' + (metric.totalUsers ?? '?')) +
      ' | ' + (metric.comparable ? 'Võrreldav eelmise perioodiga' : (metric.withheldReason || 'Võrdlus puudub')),
      MARGIN, y + 23, 500, 8, metric.comparable ? MUTED : WARN);
    y += 70;
  }
  y = section(doc, 'Andmete kontroll', y + 14);
  paragraph(doc, view.sourceWarning || 'Algandmed on salvestatud aruandega vastavusse viidud.',
    MARGIN, y, 503, 10, view.sourceReconciled ? TEAL : WARN);
  y += 56;
  y = section(doc, 'Tegevused ja järelkontroll', y);
  const outcomes = view.actionOutcomes.slice(0, 3);
  if (!outcomes.length) {
    y = paragraph(doc,
      'Selle aruande perioodil ei ole mõõdetud järelkontrolli tulemust salvestatud. ' +
      'Kui juht teeb muudatuse, tuleb kirja panna vastutaja, alusmõõdik, kontrollkuupäev ning järgmine mõõtmine.',
      MARGIN, y, 500, 10);
  } else {
    for (const action of outcomes) {
      if (y > 745) break;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text(safeText(action.title), MARGIN, y, { width: 500 });
      y = paragraph(doc, 'Seis: ' + safeText(action.status || 'täpsustamisel') +
        ' | Tulemus: ' + safeText(action.outcome?.result || 'veel mõõtmata'), MARGIN, y + 18, 500, 9) + 12;
    }
  }
  paragraph(doc, 'Enne ja pärast mõõtmine ei tõenda iseenesest põhjuslikku seost. ' +
    'Tegevuse sisu ja järelduse kinnitab vastutav inimene.', MARGIN, Math.min(763, y + 20), 500, 9, MUTED);
  footer(doc, view.version, 2);
  doc.end();
  return view.version;
}

export async function weeklyHRPdfBuffer(snapshot) {
  const chunks = [];
  const { Writable } = await import('node:stream');
  const writer = new Writable({ write(chunk, _encoding, callback) { chunks.push(chunk); callback(); } });
  await new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
    renderWeeklyHRPdf(snapshot, writer);
  });
  return Buffer.concat(chunks);
}
