#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({ html: false });

function renderMarkdownToPDF(mdText, outPath) {
  const tokens = md.parse(mdText, {});
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  // Title page
  const title = 'SignalTrue — Product Logic and System Overview';
  const subtitle = `Generated from codebase on ${new Date().toISOString().slice(0,10)}`;
  doc.fontSize(24).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(12).font('Helvetica').text(subtitle, { align: 'center' });
  doc.addPage();

  // Build a simple TOC from heading tokens
  const headings = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'heading_open') {
      const level = Number(t.tag.replace('h', ''));
      const content = tokens[i+1] && tokens[i+1].type === 'inline' ? tokens[i+1].content : '';
      headings.push({ level, content });
    }
  }

  doc.fontSize(18).font('Helvetica-Bold').text('Table of Contents', { underline: true });
  doc.moveDown(0.5);
  headings.forEach(h => {
    const indent = (h.level - 1) * 10;
    doc.fontSize(12).font('Helvetica').text(h.content, { indent, continued: false });
  });
  doc.addPage();

  // Render tokens simply
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === 'heading_open') {
      const level = Number(t.tag.replace('h', ''));
      const inline = tokens[i+1];
      const text = inline && inline.type === 'inline' ? inline.content : '';
      doc.moveDown(0.5);
      if (level === 1) doc.fontSize(20).font('Helvetica-Bold').text(text);
      else if (level === 2) doc.fontSize(16).font('Helvetica-Bold').text(text);
      else doc.fontSize(14).font('Helvetica-Bold').text(text);
      i += 3; // skip heading_open, inline, heading_close
      continue;
    }

    if (t.type === 'paragraph_open') {
      const inline = tokens[i+1];
      const text = inline && inline.type === 'inline' ? inline.content : '';
      doc.moveDown(0.2);
      doc.fontSize(11).font('Helvetica').text(text, { align: 'left' });
      i += 3; // paragraph_open, inline, paragraph_close
      continue;
    }

    if (t.type === 'bullet_list_open') {
      i++;
      while (tokens[i] && tokens[i].type !== 'bullet_list_close') {
        if (tokens[i].type === 'list_item_open') {
          const inline = tokens[i+2];
          const text = inline && inline.type === 'inline' ? inline.content : '';
          doc.list([text], { bulletIndent: 20 });
          i += 4; // list_item_open, paragraph_open, inline, paragraph_close, list_item_close
          continue;
        }
        i++;
      }
      i++; // skip bullet_list_close
      continue;
    }

    // code fence
    if (t.type === 'fence') {
      doc.moveDown(0.2);
      doc.font('Courier').fontSize(9).text(t.content, { paragraphGap: 6, monospace: true });
      doc.font('Helvetica');
      i++;
      continue;
    }

    i++;
  }

  // Note: page numbers omitted in this fallback renderer. For full page numbers,
  // prefer a headless-chrome renderer (puppeteer) or a multi-pass PDF writer.

  doc.end();
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(outPath));
    stream.on('error', reject);
  });
}

const mdPath = path.resolve(process.argv[2] || './SignalTrue_Product_Logic_and_System_Overview.md');
const outPdf = path.resolve(process.argv[3] || './SignalTrue_Product_Logic_and_System_Overview.pdf');

const mdText = fs.readFileSync(mdPath, 'utf8');
renderMarkdownToPDF(mdText, outPdf).then(p => console.log('PDF generated:', p)).catch(err => { console.error(err); process.exit(1); });
