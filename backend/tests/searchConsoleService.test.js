import { describe, expect, test } from '@jest/globals';
import {
  compareSearchQueries,
  getSearchConsoleDateRanges,
  getSearchConsoleOverview,
} from '../services/searchConsoleService.js';
import {
  generateSiteAnalyticsEmailHtml,
  inferCommercialRecommendations,
} from '../services/siteAnalyticsEmailService.js';

describe('Search Console commercial discovery', () => {
  test('uses completed data ending three days before the run date', () => {
    expect(getSearchConsoleDateRanges('2026-09-07')).toEqual({
      current: { startDate: '2026-08-29', endDate: '2026-09-04' },
      previous: { startDate: '2026-08-22', endDate: '2026-08-28' },
      dataLagDays: 3,
    });
  });

  test('separates brand, non-brand, query movement and landing-page opportunity', async () => {
    const requests = [];
    const client = {
      request: async (request) => {
        requests.push(request);
        const { data } = request;
        if (data.dimensions?.[0] === 'page') {
          return {
            data: {
              rows: [
                {
                  keys: ['https://www.signaltrue.ai/product'],
                  clicks: 0,
                  impressions: 80,
                  ctr: 0,
                  position: 9.2,
                },
              ],
            },
          };
        }
        if (data.dimensions?.[0] === 'query') {
          const current = data.startDate === '2026-08-29';
          return {
            data: {
              rows: current
                ? [
                    {
                      keys: ['signaltrue'],
                      clicks: 4,
                      impressions: 5,
                      ctr: 0.8,
                      position: 1,
                    },
                    {
                      keys: ['psychosocial risk monitoring'],
                      clicks: 1,
                      impressions: 100,
                      ctr: 0.01,
                      position: 11,
                    },
                  ]
                : [
                    {
                      keys: ['psychosocial risk monitoring'],
                      clicks: 0,
                      impressions: 40,
                      ctr: 0,
                      position: 14,
                    },
                  ],
            },
          };
        }
        if (data.dimensionFilterGroups) {
          return {
            data: { rows: [{ clicks: 1, impressions: 100, ctr: 0.01, position: 11 }] },
          };
        }
        return {
          data: {
            rows: [
              data.startDate === '2026-08-29'
                ? { clicks: 5, impressions: 105, ctr: 5 / 105, position: 10.5 }
                : { clicks: 1, impressions: 45, ctr: 1 / 45, position: 13 },
            ],
          },
        };
      },
    };

    const overview = await getSearchConsoleOverview({
      client,
      siteUrl: 'sc-domain:signaltrue.ai',
      referenceDate: '2026-09-07',
    });

    expect(overview).toMatchObject({
      connected: true,
      status: 'pass',
      dataLagDays: 3,
      summary: { clicks: 5, impressions: 105 },
      nonBrandSummary: { clicks: 1, impressions: 100, ctr: 1 },
    });
    expect(overview.brandedQueries).toHaveLength(1);
    expect(overview.nonBrandQueries).toHaveLength(1);
    expect(overview.topGainingQueries[0]).toMatchObject({
      query: 'psychosocial risk monitoring',
      impressionChange: 60,
    });
    expect(overview.pagesWithImpressionsZeroClicks[0].page).toContain('/product');
    expect(overview.highImpressionWeakCtrQueries[0].query).toBe('psychosocial risk monitoring');
    expect(requests.every((request) => request.data.endDate !== 'today')).toBe(true);
    expect(requests[0].url).toContain('sc-domain%3Asignaltrue.ai');
  });

  test('compares non-brand query movement without merging GA4 denominators', () => {
    const movement = compareSearchQueries(
      [{ query: 'workload monitoring', clicks: 3, impressions: 50 }],
      [
        { query: 'workload monitoring', clicks: 1, impressions: 20 },
        { query: 'disappeared query', clicks: 2, impressions: 30 },
      ]
    );
    expect(movement.gaining[0]).toMatchObject({ clickChange: 2, impressionChange: 30 });
    expect(movement.losing[0]).toMatchObject({
      query: 'disappeared query',
      clickChange: -2,
      impressionChange: -30,
    });
  });

  test('degrades invalid credentials to unknown without blocking the GA4 email', async () => {
    const originalJson = process.env.SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON;
    const originalBase64 = process.env.SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON_BASE64;
    process.env.SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON = '{invalid-json';
    delete process.env.SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON_BASE64;
    try {
      await expect(
        getSearchConsoleOverview({
          siteUrl: 'sc-domain:signaltrue.ai',
          referenceDate: '2026-09-07',
        })
      ).resolves.toMatchObject({ connected: false, status: 'unknown' });
    } finally {
      if (originalJson === undefined) delete process.env.SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON;
      else process.env.SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON = originalJson;
      if (originalBase64 === undefined)
        delete process.env.SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON_BASE64;
      else process.env.SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON_BASE64 = originalBase64;
    }
  });

  test('renders discovery fields separately from GA4 acquisition and escapes query text', () => {
    const html = generateSiteAnalyticsEmailHtml(
      {
        dateRange: { comparisonAvailable: false },
        diagnostics: [],
        summary: { sessions: 10, views: 12, qualifiedLandingPageSessions: 2 },
        funnel: { rates: {} },
        sourceMedium: [],
        campaigns: [],
        topLandingPages: [],
        topPages: [],
        searchDiscovery: {
          connected: true,
          summary: { impressions: 100, clicks: 4, ctr: 4, averagePosition: 9 },
          nonBrandSummary: { impressions: 80, clicks: 2 },
          nonBrandQueries: [{ query: '<script>query</script>', impressions: 50, clicks: 1 }],
          topLandingPages: [{ page: 'https://signaltrue.ai/product', impressions: 80, clicks: 2 }],
          topGainingQueries: [{ query: 'gaining query', impressionChange: 30 }],
          topLosingQueries: [{ query: 'losing query', impressionChange: -12 }],
          pagesWithImpressionsZeroClicks: [
            { page: 'https://signaltrue.ai/contact', impressions: 20 },
          ],
          highImpressionWeakCtrQueries: [{ query: 'weak query', impressions: 40, ctr: 1 }],
        },
      },
      []
    );

    expect(html).toContain('Top landing pages by impressions');
    expect(html).toContain('Top gaining and losing non-brand queries');
    expect(html).toContain('Search opportunities');
    expect(html).toContain('&lt;script&gt;query&lt;/script&gt;');
    expect(html).not.toContain('<script>query</script>');
    expect(html).toContain('Their denominators are reported separately');
  });
});

