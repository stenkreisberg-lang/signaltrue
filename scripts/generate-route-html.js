/**
 * Write one HTML file per route after the CRA build.
 *
 * The app renders on the client, so without this every URL serves the same
 * shell: identical title, identical description, and none of the page's copy.
 * Search and AI crawlers that do not execute JavaScript therefore see nothing
 * that distinguishes one page from another.
 *
 * Each generated file is the real build output with the head rewritten for that
 * route, so the bundle, hashes and hydration are untouched ;  only the metadata
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
  const socialImageAlt = meta.socialImageAlt || 'SignalTrue ;  Early evidence for safer work';

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

  if (meta.type !== 'article' && (meta.faqs?.length || meta.schemaAbout)) {
    const graph = [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: meta.title,
        description: meta.description,
        inLanguage: language,
        isPartOf: {
          '@type': 'WebSite',
          name: 'SignalTrue',
          url: SITE_URL,
        },
        about: {
          '@type': 'Thing',
          name: meta.schemaAbout || meta.title,
        },
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

  // Put a concise, truthful route summary and key navigation in the initial
  // HTML. The React app removes this fallback before mounting, so users see the
  // full interactive page while crawlers that do not execute JavaScript still
  // receive substantive, linkable page content.
  if (meta.summary) {
    const links =
      meta.links ||
      (route === '/au'
        ? [
            ['/au/monitoring-gap-audit', 'Review one control'],
            ['/au/8-week-pilot', 'See the 8-week control review pilot'],
            ['/sample-report', 'See a fictional control review'],
            ['/au/standards-assurance', 'Standards and assurance'],
            ['/au/trust', 'Australian Trust Centre'],
          ]
        : []);

    const fallbackLinks = links.length
      ? `<nav aria-label="Related SignalTrue resources"><ul>${links
          .map(
            ([href, label]) =>
              `<li><a href="${href}">${escapeHtml(label)}</a></li>`
          )
          .join('')}</ul></nav>`
      : '';

    const fallbackSections = (meta.crawlerSections || [])
      .map(
        (section) =>
          `<section><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(
            section.text
          )}</p></section>`
      )
      .join('');

    const fallbackFaqs = meta.faqs?.length
      ? `<section><h2>Frequently asked questions</h2>${meta.faqs
          .map(
            (faq) =>
              `<article><h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(
                faq.answer
              )}</p></article>`
          )
          .join('')}</section>`
      : '';

    const fallback = `<div id="route-static-fallback"><main><h1>${title}</h1><p>${escapeHtml(
      meta.summary
    )}</p>${fallbackSections}${fallbackFaqs}${fallbackLinks}</main></div>`;
    html = html.replace('<div id="root"></div>', `${fallback}<div id="root"></div>`);
  }

  if (route === '/au') {
    const structuredData = escapeJsonForHtml({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: meta.title,
      description: meta.description,
      inLanguage: language,
      isPartOf: {
        '@type': 'WebSite',
        name: 'SignalTrue',
        url: SITE_URL,
      },
      about: {
        '@type': 'Thing',
        name: 'Psychosocial control review',
      },
    });
    html = html.replace(
      '</head>',
      `    <script type="application/ld+json">${structuredData}</script>\n  </head>`
    );
  }

  return html;
}

const BLOG_API_URL =
  process.env.SITEMAP_BLOG_API_URL || 'https://signaltrue-backend.onrender.com/api/blog';

function plainText(value) {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_~>]/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, maxLength) {
  const text = plainText(value);
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return cut.slice(0, lastSpace > maxLength * 0.7 ? lastSpace : maxLength).trim() + '…';
}

async function fetchPublishedBlogPosts() {
  const posts = [];
  let page = 1;
  let pageCount = 1;

  do {
    const url = new URL(BLOG_API_URL);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', '100');

    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error('Blog API returned ' + response.status);

    const data = await response.json();
    posts.push(...(data.posts || []).filter((post) => post.status === 'published' && post.slug));
    pageCount = Math.max(1, Number(data.pagination?.pages || 1));
    page += 1;
  } while (page <= pageCount);

  return posts;
}

function blogPostMeta(post) {
  const content = plainText(post.excerpt || post.content);
  const description = truncate(post.seo?.metaDescription || post.excerpt || content, 160);

  return {
    title: post.seo?.metaTitle || post.title,
    description,
    summary: truncate(post.excerpt || post.content, 1200),
    type: 'article',
    publishedAt: post.publishedAt || post.createdAt || new Date().toISOString(),
    keywords: [...(post.tags || []), ...(post.categories || [])].join(', '),
    socialImage: post.seo?.ogImage || post.featuredImage?.url,
    socialImageAlt: post.featuredImage?.alt || post.title,
  };
}

async function main() {
  if (!fs.existsSync(SHELL)) {
    throw new Error('build/index.html not found ;  run the build first');
  }
  const shell = fs.readFileSync(SHELL, 'utf8');
  const written = [];

  for (const [route, meta] of Object.entries(ROUTE_META)) {
    const html = buildHtml(shell, route, meta);
    if (route === '/') {
      fs.writeFileSync(SHELL, html);
    } else {
      const dir = path.join(BUILD_DIR, route.replace(/^\/+/, ''));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), html);
    }
    written.push(route);
  }

  try {
    const posts = await fetchPublishedBlogPosts();
    for (const post of posts) {
      if (!/^[a-z0-9-]+$/.test(post.slug)) continue;
      const route = '/blog/' + post.slug;
      if (ROUTE_META[route]) continue;

      const html = buildHtml(shell, route, blogPostMeta(post));
      const dir = path.join(BUILD_DIR, 'blog', post.slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), html);
      written.push(route);
    }
    console.log('Wrote route HTML for ' + written.length + ' routes, including published blog posts.');
  } catch (error) {
    console.warn('[SEO] Could not pre-render published blog posts: ' + error.message);
    console.log('Wrote route HTML for ' + written.length + ' static routes.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
