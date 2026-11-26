import PDFDocument from 'pdfkit';
import { buildHRReportPresentation, formatHRValue, formatHRDelta, reportLanguage } from './weeklyReportPresentationService.js';

const NAVY = '#12253B';
const TEXT = '#26374B';
const MUTED = '#64748B';
const LINE = '#E2E8F0';
const TEAL = '#0F766E';
const WARN = '#92400E';
const MARGIN = 44;
const WIDTH = 595.28;
// Helvetica uses WinAnsi. Map the locale's Unicode minus to its printable hyphen.
const safeText = value => String(value ?? '').replaceAll('−', '-').replace(/[\x00-\x1f]/g, ' ').slice(0, 320);

const text = {
  et: {
    unavailable: 'Puudub',
    vsPrior: ' eelmisega',
    noComparison: 'Võrdlus vajab kontrolli',
    missing: 'Andmeid ei ole',
    insufficientHistory: 'Koosolekuaja ajalugu: võrreldavaid mõõdetud perioode ei ole veel piisavalt.',
    footer: ' | Allikas: salvestatud nädala aruanne | Lk ',
    dateUnknown: 'kuupäev puudub',
    documentTitle: 'SignalTrue | Nädala töökorralduse aruanne',
    to: ' kuni ',
    title: 'Nädala töökorralduse aruanne',
    finding: 'NÄDALA TÄHELEPANEK',
    metrics: 'Peamised mõõtmised',
    history: 'Koosolekuaeg läbi nädalate',
    investigate: 'Mida edasi kontrollida?',
    investigationHint: 'Arutage tiimiga, mis sel perioodil muutus. Sõnumite arvust ei saa järeldada töö tulemuslikkust ega kestust.',
    methods: 'Mõõtmise taust ja järelkontroll',
    sources: 'Mõõdikute päritolu ja võrreldavus',
    dataUnavailable: 'Andmed puuduvad',
    coverage: ' | Katvus: ',
    unknown: 'teadmata',
    comparable: 'Võrreldav eelmise perioodiga',
    withheld: 'Võrdlus puudub',
    verification: 'Andmete kontroll',
    verified: 'Algandmed on salvestatud aruandega vastavusse viidud.',
    followUp: 'Tegevused ja järelkontroll',
    noOutcome: 'Selle perioodi järelkontrollil puudub mõõdetud tulemus. Muudatuse korral pange kirja vastutaja, alusmõõdik ja kontrollkuupäev.',
    status: 'Seis: ',
    pending: 'täpsustamisel',
    outcome: ' | Tulemus: ',
    unmeasured: 'veel mõõtmata',
    causation: 'Enne ja pärast mõõtmine ei tõenda põhjuslikku seost.',
  },
  en: {
    unavailable: 'Unavailable',
    vsPrior: ' vs prior period',
    noComparison: 'No comparable baseline',
    missing: 'Data unavailable',
    insufficientHistory: 'There are too few measured periods to chart meeting time.',
    footer: ' | Saved weekly report | Page ',
    dateUnknown: 'date unavailable',
    documentTitle: 'SignalTrue | Weekly work patterns',
    to: ' to ',
    title: 'Weekly work patterns',
    finding: 'WEEKLY FINDING',
    metrics: 'Measurements',
    history: 'Meeting time by week',
    investigate: 'What to investigate',
    investigationHint: 'Ask the team what changed during the period. Message counts cannot establish working time or performance.',
    methods: 'Coverage and follow-up',
    sources: 'Sources and comparisons',
    dataUnavailable: 'Unavailable',
    coverage: ' | Coverage: ',
    unknown: 'unknown',
    comparable: 'Comparable with the previous period',
    withheld: 'Comparison unavailable',
    verification: 'Source verification',
    verified: 'The saved report has been reconciled to its source records.',
    followUp: 'Actions and follow-up',
    noOutcome: 'No measured follow-up was recorded for this period. Record the owner, baseline metric and review date when a change is agreed.',
    status: 'Status: ',
    pending: 'pending',
    outcome: ' | Outcome: ',
    unmeasured: 'unmeasured',
    causation: 'A before-and-after measurement cannot establish causation.',
  },
};

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

function drawMetricCard(doc, metric, x, y, width, lang) {
  const copy = text[lang];
  doc.roundedRect(x, y, width, 103, 8).fill('#F3F6FA');
  doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT).text(metric.short, x + 12, y + 12, {
    width: width - 24,
  });
  doc.font('Helvetica-Bold').fontSize(21).fillColor(NAVY)
    .text(metric.available ? formatHRValue(metric, metric.current, lang) : copy.unavailable, x + 12, y + 35, { width: width - 24 });
  let comparison = metric.comparable
    ? formatHRDelta(metric, lang) + copy.vsPrior
    : copy.noComparison;
  if (!metric.available) comparison = copy.missing;
  doc.font('Helvetica').fontSize(8.5).fillColor(metric.comparable ? TEAL : WARN)
    .text(safeText(comparison), x + 12, y + 73, { width: width - 24 });
}

