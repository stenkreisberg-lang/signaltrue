import { describe, expect, test } from '@jest/globals';
import {
  boundedShare,
  buildCommercialReportFilter,
  CLEAN_REPORTING_START_DATE,
  getCommercialDateRanges,
  isCommercialReportPath,
  normalizeAcquisitionRows,
} from '../services/ga4Service.js';
import {
  generateSiteAnalyticsEmailHtml,
  inferCommercialRecommendations,
} from '../services/siteAnalyticsEmailService.js';
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

  test('uses the clean deployment boundary and never compares against contaminated history', () => {
    expect(getCommercialDateRanges()).toEqual({
      current: [{ startDate: CLEAN_REPORTING_START_DATE, endDate: 'today' }],
      previous: null,
    });
    expect(
      getCommercialDateRanges({
        startDate: '2026-09-10',
        endDate: '2026-09-20',
        previousStartDate: '2026-09-04',
        previousEndDate: '2026-09-09',
      })
    ).toEqual({
      current: [{ startDate: '2026-09-10', endDate: '2026-09-20' }],
      previous: [{ startDate: '2026-09-04', endDate: '2026-09-09' }],
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

  test('prioritises a confirmed reporting failure before funnel or acquisition advice', () => {
    const recommendations = inferCommercialRecommendations({
      diagnostics: [{ type: 'cta_location_dimension' }],
      summary: { sessions: 30, views: 30, qualifiedLandingPageSessions: 0 },
      funnel: { formStarts: 4, validSubmissions: 0, formErrors: 1 },
    });
    expect(recommendations[0].priority).toMatch(/configuration failure/i);
    expect(recommendations[1].priority).toMatch(/form abandonment/i);
  });

  test('weekly report separates acquisition, engagement, funnel and diagnostics', () => {
    const html = generateSiteAnalyticsEmailHtml(
      {
        hostname: 'www.signaltrue.ai',
        dateRange: { label: 'Last 7 days' },
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
    expect(html).toContain('Acquisition');
    expect(html).toContain('Engagement');
    expect(html).toContain('Funnel');
    expect(html).toContain('Diagnostic information');
    expect(html).toContain('Small sample');
  });
});
