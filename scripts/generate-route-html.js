/**
 * Write one HTML file per route after the CRA build.
 *
 * The app renders on the client, so without this every URL serves the same
 * shell: identical title, identical description, and none of the page's copy.
 * Search and AI crawlers that do not execute JavaScript therefore see nothing
 * that distinguishes one page from another.
 *
 * Each generated file is the real build output with the head rewritten for that
 * route, so the bundle, hashes and hydration are untouched — only the metadata
 * differs. Vercel matches the filesystem before applying the SPA rewrite, so
 * /product serves build/product/index.html and the app takes over from there.
 */
const fs = require('node:fs');
const path = require('node:path');

const { ROUTE_META, SITE_URL, SOCIAL_IMAGE } = require('../src/seo/routeMeta.js');

const BUILD_DIR = path.resolve(__dirname, '../build');
const SHELL = path.join(BUILD_DIR, 'index.html');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** Replace a tag's content if present, otherwise insert it before </head>. */
function upsert(html, pattern, replacement) {
  return pattern.test(html)
    ? html.replace(pattern, replacement)
    : html.replace('</head>', `    ${replacement}\n  </head>`);
}

function buildHtml(shell, route, meta) {
  const canonical = `${SITE_URL}${route === '/' ? '' : route}`;
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const language = meta.lang || (route === '/au' || route.startsWith('/au/') ? 'en-AU' : 'en');
  const socialImage = meta.socialImage || SOCIAL_IMAGE;
  const socialImageAlt = meta.socialImageAlt || 'SignalTrue — Early evidence for safer work';

  let html = shell;
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${language}">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = upsert(
    html,
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${description}" />`
  );
  html = upsert(
    html,
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`
  );

  const social = [
    ['og:title', title],
    ['og:description', description],
    ['og:url', canonical],
    ['og:type', meta.type || 'website'],
    ['og:image', socialImage],
    ['og:image:alt', socialImageAlt],
  ];
  for (const [property, content] of social) {
    html = upsert(
      html,
      new RegExp(`<meta property="${property}" content="[^"]*"\\s*/?>`),
      `<meta property="${property}" content="${content}" />`
    );
  }

  const twitter = [
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', title],
    ['twitter:description', description],
    ['twitter:image', socialImage],
  ];
  for (const [name, content] of twitter) {
    html = upsert(
      html,
      new RegExp(`<meta name="${name}" content="[^"]*"\\s*/?>`),
      `<meta name="${name}" content="${content}" />`
    );
  }

  if (meta.type === 'article') {
    html = upsert(
      html,
      /<meta property="article:published_time" content="[^"]*"\s*\/?>/,
      `<meta property="article:published_time" content="${escapeHtml(meta.publishedAt)}" />`
    );

    const graph = [
      {
        '@type': 'BlogPosting',
        '@id': `${canonical}#article`,
        headline: meta.headline || meta.title,
        description: meta.description,
        image: socialImage,
        datePublished: meta.publishedAt,
        dateModified: meta.publishedAt,
        inLanguage: language,
        keywords: meta.keywords,
        author: { '@type': 'Organization', name: 'SignalTrue' },
        publisher: {
          '@type': 'Organization',
          name: 'SignalTrue',
          url: SITE_URL,
        },
        mainEntityOfPage: canonical,
      },
    ];

    if (meta.faqs?.length) {
      graph.push({
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        mainEntity: meta.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      });
    }

    const structuredData = escapeJsonForHtml({
      '@context': 'https://schema.org',
      '@graph': graph,
    });
    html = html.replace(
      '</head>',
      `    <script type="application/ld+json">${structuredData}</script>\n  </head>`
    );
  }

  // noscript, not hidden markup: it restates what the page already says for
  // agents that do not run JavaScript, and never differs from what a visitor
  // sees once the app renders.
  if (meta.summary) {
    html = html.replace(
      '</body>',
      `  <noscript><h1>${title}</h1><p>${escapeHtml(meta.summary)}</p></noscript>\n</body>`
    );
  }

  return html;
}

function main() {
  if (!fs.existsSync(SHELL)) {
    throw new Error('build/index.html not found — run the build first');
  }
  const shell = fs.readFileSync(SHELL, 'utf8');
  const written = [];

  for (const [route, meta] of Object.entries(ROUTE_META)) {
    const html = buildHtml(shell, route, meta);
    if (route === '/') {
      fs.writeFileSync(SHELL, html);
    } else {
      const dir = path.join(BUILD_DIR, route.replace(/^\//, ''));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), html);
    }
    written.push(route);
  }

  console.log(`Wrote route HTML for ${written.length} routes: ${written.join(', ')}`);
}

main();
