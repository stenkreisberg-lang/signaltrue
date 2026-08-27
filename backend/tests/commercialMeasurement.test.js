import { describe, expect, test } from '@jest/globals';
import { buildCommercialReportFilter, isCommercialReportPath } from '../services/ga4Service.js';
import {
  generateSiteAnalyticsEmailHtml,
  inferCommercialRecommendations,
} from '../services/siteAnalyticsEmailService.js';
import { validateLeadPayload } from '../routes/leads.js';

describe('commercial measurement integrity', () => {
  test.each(['/app', '/app/overview', '/login', '/dashboard', '/superadmin'])(
    'excludes authenticated route %s from commercial reporting',
    (path) => expect(isCommercialReportPath(path)).toBe(false)
  );

  test('uses an exact production host in the GA4 commercial filter', () => {
    expect(JSON.stringify(buildCommercialReportFilter())).toContain('www.signaltrue.ai');
    expect(JSON.stringify(buildCommercialReportFilter())).toContain('EXACT');
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
