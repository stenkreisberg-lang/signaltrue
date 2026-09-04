import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function htmlFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) return htmlFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.html') ? [fullPath] : [];
  });
}

describe('legacy static public-site analytics', () => {
  const repositoryRoot = process.cwd();
  const pages = [
    ...htmlFiles(path.join(repositoryRoot, 'public')),
    ...htmlFiles(path.join(repositoryRoot, 'marketing')),
  ];

  it('has no static GA loader or inline gtag calls that can bypass collection hygiene', () => {
    for (const page of pages) {
      const html = fs.readFileSync(page, 'utf8');
      expect(html, page).not.toContain('googletagmanager.com/gtag/js');
      expect(html, page).not.toMatch(/\bgtag\s*\(/);
    }
  });

  it('uses the gated static helper wherever legacy pages opt in to analytics', () => {
    const trackedPages = pages.filter((page) =>
      fs.readFileSync(page, 'utf8').includes('/static-analytics.js')
    );
    expect(trackedPages.length).toBeGreaterThan(20);

    const helper = fs.readFileSync(path.join(repositoryRoot, 'public/static-analytics.js'), 'utf8');
    expect(helper).toContain("productionHost = 'www.signaltrue.ai'");
    expect(helper).toContain('send_page_view: false');
    expect(helper).toContain('navigator.webdriver');
    expect(helper).toContain('production[_ -]?smoke');
    expect(helper).toContain("window.signaltrueTrack('primary_cta_click'");
    expect(helper).toContain("window.signaltrueTrack('sample_report_view'");
  });

  it('keeps the legacy contact form on the same short authoritative contract', () => {
    const html = fs.readFileSync(path.join(repositoryRoot, 'marketing/contact.html'), 'utf8');
    const workEmail = html.indexOf('name="email"');
    const company = html.indexOf('name="organization"');
    const name = html.indexOf('name="name"');

    expect(workEmail).toBeGreaterThan(-1);
    expect(company).toBeGreaterThan(workEmail);
    expect(name).toBeGreaterThan(company);
    expect(html).not.toMatch(/name="(?:title|challenge|companySize)"/);
    expect(html).not.toContain('<textarea');
    expect(html).toContain("window.signaltrueTrack('lead_form_start'");
    expect(html).toContain("window.signaltrueTrack('lead_form_error'");
    expect(html).toContain("window.signaltrueTrack('lead_submit_success'");
    expect(html).toContain("window.signaltrueTrack('lead_confirmed'");
    expect(html).toContain("window.signaltrueTrack('booking_link_click'");
    expect(html).toContain('!result.confirmed || !result.leadId');
  });
});
