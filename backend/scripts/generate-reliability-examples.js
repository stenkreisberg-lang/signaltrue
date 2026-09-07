import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import WorkEvent from '../models/workEvent.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import WeeklyBriefSnapshot from '../models/weeklyBriefSnapshot.js';
import { generateWeeklyBrief } from '../services/weeklyBriefService.js';
import {
  generateSiteAnalyticsEmailHtml,
  inferCommercialRecommendations,
  validateCommercialAnalyticsOverview,
} from '../services/siteAnalyticsEmailService.js';

delete process.env.OPENAI_API_KEY;
process.env.JWT_SECRET ||= 'synthetic-reliability-example-signing-key-not-for-production';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(__dirname, '../../artifacts/reliability-sprint');
const daysAgo = (days) => new Date(Date.now() - days * 86400000);
const cleanGeneratedHtml = (html) => html.replace(/[ \t]+$/gm, '');

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;padding:32px 16px;background:#eef2f7;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}</style></head><body>${body}</body></html>`;
}

async function resetDatabase() {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({}))
  );
}

async function createOrganization(label, totalUsers = 20) {
  const org = await Organization.create({
    name: `Synthetic ${label}`,
    industry: 'Technology',
    settings: { minTeamSize: 5, loadedHourlyCost: 75, currency: 'EUR' },
  });
  const team = await Team.create({
    name: 'Operations',
    orgId: org._id,
    metadata: { actualSize: totalUsers, function: 'Operations', sizeBand: '11-20' },
  });
  const users = await User.insertMany(
    Array.from({ length: totalUsers }, (_, index) => ({
      email: `synthetic-${label.toLowerCase().replaceAll(' ', '-')}-${index}@test.invalid`,
      name: `Synthetic Person ${index + 1}`,
      orgId: org._id,
      teamId: team._id,
      role: 'team_member',
      accountStatus: 'pending',
    }))
  );
  return { org, team, users };
}

async function addMappedEvents(org, team, users, includePrevious = false) {
  const periods = includePrevious ? [1, 2, 9, 10] : [1, 2];
  const events = [];
  for (const [userIndex, user] of users.entries()) {
    for (const day of periods) {
      for (const [source, eventType] of [
        ['microsoft-outlook', 'meeting'],
        ['microsoft-teams', 'message'],
      ]) {
        events.push({
          orgId: org._id,
          teamId: team._id,
          actorUserId: user._id,
          source,
          eventType,
          timestamp: daysAgo(day),
          externalId: `synthetic-${org._id}-${userIndex}-${source}-${day}`,
        });
      }
    }
  }
  await WorkEvent.insertMany(events);
}

function metricDocument(orgId, day, values) {
  return {
    orgId,
    date: daysAgo(day),
    meetingCount7d: values.meetings,
    meetingInstanceCount7d: values.meetings,
    meetingDurationTotalHours7d: values.meetingHours,
    backToBackMeetingBlocks: values.backToBack,
    messageCount7d: values.messages,
    messagesPerDay: values.messages / 7,
    afterHoursMessageCount: values.afterHoursMessages,
    afterHoursMessageRatio: values.afterHoursRatio,
    focusTimeAvailabilityHours: values.focusHours,
    calendarFragmentationScore: values.fragmentation,
    recurringMeetingBurden: values.recurringBurden,
  };
}

async function writeWeeklyExample(filename, label, setup) {
  await resetDatabase();
  const seeded = await createOrganization(label);
  await setup(seeded);
  const html = await generateWeeklyBrief(seeded.org._id);
  const snapshot = await WeeklyBriefSnapshot.findOne({ orgId: seeded.org._id }).lean();
  await fs.writeFile(
    path.join(outputDirectory, filename),
    cleanGeneratedHtml(page(`SignalTrue ${label}`, html))
  );
  return {
    filename,
    reportMode: snapshot?.reportMode,
    status: snapshot?.payload?.status?.label,
    evidenceGrade: snapshot?.payload?.status?.evidenceGrade,
    actionability: snapshot?.payload?.actions?.primary?.actionability || 'no_action',
    consistencyDiagnostics: snapshot?.payload?.dataQuality?.consistencyDiagnostics || [],
  };
}

await fs.mkdir(outputDirectory, { recursive: true });

