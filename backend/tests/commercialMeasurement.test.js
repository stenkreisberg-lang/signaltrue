import { describe, expect, test } from '@jest/globals';
import {
  boundedShare,
  buildCommercialReportFilter,
  CLEAN_REPORTING_START_DATE,
  getCleanComparisonDateRanges,
  getCommercialDateRanges,
  getDataFilterStatus,
  isCommercialReportPath,
  normalizeAcquisitionRows,
} from '../services/ga4Service.js';
import {
  GA4_DIAGNOSTIC_ACTIONS,
  generateSiteAnalyticsEmailHtml,
  inferCommercialRecommendations,
  validateCommercialAnalyticsOverview,
} from '../services/siteAnalyticsEmailService.js';
import { verifyCommercialConfiguration } from '../scripts/configure-ga4-commercial.js';
import { validateLeadPayload } from '../routes/leads.js';
import { isGenuinePublicCommercialEvent } from '../routes/analytics.js';

function analyticsRequest(headers = {}) {
  return {
    get(name) {
      return headers[name.toLowerCase()] || '';
    },
  };
}

describe('commercial measurement integrity', () => {
  test.each(['/app', '/app/overview', '/login', '/dashboard', '/superadmin'])(
    'excludes authenticated route %s from commercial reporting',
    (path) => expect(isCommercialReportPath(path)).toBe(false)
  );

  test('uses an exact production host in the GA4 commercial filter', () => {
    const filter = JSON.stringify(buildCommercialReportFilter());
    expect(filter).toContain('www.signaltrue.ai');
    expect(filter).toContain('EXACT');
    expect(filter).toContain('production[_ -]?smoke');
    expect(filter).toContain('sessionMedium');
    expect(filter).toContain('sessionCampaignName');
    expect(filter).toContain('conversion[_ -]?e2e');
  });

  test('server-side collection rejects preview, private and automated commercial events', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const productionRequest = analyticsRequest({
        origin: 'https://www.signaltrue.ai',
        'user-agent': 'Chrome',
      });
      expect(
        isGenuinePublicCommercialEvent(productionRequest, 'page_view', {
          page_path: '/product',
        })
      ).toBe(true);
      expect(
        isGenuinePublicCommercialEvent(
          analyticsRequest({ origin: 'https://preview.signaltrue.ai', 'user-agent': 'Chrome' }),
          'page_view',
          { page_path: '/product' }
        )
      ).toBe(false);
      expect(
        isGenuinePublicCommercialEvent(productionRequest, 'lead_form_start', {
          page_path: '/app/overview',
        })
      ).toBe(false);
      expect(
        isGenuinePublicCommercialEvent(productionRequest, 'primary_cta_click', {
          page_path: '/?utm_source=production_smoke&utm_medium=qa',
        })
      ).toBe(false);
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    }
  });

  test('normalises acquisition aliases and aggregates each source/medium pair once', () => {
    expect(
      normalizeAcquisitionRows([
        { source: '(direct)', medium: '(none)', sessions: 4, activeUsers: 3 },
        { source: 'direct', medium: '(not set)', sessions: 2, activeUsers: 2 },
        { source: '(not set)', medium: '(not set)', sessions: 1, activeUsers: 1 },
        { source: 'WWW.Google.COM', medium: 'Organic Search', sessions: 5, activeUsers: 4 },
      ])
    ).toEqual([
      { source: '(direct)', medium: '(none)', sessions: 7, activeUsers: 6 },
      { source: 'google', medium: 'organic', sessions: 5, activeUsers: 4 },
    ]);
  });

  test('never reports a share above 100 percent', () => {
    expect(boundedShare(9, 8)).toBe(100);
    expect(boundedShare(4, 8)).toBe(50);
  });

  test.each([
    ['2026-09-07', { startDate: '2026-09-04', endDate: '2026-09-07' }],
    ['2026-09-10', { startDate: '2026-09-04', endDate: '2026-09-10' }],
  ])('reports a partial clean period without comparison on %s', (referenceDate, current) => {
    const ranges = getCleanComparisonDateRanges(referenceDate);
    expect(ranges).toMatchObject({
      current,
      previous: null,
      comparisonAvailable: false,
    });
    expect(ranges.reason).toBe(
      'Clean production data since 4 Sep 2026. No valid prior clean comparison is available yet.'
    );
  });

  test('allows the first comparison only after two complete clean weeks', () => {
    expect(getCleanComparisonDateRanges('2026-09-17')).toMatchObject({
      current: { startDate: '2026-09-11', endDate: '2026-09-17' },
      previous: { startDate: '2026-09-04', endDate: '2026-09-10' },
      comparisonAvailable: true,
    });
  });

  test('supports a custom clean boundary', () => {
    expect(getCleanComparisonDateRanges('2026-10-14', '2026-10-01')).toMatchObject({
      current: { startDate: '2026-10-08', endDate: '2026-10-14' },
      previous: { startDate: '2026-10-01', endDate: '2026-10-07' },
      comparisonAvailable: true,
    });
  });

  test('clips a requested pre-clean range and removes its comparison', () => {
    expect(
      getCommercialDateRanges({
        startDate: '2026-08-28',
        endDate: '2026-09-07',
        previousStartDate: '2026-08-21',
        previousEndDate: '2026-08-27',
      })
    ).toMatchObject({
      current: [{ startDate: CLEAN_REPORTING_START_DATE, endDate: '2026-09-07' }],
      previous: null,
      comparisonAvailable: false,
    });
  });

  test('rejects a requested comparison when only one range is clean', () => {
    expect(
      getCommercialDateRanges({
        startDate: '2026-09-04',
        endDate: '2026-09-10',
        previousStartDate: '2026-08-28',
        previousEndDate: '2026-09-03',
      })
    ).toMatchObject({ previous: null, comparisonAvailable: false });
  });

  test('rejects two clean but incomplete comparison periods', () => {
    expect(
      getCommercialDateRanges({
        startDate: '2026-09-08',
        endDate: '2026-09-10',
        previousStartDate: '2026-09-05',
        previousEndDate: '2026-09-07',
      })
    ).toMatchObject({ previous: null, comparisonAvailable: false });
  });

  test('rejects clean seven-day ranges that are not adjacent', () => {
    expect(
      getCommercialDateRanges({
        startDate: '2026-09-18',
        endDate: '2026-09-24',
        previousStartDate: '2026-09-04',
        previousEndDate: '2026-09-10',
      })
    ).toMatchObject({ previous: null, comparisonAvailable: false });
  });

  test('reports active and inactive filters only after a successful Admin API response', async () => {
    const activeClient = {
      request: async () => ({
        data: {
          dataFilters: [
            { filterType: 'INTERNAL_TRAFFIC', state: 'ACTIVE' },
            { filterType: 'DEVELOPER_TRAFFIC', state: 'ACTIVE' },
          ],
        },
      }),
    };
    await expect(getDataFilterStatus(activeClient, '123')).resolves.toMatchObject({
      internalTraffic: { state: 'active' },
      developerTraffic: { state: 'active' },
    });
    await expect(
      getDataFilterStatus({ request: async () => ({ data: { dataFilters: [] } }) }, '123')
    ).resolves.toMatchObject({
      internalTraffic: { state: 'inactive' },
      developerTraffic: { state: 'inactive' },
    });
  });

  test.each([401, 403])('keeps filter state unknown after HTTP %s', async (status) => {
    const diagnostics = [];
    const client = {
      request: async () => {
        const error = new Error('access denied');
        error.response = { status, data: { error: { code: status, message: 'access denied' } } };
        throw error;
      },
    };
    await expect(getDataFilterStatus(client, '123', diagnostics)).resolves.toMatchObject({
      internalTraffic: { state: 'unknown' },
      developerTraffic: { state: 'unknown' },
    });
    expect(diagnostics[0].type).toBe('ga4_admin_permission_error');
  });

  test('keeps filter state unknown after a network error', async () => {
    await expect(
      getDataFilterStatus({ request: async () => Promise.reject(new Error('network down')) }, '123')
    ).resolves.toMatchObject({
      internalTraffic: { state: 'unknown' },
      developerTraffic: { state: 'unknown' },
    });
  });

  test('requires the three confirmed-lead identity fields server-side', () => {
    const invalid = validateLeadPayload({ source: 'Website demo request' });
    expect(invalid.fieldErrors).toMatchObject({
      fullName: expect.any(String),
      workEmail: expect.any(String),
      organization: expect.any(String),
    });

    const valid = validateLeadPayload({
      name: 'Jane Smith',
      email: 'jane@example.com',
      organization: 'Example Ltd',
      source: 'Website demo request',
    });
    expect(valid.fieldErrors).toEqual({});
  });

  test('maps configuration diagnostics to specific actions', () => {
    const recommendations = inferCommercialRecommendations({
      diagnostics: [
        { type: 'ga4_admin_permission_error', message: '403' },
        { type: 'cta_location_dimension', message: 'missing' },
      ],
      summary: { sessions: 0, views: 0 },
      funnel: {},
    });
    expect(recommendations[0].priority).toBe(
      GA4_DIAGNOSTIC_ACTIONS.ga4_admin_permission_error.title
    );
    expect(recommendations[0].action).toMatch(/Admin read access/i);
    expect(recommendations[0].action).not.toMatch(/custom dimension/i);
    expect(recommendations[1].priority).toBe(GA4_DIAGNOSTIC_ACTIONS.cta_location_dimension.title);
  });

  test('withholds interpretation when the commercial overview is inconsistent', () => {
    const overview = {
      summary: { sessions: 5, views: 4, engagementRate: 101 },
      sourceMedium: [
        { source: 'direct', medium: '(none)', sessions: 6 },
        { source: '(direct)', medium: '(not set)', sessions: 1 },
      ],
      campaigns: [{ campaign: 'conversion_e2e', sessions: 1 }],
      topLandingPages: [{ path: '/contact?intent=demo?intent=demo' }],
      topPages: [{ path: '/app/overview' }],
      funnel: { rates: { pageToCta: 120 } },
    };
    const result = validateCommercialAnalyticsOverview(overview);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'engagement_rate_out_of_bounds',
        'direct_sessions_exceed_total',
        'commercial_views_below_sessions',
        'duplicate_normalized_source_medium',
        'qa_campaign_in_commercial_acquisition',
        'malformed_landing_url',
        'private_route_in_commercial_pages',
      ])
    );
    const recommendations = inferCommercialRecommendations(overview);
    expect(recommendations[0].priority).toMatch(/measurement integrity/i);
    overview.integrity = result;
    const html = generateSiteAnalyticsEmailHtml(overview, recommendations);
    expect(html).toContain('Measurement integrity warning');
    expect(html).toContain('withheld after integrity failure');
    expect(html).not.toContain('120%');
  });

  test('weekly report separates acquisition, engagement, funnel and diagnostics', () => {
    const html = generateSiteAnalyticsEmailHtml(
      {
        hostname: 'www.signaltrue.ai',
        dateRange: {
          label: 'Clean production data since 4 Sep 2026',
          comparisonAvailable: false,
          comparisonReason: 'No valid prior clean comparison is available yet.',
        },
        summary: {
          sessions: 10,
          activeUsers: 8,
          views: 12,
          engagementRate: 40,
          averageEngagementTime: 45,
          organicSessions: 2,
          qualifiedLandingPageSessions: 4,
          sampleReportViews: 2,
        },
        previousSummary: {},
        sourceMedium: [],
        campaigns: [],
        topLandingPages: [],
        topPages: [],
        topCtaLocations: [],
        formErrorsByType: [],
        unattributedDirectPercentage: 50,
        funnel: { rates: {} },
      },
      []
    );
    expect(html).toContain('Search discovery');
    expect(html).toContain('Qualified acquisition');
    expect(html).toContain('On-site engagement');
    expect(html).toContain('Commercial funnel');
    expect(html).toContain('Supporting on-site diagnostics');
    expect(html).toContain('Small sample');
    expect(html).toContain('No valid prior clean comparison');
    expect(html).not.toMatch(/[+-]\d+(?:\.\d+)?% vs/);
  });

  test('commercial verification returns unknown rather than inactive on inspection failures', async () => {
    const client = { request: async () => Promise.reject(new Error('network unavailable')) };
    const result = await verifyCommercialConfiguration({ client, propertyId: '123' });
    expect(result.status).toBe('unknown');
    expect(Object.values(result.checks)).not.toContain('inactive');
  });

  test('commercial verification passes a fully inspectable production configuration', async () => {
    const client = {
      request: async ({ url }) => {
        if (url.endsWith('/properties/123')) return { data: { name: 'properties/123' } };
        if (url.includes('/dataStreams')) {
          return {
            data: {
              dataStreams: [
                {
                  name: 'properties/123/dataStreams/456',
                  type: 'WEB_DATA_STREAM',
                  webStreamData: {
                    defaultUri: 'https://www.signaltrue.ai',
                    measurementId: 'G-32VLC15W5G',
                  },
                },
              ],
            },
          };
        }
        if (url.includes('/enhancedMeasurementSettings')) {
          return { data: { pageChangesEnabled: false } };
        }
        if (url.includes('/customDimensions')) {
          return {
            data: {
              customDimensions: ['cta_location', 'error_type', 'intent', 'form_version'].map(
                (parameterName) => ({ parameterName, scope: 'EVENT' })
              ),
            },
          };
        }
        if (url.includes('/keyEvents')) {
          return { data: { keyEvents: [{ eventName: 'lead_confirmed' }] } };
        }
        if (url.includes('/dataFilters')) {
          return {
            data: {
              dataFilters: [
                { filterType: 'INTERNAL_TRAFFIC', state: 'ACTIVE' },
                { filterType: 'DEVELOPER_TRAFFIC', state: 'ACTIVE' },
              ],
            },
          };
        }
        throw new Error(`Unexpected verification URL: ${url}`);
      },
    };

    const result = await verifyCommercialConfiguration({ client, propertyId: '123' });
    expect(result.status).toBe('pass');
    expect(result.checks).toMatchObject({
      property: 'active',
      production_stream: 'active',
      measurement_id: 'active',
      lead_confirmed: 'active',
      conflicting_funnel_key_events: 'active',
      spa_page_view_mode: 'active',
      developer_filter: 'active',
      internal_filter: 'active',
      service_account_inspection: 'active',
    });
  });
});
