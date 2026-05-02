#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt({ html: true, linkify: true });

async function mdToPdf(mdPath, outPdf) {
  const mdText = fs.readFileSync(mdPath, 'utf8');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>SignalTrue Product Overview</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:40px;color:#111}h1,h2,h3{color:#111}pre{background:#f6f8fa;padding:12px;border-radius:6px;overflow:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}</style></head><body>${md.render(mdText)}</body></html>`;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-zygote']
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({ path: outPdf, format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
  await browser.close();
}

const mdPath = path.resolve(process.argv[2] || './SignalTrue_Product_Logic_and_System_Overview.md');
const outPdf = path.resolve(process.argv[3] || './SignalTrue_Product_Logic_and_System_Overview.pdf');

mdToPdf(mdPath, outPdf)
  .then(() => console.log('PDF generated at', outPdf))
  .catch(err => { console.error(err); process.exit(1); });