function chart(doc, snapshot, y, lang) {
  const copy = text[lang];
  const history = (snapshot.trend || []).slice(-7);
  const points = history.map((row, index) => ({
    x: index,
    value: row.meetingHours == null || !Number.isFinite(Number(row.meetingHours)) ? null : Number(row.meetingHours),
    label: safeText(row.label || ''),
  }));
  const valid = points.filter(p => p.value !== null);
  if (valid.length < 2) return paragraph(doc,
    copy.insufficientHistory, MARGIN, y, 500, 10, MUTED);
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

function footer(doc, version, page, lang) {
  const copy = text[lang];
  const y = 780;
  doc.strokeColor(LINE).moveTo(MARGIN, y - 8).lineTo(WIDTH - MARGIN, y - 8).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
    .text(safeText(version) + copy.footer + page, MARGIN, y, { width: 480 });
}

export function renderWeeklyHRPdf(snapshot, stream) {
  const lang = reportLanguage(snapshot);
  const view = buildHRReportPresentation(snapshot, lang);
  const copy = text[lang];
  const dateFormat = new Intl.DateTimeFormat(lang === 'et' ? 'et-EE' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: snapshot.reportTimeZone || 'UTC',
  });
  const dateLabel = value => value && Number.isFinite(new Date(value).getTime())
    ? dateFormat.format(new Date(value)) : copy.dateUnknown;
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, info: {
    Title: copy.documentTitle,
    Author: 'SignalTrue',
    Subject: view.version,
  } });
  doc.pipe(stream);
  const period = dateLabel(view.periodStart) + copy.to + dateLabel(
    new Date(new Date(view.periodEnd).getTime() - 1)
  );
  pageHead(doc, view.orgName, copy.title, period);
  doc.roundedRect(MARGIN, 153, 506, 85, 8).fill('#E8F4F0');
  doc.font('Helvetica-Bold').fontSize(10).fillColor(TEAL)
    .text(copy.finding, MARGIN + 14, 168);
  paragraph(doc, view.description, MARGIN + 14, 188, 474, 11);
  let y = 257;
  y = section(doc, copy.metrics, y);
  const cardWidth = 246;
  view.metrics.forEach((m, i) => drawMetricCard(
    doc, m, MARGIN + (i % 2) * (cardWidth + 14), y + Math.floor(i / 2) * 116, cardWidth, lang
  ));
  y += 247;
  y = section(doc, copy.history, y);
  y = chart(doc, snapshot, y, lang);
  if (y < 730) {
    y = section(doc, copy.investigate, y + 6);
    paragraph(doc, copy.investigationHint, MARGIN, y, 505);
  }
  footer(doc, view.version, 1, lang);

  doc.addPage();
  pageHead(doc, view.orgName, copy.methods, period);
  y = section(doc, copy.sources, 157);
  for (const metric of view.metrics) {
    doc.strokeColor(LINE).moveTo(MARGIN, y + 58).lineTo(WIDTH - MARGIN, y + 58).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT).text(metric.label, MARGIN, y, { width: 314 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY)
      .text(metric.available ? formatHRValue(metric, metric.current, lang) : copy.dataUnavailable, MARGIN + 356, y, { width: 147, align: 'right' });
    paragraph(doc, metric.source + copy.coverage +
      (metric.mappedUsers == null ? copy.unknown : metric.mappedUsers + '/' + (metric.totalUsers ?? '?')) +
      ' | ' + (metric.comparable ? copy.comparable : (metric.withheldReason || copy.withheld)),
      MARGIN, y + 23, 500, 8, metric.comparable ? MUTED : WARN);
    y += 70;
  }
  y = section(doc, copy.verification, y + 14);
  paragraph(doc, view.sourceWarning || copy.verified,
    MARGIN, y, 503, 10, view.sourceReconciled ? TEAL : WARN);
  y += 56;
  y = section(doc, copy.followUp, y);
  const outcomes = view.actionOutcomes.slice(0, 3);
  if (!outcomes.length) {
    y = paragraph(doc,
      copy.noOutcome,
      MARGIN, y, 500, 10);
  } else {
    for (const action of outcomes) {
      if (y > 745) break;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text(safeText(action.title), MARGIN, y, { width: 500 });
      y = paragraph(doc, copy.status + safeText(action.status || copy.pending) +
        copy.outcome + safeText(action.outcome?.result || copy.unmeasured), MARGIN, y + 18, 500, 9) + 12;
    }
  }
  paragraph(doc, copy.causation, MARGIN, Math.min(748, y + 15), 500, 9, MUTED);
  footer(doc, view.version, 2, lang);
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