const commercialOverview = {
  hostname: 'www.signaltrue.ai',
  dateRange: {
    label:
      'Clean production data since 4 Sep 2026. No valid prior clean comparison is available yet.',
    startDate: '2026-09-04',
    endDate: '2026-09-07',
    comparisonAvailable: false,
    comparisonReason:
      'Clean production data since 4 Sep 2026. No valid prior clean comparison is available yet.',
  },
  diagnostics: [],
  summary: {
    activeUsers: 34,
    sessions: 42,
    views: 58,
    engagementRate: 54.8,
    averageEngagementTime: 71,
    organicSessions: 16,
    qualifiedLandingPageSessions: 14,
    sampleReportViews: 5,
  },
  previousSummary: {},
  sourceMedium: [
    { source: 'google', medium: 'organic', sessions: 16 },
    { source: 'linkedin', medium: 'organic social', sessions: 11 },
    { source: '(direct)', medium: '(none)', sessions: 8 },
  ],
  campaigns: [{ campaign: 'au_psychosocial_2026', sessions: 11 }],
  topLandingPages: [{ path: '/psychosocial-risk-visibility-review', sessions: 14 }],
  topPages: [{ path: '/product', views: 21 }],
  topCtaLocations: [{ location: 'visibility_review_hero', clicks: 4 }],
  formErrorsByType: [{ type: 'required_email', count: 1 }],
  unattributedDirectPercentage: 19,
  funnel: {
    primaryCtaClicks: 6,
    formStarts: 4,
    formErrors: 1,
    validSubmissions: 3,
    confirmedLeads: 3,
    bookingLinkClicks: 2,
    rates: {
      pageToCta: 14.3,
      ctaToFormStart: 66.7,
      formStartToSubmit: 75,
      submitToConfirmed: 100,
      confirmedToBooking: 66.7,
    },
  },
  searchDiscovery: {
    connected: true,
    summary: { impressions: 860, clicks: 24, ctr: 2.8, averagePosition: 12.4 },
    nonBrandSummary: { impressions: 790, clicks: 17, ctr: 2.2, averagePosition: 13.1 },
    nonBrandQueries: [
      { query: 'psychosocial risk monitoring', impressions: 280, clicks: 7 },
      { query: 'unreasonable workload monitoring', impressions: 190, clicks: 3 },
    ],
    topGainingQueries: [
      { query: 'psychosocial risk controls', impressionChange: 74, clickChange: 3 },
    ],
    topLosingQueries: [{ query: 'workload risk evidence', impressionChange: -18, clickChange: -1 }],
    topLandingPages: [
      {
        page: 'https://www.signaltrue.ai/psychosocial-risk-visibility-review',
        impressions: 340,
        clicks: 11,
      },
    ],
    pagesWithImpressionsZeroClicks: [
      { page: 'https://www.signaltrue.ai/product', impressions: 82, clicks: 0 },
    ],
    highImpressionWeakCtrQueries: [
      { query: 'psychosocial risk intervention evidence', impressions: 96, clicks: 1, ctr: 1 },
    ],
  },
};
commercialOverview.integrity = validateCommercialAnalyticsOverview(commercialOverview);
const commercialRecommendations = inferCommercialRecommendations(commercialOverview);
await fs.writeFile(
  path.join(outputDirectory, 'commercial-analytics.html'),
  cleanGeneratedHtml(generateSiteAnalyticsEmailHtml(commercialOverview, commercialRecommendations))
);

const mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri());

const summaries = [];
try {
  summaries.push(
    await writeWeeklyExample(
      'weekly-insufficient-data.html',
      'Insufficient Data',
      async ({ org, team, users }) => {
        const events = users.slice(0, 3).map((user, index) => ({
          orgId: org._id,
          teamId: team._id,
          actorUserId: user._id,
          source: 'microsoft-outlook',
          eventType: 'meeting',
          timestamp: daysAgo(1),
          externalId: `synthetic-insufficient-mapped-${index}`,
        }));
        events.push(
          ...Array.from({ length: 20 }, (_, index) => ({
            orgId: org._id,
            teamId: null,
            actorUserId: null,
            source: 'microsoft-outlook',
            eventType: 'meeting',
            timestamp: daysAgo(1),
            externalId: `synthetic-insufficient-unmapped-${index}`,
          }))
        );
        await WorkEvent.insertMany(events);
      }
    )
  );

  const stableValues = {
    meetings: 40,
    meetingHours: 200,
    backToBack: 40,
    messages: 200,
    afterHoursMessages: 20,
    afterHoursRatio: 0.1,
    focusHours: 400,
    fragmentation: 40,
    recurringBurden: 0.3,
  };
  summaries.push(
    await writeWeeklyExample(
      'weekly-stable-no-action.html',
      'Stable No Action',
      async ({ org, team, users }) => {
        await addMappedEvents(org, team, users, true);
        await IntegrationMetricsDaily.insertMany(
          [2, 9, 16, 23].map((day) => metricDocument(org._id, day, stableValues))
        );
      }
    )
  );

  const movement = [
    [2, 60, 600, 160, 100, 50, 0.5, 100, 90, 0.6],
    [9, 50, 400, 120, 160, 58, 0.36, 160, 75, 0.5],
    [16, 42, 300, 90, 200, 56, 0.28, 220, 62, 0.4],
    [23, 36, 220, 65, 240, 48, 0.2, 300, 50, 0.3],
    [30, 32, 180, 45, 260, 39, 0.15, 360, 42, 0.25],
  ];
  summaries.push(
    await writeWeeklyExample(
      'weekly-actionable-high-confidence.html',
      'Actionable High Confidence',
      async ({ org, team, users }) => {
        await addMappedEvents(org, team, users, true);
        await IntegrationMetricsDaily.insertMany(
          movement.map(
            ([
              day,
              meetings,
              meetingHours,
              backToBack,
              messages,
              afterHoursMessages,
              afterHoursRatio,
              focusHours,
              fragmentation,
              recurringBurden,
            ]) =>
              metricDocument(org._id, day, {
                meetings,
                meetingHours,
                backToBack,
                messages,
                afterHoursMessages,
                afterHoursRatio,
                focusHours,
                fragmentation,
                recurringBurden,
              })
          )
        );
      }
    )
  );
} finally {
  await mongoose.disconnect();
  await mongod.stop();
}

console.log(
  JSON.stringify(
    {
      outputDirectory,
      commercial: {
        integrity: commercialOverview.integrity.valid ? 'pass' : 'fail',
        recommendation: commercialRecommendations[0]?.priority,
      },
      weekly: summaries,
    },
    null,
    2
  )
);