describe('commercial bottleneck recommendations', () => {
  const base = {
    diagnostics: [],
    summary: {
      sessions: 30,
      views: 35,
      engagementRate: 50,
      qualifiedLandingPageSessions: 10,
    },
    sourceMedium: [],
    campaigns: [],
    topLandingPages: [],
    topPages: [],
    funnel: { primaryCtaClicks: 3, formStarts: 2, validSubmissions: 1, confirmedLeads: 1 },
  };

  test('diagnoses near-zero impressions as discovery, not a homepage rewrite', () => {
    const result = inferCommercialRecommendations({
      ...base,
      searchDiscovery: { connected: true, summary: { impressions: 2, clicks: 0 } },
    });
    expect(result[0].priority).toMatch(/search discovery/i);
    expect(result[0].action).not.toMatch(/homepage/i);
  });

  test('diagnoses weak CTR before on-site conversion', () => {
    const result = inferCommercialRecommendations({
      ...base,
      searchDiscovery: { connected: true, summary: { impressions: 100, clicks: 1, ctr: 1 } },
    });
    expect(result[0].priority).toMatch(/search-title/i);
  });

  test.each([
    [
      'qualified landing-page targeting',
      { search: { impressions: 100, clicks: 12, ctr: 12 }, qualified: 0, cta: 0 },
      /landing-page targeting/i,
    ],
    [
      'CTA proposition',
      { search: { impressions: 100, clicks: 12, ctr: 12 }, qualified: 20, cta: 0 },
      /proposition/i,
    ],
    [
      'CTA-to-form friction',
      { search: { impressions: 100, clicks: 12, ctr: 12 }, qualified: 20, cta: 10, starts: 2 },
      /journey friction/i,
    ],
    [
      'form completion',
      {
        search: { impressions: 100, clicks: 12, ctr: 12 },
        qualified: 20,
        cta: 10,
        starts: 8,
        submissions: 2,
      },
      /form completion/i,
    ],
    [
      'lead confirmation',
      {
        search: { impressions: 100, clicks: 12, ctr: 12 },
        qualified: 20,
        cta: 10,
        starts: 8,
        submissions: 6,
        confirmed: 3,
      },
      /confirmation gap/i,
    ],
    [
      'booking continuation',
      {
        search: { impressions: 100, clicks: 12, ctr: 12 },
        qualified: 20,
        cta: 10,
        starts: 8,
        submissions: 6,
        confirmed: 6,
        bookings: 1,
      },
      /sales continuation/i,
    ],
  ])('identifies the %s bottleneck in funnel order', (_label, fixture, expected) => {
    const result = inferCommercialRecommendations({
      ...base,
      summary: { ...base.summary, qualifiedLandingPageSessions: fixture.qualified },
      searchDiscovery: { connected: true, summary: fixture.search },
      funnel: {
        primaryCtaClicks: fixture.cta || 0,
        formStarts: fixture.starts || 0,
        formErrors: 1,
        validSubmissions: fixture.submissions || 0,
        confirmedLeads: fixture.confirmed || 0,
        bookingLinkClicks: fixture.bookings || 0,
      },
    });
    expect(result[0].priority).toMatch(expected);
  });
});
