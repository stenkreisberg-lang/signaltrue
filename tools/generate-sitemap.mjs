import fs from 'node:fs/promises';

const SITE_URL = 'https://www.signaltrue.ai';
const BLOG_API_URL =
  process.env.SITEMAP_BLOG_API_URL || 'https://signaltrue-backend.onrender.com/api/blog';
const OUTPUT_PATHS = [
  new URL('../public/sitemap.xml', import.meta.url),
  new URL('../marketing/sitemap.xml', import.meta.url),
];
const CORE_LAST_MODIFIED = '2026-07-03';

const staticPages = [
  ['/', 'weekly', '1.0'],
  ['/product', 'weekly', '0.9'],
  ['/pricing', 'weekly', '0.9'],
  ['/how-it-works', 'weekly', '0.9'],
  ['/drift-diagnostic', 'weekly', '0.9'],
  ['/sample-report', 'weekly', '0.9'],
  ['/burnout-early-warning-system', 'weekly', '0.95'],
  ['/employee-engagement-leading-indicators', 'weekly', '0.9'],
  ['/signals/meeting-overload', 'monthly', '0.8'],
  ['/signals/recovery-time-collapse', 'monthly', '0.8'],
  ['/signals/focus-fragmentation', 'monthly', '0.8'],
  ['/signals/after-hours-drift', 'monthly', '0.8'],
  ['/signals/responsiveness-pressure', 'monthly', '0.8'],
  ['/signals/coordination-overhead', 'monthly', '0.8'],
  ['/signals/manager-load', 'monthly', '0.8'],
  ['/about', 'monthly', '0.8'],
  ['/contact', 'monthly', '0.8'],
  ['/solutions', 'monthly', '0.8'],
  ['/resources', 'monthly', '0.7'],
  ['/trust', 'monthly', '0.7'],
  ['/blog', 'weekly', '0.7'],
  ['/privacy', 'monthly', '0.5'],
  ['/terms', 'monthly', '0.5'],
  ['/ai-info-page', 'monthly', '0.5'],
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function dateOnly(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? CORE_LAST_MODIFIED : date.toISOString().slice(0, 10);
}

function urlEntry({ url, lastModified, changeFrequency, priority }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(url)}</loc>`,
    `    <lastmod>${lastModified}</lastmod>`,
    changeFrequency ? `    <changefreq>${changeFrequency}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

async function fetchPublishedPosts() {
  const posts = [];
  let page = 1;
  let pageCount = 1;

  do {
    const url = new URL(BLOG_API_URL);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', '100');

    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Blog API returned ${response.status}`);

    const data = await response.json();
    posts.push(...(data.posts || []).filter((post) => post.status === 'published' && post.slug));
    pageCount = Math.max(1, Number(data.pagination?.pages || 1));
    page += 1;
  } while (page <= pageCount);

  return posts;
}

async function readExistingBlogEntries() {
  for (const outputPath of OUTPUT_PATHS) {
    try {
      const xml = await fs.readFile(outputPath, 'utf8');
      const entries = [
        ...xml.matchAll(
          /<url>\s*<loc>(https:\/\/www\.signaltrue\.ai\/blog\/[^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>[\s\S]*?<\/url>/g
        ),
      ].map(([, url, lastModified]) => ({ url, lastModified }));
      if (entries.length) return entries;
    } catch {
      // Try the next generated sitemap location.
    }
  }
  return [];
}

let blogEntries;
try {
  const posts = await fetchPublishedPosts();
  blogEntries = posts.map((post) => ({
    url: `${SITE_URL}/blog/${encodeURIComponent(post.slug)}`,
    lastModified: dateOnly(post.updatedAt || post.publishedAt),
  }));
  console.log(`[Sitemap] Loaded ${blogEntries.length} published blog posts.`);
} catch (error) {
  blogEntries = await readExistingBlogEntries();
  console.warn(
    `[Sitemap] Blog API unavailable; preserving ${blogEntries.length} existing blog URLs: ${error.message}`
  );
}

const staticEntries = staticPages.map(([path, changeFrequency, priority]) => ({
  url: `${SITE_URL}${path}`,
  lastModified: CORE_LAST_MODIFIED,
  changeFrequency,
  priority,
}));

const uniqueBlogEntries = [
  ...new Map(blogEntries.map((entry) => [entry.url, entry])).values(),
].sort((a, b) => b.lastModified.localeCompare(a.lastModified) || a.url.localeCompare(b.url));

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  '  <!-- Canonical site pages -->',
  ...staticEntries.map(urlEntry),
  '',
  '  <!-- Published blog posts -->',
  ...uniqueBlogEntries.map(urlEntry),
  '</urlset>',
  '',
].join('\n');

await Promise.all(OUTPUT_PATHS.map((outputPath) => fs.writeFile(outputPath, xml, 'utf8')));
console.log(
  `[Sitemap] Wrote ${staticEntries.length + uniqueBlogEntries.length} canonical URLs to ${OUTPUT_PATHS.length} sitemap files.`
);
