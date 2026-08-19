/**
 * P0 acceptance criteria and QA scenarios for the Australia control-verification
 * module (spec §36, §37).
 *
 * Each test names the criterion it covers. The release gate in §36 requires all
 * of these to pass, with the privacy-threshold checks holding at every
 * drilldown and export boundary.
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import OrgUnit from '../models/orgUnit.js';
import WorkEvent from '../models/workEvent.js';
import {
  ControlReviewCase,
  ContextEvent,
  WorkingSchedule,
  ControlIntervention,
  ConsultationRecord,
  TeamWorkPatternMetric,
  SignalObservation,
  PatternFinding,
  InterventionEvaluation,
  MigrationFinding,
  EvidencePack,
  ControlReviewAuditEvent,
  HsDeploymentConfig,
  MIN_GROUP_SIZE_DEFAULT,
  CLOSED_STATUSES,
} from '../models/controlReview/index.js';

import scheduleService from '../services/controlReview/workingScheduleService.js';
import metricsService from '../services/controlReview/workPatternMetricsService.js';
import baselineService from '../services/controlReview/baselineDeviationService.js';
import patternService from '../services/controlReview/patternDetectionService.js';
import caseService from '../services/controlReview/controlReviewCaseService.js';
import consultationService from '../services/controlReview/consultationService.js';
import interventionService from '../services/controlReview/controlInterventionService.js';
import evaluationService from '../services/controlReview/interventionEvaluationService.js';
import migrationService from '../services/controlReview/workloadMigrationService.js';
import completenessService from '../services/controlReview/reviewCompletenessService.js';
import interpretationService from '../services/controlReview/hsInterpretationService.js';
import evidencePackService from '../services/controlReview/evidencePackService.js';
import trustService from '../services/controlReview/trustDeploymentService.js';
import jurisdictionPacks from '../services/controlReview/jurisdictionPacks.js';
import dashboardService from '../services/controlReview/hsDashboardService.js';
import { resolveHsRole, HS_PERMISSIONS } from '../middleware/hsAccess.js';
import { checkGroup } from '../services/controlReview/hsPrivacyService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TZ = 'Australia/Melbourne';

let mongoServer;
let tenantId;
let actor;
let hsAdmin;
let periods;
let teams = {};
let schedule;

jest.setTimeout(300000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri('control_review_test'));
  await buildFixture();
});

afterAll(async () => {
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
});

// ── Fixture ──────────────────────────────────────────────────────────────────

function meetingEvent({ teamId, userId, at, durationMinutes = 60, recurring = false, partnerTeamIds = [] }) {
  return {
    orgId: tenantId,
    source: 'google-calendar',
    eventType: 'meeting',
    actorUserId: userId,
    teamId,
    timestamp: at,
    externalId: `t-${userId}-${at.getTime()}-${Math.random().toString(36).slice(2, 9)}`,
    metadata: {
      startTime: at,
      endTime: new Date(at.getTime() + durationMinutes * 60000),
      durationMinutes,
      isRecurring: recurring,
      isCancelled: false,
      isAllDay: false,
      attendeeCount: 6,
      participantTeamIds: partnerTeamIds,
      meetingInstanceIdHash: `m-${at.getTime()}`,
    },
  };
}

function messageEvent({ teamId, userId, at }) {
  return {
    orgId: tenantId,
    source: 'slack',
    eventType: 'message',
    actorUserId: userId,
    teamId,
    timestamp: at,
    externalId: `t-msg-${userId}-${at.getTime()}-${Math.random().toString(36).slice(2, 9)}`,
    metadata: {},
  };
}

function atLocalHour(day, hour, minute = 0) {
  const iso = scheduleService.toLocalParts(day, TZ).isoDate;
  return scheduleService.localDateTimeToUtc(iso, hour * 60 + minute, TZ);
}

function generateWeek({ teamId, memberIds, weekStart, profile, partnerTeamIds = [] }) {
  const events = [];
  // Monday–Friday of this week. The midday offset keeps the local date correct
  // when a DST change shifts the wall clock inside the week.
  const days = [0, 1, 2, 3, 4].map(
    (o) => new Date(weekStart.getTime() + o * DAY_MS + 12 * 60 * 60 * 1000)
  );

  for (const userId of memberIds) {
    for (let i = 0; i < profile.meetings; i += 1) {
      events.push(
        meetingEvent({
          teamId,
          userId,
          at: atLocalHour(days[i % days.length], 9 + ((i * 2) % 7)),
          recurring: i % 2 === 0,
          partnerTeamIds: partnerTeamIds.length && i % 3 === 0 ? partnerTeamIds : [],
        })
      );
    }
    for (let i = 0; i < profile.chat; i += 1) {
      events.push(
        messageEvent({ teamId, userId, at: atLocalHour(days[i % days.length], 10 + (i % 6), (i * 7) % 60) })
      );
    }
    for (let i = 0; i < profile.afterHours; i += 1) {
      events.push(
        messageEvent({ teamId, userId, at: atLocalHour(days[i % days.length], 19 + (i % 3), (i * 13) % 60) })
      );
    }
  }
  return events;
}

async function makeTeam(name, size) {
  const team = await Team.create({
    name,
    orgId: tenantId,
    metadata: { actualSize: size, function: 'Engineering' },
  });

  const memberIds = [];
  for (let i = 0; i < size; i += 1) {
    const user = await User.create({
      email: `${name.replace(/\W+/g, '')}.${i}@test.local`,
      name: `${name} ${i}`,
      role: 'team_member',
      orgId: tenantId,
      teamId: team._id,
      password: 'test-password-not-used',
    });
    memberIds.push(user._id);
    await OrgUnit.create({
      orgId: tenantId,
      userId: user._id,
      teamId: team._id,
      isManager: i < 2,
      effectiveFrom: new Date(Date.now() - 300 * DAY_MS),
      effectiveTo: null,
    });
  }
  return { team, memberIds };
}

const IMPL_INDEX = 15;
const POST_START = IMPL_INDEX + 1;
const POST_END = IMPL_INDEX + 5;

async function buildFixture() {
  const org = await Organization.create({ name: 'Acceptance Org' });
  tenantId = org._id;

  const adminTeam = await Team.create({
    name: 'Health & Safety',
    orgId: tenantId,
    metadata: { actualSize: 3, function: 'Operations' },
  });

  hsAdmin = await User.create({
    email: 'hs@test.local',
    name: 'H&S Manager',
    role: 'hr_admin',
    orgId: tenantId,
    teamId: adminTeam._id,
    password: 'test-password-not-used',
  });
  actor = { userId: hsAdmin._id, email: hsAdmin.email, role: 'hr_admin', hsRole: 'HS_ADMIN' };

  await WorkingSchedule.create({
    tenantId,
    scope: 'ORG',
    timezone: TZ,
    days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
      dayOfWeek: d,
      working: d >= 1 && d <= 5,
      startMinute: 540,
      endMinute: 1020,
    })),
    createdBy: hsAdmin._id,
  });

  schedule = await scheduleService.resolveSchedule({ tenantId });
  periods = scheduleService.weeklyPeriods({ weeks: 24, schedule });

  teams.migrating = await makeTeam('Migrating Team', 12);
  teams.clean = await makeTeam('Clean Team', 11);
  teams.receiving = await makeTeam('Receiving Team', 10);
  teams.small = await makeTeam('Small Team', 6);
  teams.quiet = await makeTeam('Quiet Team', 9);

  const events = [];

  periods.forEach(({ periodStart }, index) => {
    let profile;
    if (index < 11) profile = { meetings: 8, chat: 40, afterHours: 3 };
    else if (index < IMPL_INDEX) profile = { meetings: 13, chat: 58, afterHours: 8 };
    else if (index < POST_START) profile = { meetings: 11, chat: 66, afterHours: 7 };
    else if (index < POST_END) profile = { meetings: 9, chat: 84, afterHours: 6 };
    else profile = { meetings: 9, chat: 88, afterHours: 11 };
    events.push(
      generateWeek({
        teamId: teams.migrating.team._id,
        memberIds: teams.migrating.memberIds,
        weekStart: periodStart,
        profile,
        partnerTeamIds: [teams.receiving.team._id],
      })
    );
  });

  periods.forEach(({ periodStart }, index) => {
    let profile;
    if (index < 11) profile = { meetings: 9, chat: 45, afterHours: 4 };
    else if (index < IMPL_INDEX) profile = { meetings: 14, chat: 52, afterHours: 8 };
    else if (index < POST_START) profile = { meetings: 12, chat: 50, afterHours: 6 };
    else profile = { meetings: 10, chat: 47, afterHours: 5 };
    events.push(
      generateWeek({
        teamId: teams.clean.team._id,
        memberIds: teams.clean.memberIds,
        weekStart: periodStart,
        profile,
      })
    );
  });

  periods.forEach(({ periodStart }, index) => {
    const profile =
      index < POST_START
        ? { meetings: 7, chat: 38, afterHours: 3 }
        : { meetings: 8, chat: 58, afterHours: 6 };
    events.push(
      generateWeek({
        teamId: teams.receiving.team._id,
        memberIds: teams.receiving.memberIds,
        weekStart: periodStart,
        profile,
        partnerTeamIds: [teams.migrating.team._id],
      })
    );
  });

  periods.forEach(({ periodStart }) => {
    events.push(
      generateWeek({
        teamId: teams.small.team._id,
        memberIds: teams.small.memberIds,
        weekStart: periodStart,
        profile: { meetings: 10, chat: 50, afterHours: 6 },
      })
    );
  });

  // Quiet team: stable throughout, so no pattern should ever fire.
  periods.forEach(({ periodStart }) => {
    events.push(
      generateWeek({
        teamId: teams.quiet.team._id,
        memberIds: teams.quiet.memberIds,
        weekStart: periodStart,
        profile: { meetings: 8, chat: 42, afterHours: 3 },
      })
    );
  });

  const flat = events.flat();
  for (let i = 0; i < flat.length; i += 2000) {
    await WorkEvent.insertMany(flat.slice(i, i + 2000), { ordered: false });
  }

  for (const key of Object.keys(teams)) {
    const teamId = teams[key].team._id;
    await metricsService.persistTeamMetrics({ tenantId, teamId, periods });
    for (const { periodStart } of periods) {
      await baselineService.observeTeamPeriod({ tenantId, teamId, periodStart });
      await patternService.evaluateTeamPeriod({ tenantId, teamId, periodStart });
    }
  }
}

// ── §36 acceptance criteria ──────────────────────────────────────────────────

describe('§36.1 — a case can be created from an external source with no SignalTrue detection', () => {
  it('opens a case from a psychosocial survey', async () => {
    const created = await caseService.openCase({
      tenantId,
      actor,
      title: 'Survey-triggered review',
      triggerType: 'PSYCHOSOCIAL_SURVEY',
      triggerReference: 'People Matter 2026',
      triggerDate: new Date(),
      teamIds: [teams.quiet.team._id],
      initialEvidenceSummary: 'Job demand scores fell for this cohort.',
    });

    expect(created.caseNumber).toMatch(/^CR-\d+$/);
    expect(created.trigger.type).toBe('PSYCHOSOCIAL_SURVEY');
    expect(created.trigger.patternFindingId).toBeNull();
    expect(created.status).toBe('OPENED');
    // Metrics are recommended from the trigger type, not from a detection.
    expect(created.monitoredMetrics.length).toBeGreaterThan(0);
  });

  it('accepts all fourteen trigger types', async () => {
    const { TRIGGER_TYPES } = await import('../models/controlReview/constants.js');
    expect(TRIGGER_TYPES).toHaveLength(14);
    expect(TRIGGER_TYPES).toContain('HSR_CONCERN');
    expect(TRIGGER_TYPES).toContain('REGULATOR');
    expect(TRIGGER_TYPES).toContain('CLAIM_OR_ABSENCE_PATTERN');
  });
});

describe('§36.2 — a case can be created from a PatternFinding after human approval', () => {
  it('produces a review recommendation and never opens the case itself', async () => {
    const finding = await PatternFinding.findOne({
      tenantId,
      teamId: teams.migrating.team._id,
    }).sort({ periodStart: -1 });

    expect(finding).toBeTruthy();
    expect(finding.status).toBe('REVIEW_RECOMMENDED');
    expect(finding.caseId).toBeNull();
    expect(finding.summary).toMatch(/Review may be warranted/);

    const created = await caseService.openCase({
      tenantId,
      actor,
      title: 'Pattern-triggered review',
      triggerType: 'SIGNALTRUE_PATTERN',
      triggerDate: finding.periodStart,
      patternFindingId: finding._id,
    });

    expect(String(created.teamIds[0])).toBe(String(teams.migrating.team._id));

    const reloaded = await PatternFinding.findById(finding._id);
    expect(reloaded.status).toBe('CASE_OPENED');
  });
});

describe('§36.3 / §37 — a team below MIN_GROUP_SIZE is suppressed everywhere', () => {
  it('suppresses every metric for the six-person team', async () => {
    const rows = await TeamWorkPatternMetric.find({ tenantId, teamId: teams.small.team._id }).lean();

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.suppressed)).toBe(true);
    expect(rows.every((r) => r.value === null)).toBe(true);
    expect(rows.every((r) => r.contributorCount === 0)).toBe(true);
    // Group size is withheld too — "7 of 8" is itself a disclosure.
    expect(rows.every((r) => r.groupSize === null)).toBe(true);
  });

  it('produces no observation or pattern finding for a suppressed team', async () => {
    const observations = await SignalObservation.find({
      tenantId,
      teamId: teams.small.team._id,
      status: 'DEVIATION_OBSERVED',
    }).lean();
    expect(observations).toHaveLength(0);

    const findings = await PatternFinding.find({ tenantId, teamId: teams.small.team._id }).lean();
    expect(findings).toHaveLength(0);
  });

  it('defaults the threshold to 8 and refuses to be configured lower', async () => {
    expect(MIN_GROUP_SIZE_DEFAULT).toBe(8);

    await trustService.updateConfiguration({ tenantId, actor, updates: { minGroupSize: 3 } });
    const config = await HsDeploymentConfig.findOne({ tenantId }).lean();
    expect(config.minGroupSize).toBe(8);

    await trustService.updateConfiguration({ tenantId, actor, updates: { minGroupSize: 10 } });
    const raised = await HsDeploymentConfig.findOne({ tenantId }).lean();
    expect(raised.minGroupSize).toBe(10);
    await trustService.updateConfiguration({ tenantId, actor, updates: { minGroupSize: 8 } });
  });

  it('reports a group that drops below the threshold mid-period as not allowed', async () => {
    const result = await checkGroup({ tenantId, teamId: teams.small.team._id, groupSize: 7 });
    expect(result.allowed).toBe(false);
    expect(result.minGroupSize).toBe(8);
  });
});

describe('§36.4 / §37 — working schedule handles timezone, part-time days and DST', () => {
  it('treats an evening event as after-hours and a 09:00 event as within schedule', () => {
    const wednesday = new Date('2026-07-15T00:00:00Z');
    const nineAm = atLocalHour(wednesday, 9);
    const eightPm = atLocalHour(wednesday, 20);

    expect(scheduleService.isWithinSchedule(nineAm, schedule)).toBe(true);
    expect(scheduleService.isAfterHours(eightPm, schedule)).toBe(true);
  });

  it('does not count a flexible-schedule worker at 20:00 as after-hours', () => {
    const flexible = {
      ...schedule,
      flexible: { enabled: true, earliestMinute: 360, latestMinute: 1260 },
    };
    const eightPm = atLocalHour(new Date('2026-07-15T00:00:00Z'), 20);
    expect(scheduleService.isAfterHours(eightPm, flexible)).toBe(false);
  });

  it('excludes non-working days and public holidays', () => {
    const saturday = atLocalHour(new Date('2026-07-18T00:00:00Z'), 12);
    expect(scheduleService.isAfterHours(saturday, schedule)).toBe(true);

    const withHoliday = { ...schedule, publicHolidays: ['2026-07-15'] };
    const nineAm = atLocalHour(new Date('2026-07-15T00:00:00Z'), 9);
    expect(scheduleService.isWithinSchedule(nineAm, withHoliday)).toBe(false);
  });

  it('keeps local 09:00 correct on both sides of the DST boundary', () => {
    const summer = scheduleService.localDateTimeToUtc('2026-01-14', 540, TZ);
    const winter = scheduleService.localDateTimeToUtc('2026-07-15', 540, TZ);

    // AEDT is UTC+11, AEST is UTC+10 — the UTC hour differs, local time does not.
    expect(summer.toISOString()).toBe('2026-01-13T22:00:00.000Z');
    expect(winter.toISOString()).toBe('2026-07-14T23:00:00.000Z');
    expect(scheduleService.isWithinSchedule(summer, schedule)).toBe(true);
    expect(scheduleService.isWithinSchedule(winter, schedule)).toBe(true);
  });

  it('produces a 169-hour week across the autumn DST change', () => {
    // The week containing 5 April 2026, when AEDT gives way to AEST.
    const dstWeeks = scheduleService.weeklyPeriods({
      end: new Date('2026-04-08T05:00:00Z'),
      weeks: 2,
      schedule,
    });
    const hours = (dstWeeks[0].periodEnd - dstWeeks[0].periodStart) / 3600000;
    expect(hours).toBe(169);
    // The following week is an ordinary 168 hours.
    expect((dstWeeks[1].periodEnd - dstWeeks[1].periodStart) / 3600000).toBe(168);
  });
});

describe('§36.5 — calendar-only deployments use Uninterrupted Calendar Availability', () => {
  it('never labels blank calendar time as focus time', async () => {
    const { METRIC_LABELS } = await import('../models/controlReview/constants.js');
    expect(METRIC_LABELS.UNINTERRUPTED_CALENDAR_AVAILABILITY).toBe(
      'Uninterrupted Calendar Availability'
    );
    expect(Object.values(METRIC_LABELS).join(' ')).not.toMatch(/focus/i);

    const row = await TeamWorkPatternMetric.findOne({
      tenantId,
      teamId: teams.clean.team._id,
      metric: 'UNINTERRUPTED_CALENDAR_AVAILABILITY',
      suppressed: false,
    }).lean();

    expect(row.value).toBeGreaterThan(0);
    expect(row.components.methodology).toMatch(/no meeting event/i);
    expect(row.components.longestBlockMinutes).toBeGreaterThan(0);
  });

  it('withholds the cross-channel figure until connector coverage supports it', async () => {
    const row = await TeamWorkPatternMetric.findOne({
      tenantId,
      teamId: teams.clean.team._id,
      metric: 'UNINTERRUPTED_WORK_WINDOW',
    })
      .sort({ periodStart: -1 })
      .lean();

    // Either it is produced with a stated methodology, or it is withheld with a
    // stated reason. It is never produced silently under the calendar name.
    if (row.value === null) {
      expect(row.components.unavailableReason).toMatch(/coverage/i);
    } else {
      expect(row.components.methodology).toMatch(/chat, email or call/i);
    }
  });
});

describe('§36.6 — P0 metrics are calculated from content-free events', () => {
  it('calculates meeting load, after-hours activity and coordination channel load', async () => {
    const latest = periods[periods.length - 2].periodStart;
    const rows = await TeamWorkPatternMetric.find({
      tenantId,
      teamId: teams.clean.team._id,
      periodStart: latest,
    }).lean();

    const byMetric = Object.fromEntries(rows.map((r) => [r.metric, r]));

    expect(byMetric.MEETING_LOAD.value).toBeGreaterThan(0);
    expect(byMetric.AFTER_HOURS_ACTIVITY.value).toBeGreaterThan(0);
    expect(byMetric.COORDINATION_CHANNEL_LOAD.value).toBeGreaterThan(0);

    // Coordination Channel Load is split by channel — volume only.
    expect(byMetric.COORDINATION_CHANNEL_LOAD.components.byChannelPerPerson).toHaveProperty('chat');
    expect(byMetric.COORDINATION_CHANNEL_LOAD.components.byChannelPerPerson).toHaveProperty('meetings');
  });

  it('aggregates the management layer only when more than one manager exists', async () => {
    const row = await TeamWorkPatternMetric.findOne({
      tenantId,
      teamId: teams.clean.team._id,
      metric: 'MANAGEMENT_LAYER_COORDINATION_LOAD',
      suppressed: false,
    }).lean();

    expect(row.components.managerCount).toBeGreaterThanOrEqual(2);
    expect(row.components).not.toHaveProperty('perManager');
  });

  it('stores no message or email content on any work event', async () => {
    const sample = await WorkEvent.find({ orgId: tenantId }).limit(200).lean();
    const serialised = JSON.stringify(sample);
    expect(serialised).not.toMatch(/"body"/);
    expect(serialised).not.toMatch(/"subject"/);
    expect(serialised).not.toMatch(/"text"/);
  });
});

describe('§36.7 — baseline and data quality are stored with an algorithm version', () => {
  it('stores baseline statistics, coverage and version on the observation', async () => {
    const observation = await SignalObservation.findOne({
      tenantId,
      teamId: teams.clean.team._id,
      status: 'DEVIATION_OBSERVED',
    }).lean();

    expect(observation.baseline.sampleSize).toBeGreaterThanOrEqual(4);
    expect(observation.baseline.median).toBeGreaterThan(0);
    expect(observation.baseline.mad).toBeGreaterThanOrEqual(0);
    expect(observation.baseline).toHaveProperty('p25');
    expect(observation.baseline).toHaveProperty('p75');
    expect(observation.dataQuality).toBeTruthy();
    expect(observation.algorithmVersion).toMatch(/^au-control-verification-/);
  });

  it('marks a baseline shorter than eight weeks as immature and refuses under four', () => {
    const rows = (values) =>
      values.map((v, i) => ({
        value: v,
        suppressed: false,
        dataCoverage: 0.9,
        periodStart: new Date(2026, 0, i * 7 + 1),
        periodEnd: new Date(2026, 0, i * 7 + 8),
      }));

    expect(baselineService.buildBaseline(rows([10, 11, 12])).available).toBe(false);
    expect(baselineService.buildBaseline(rows([10, 11, 12, 13])).mature).toBe(false);
    expect(baselineService.buildBaseline(rows([10, 11, 12, 13, 11, 12, 10, 11])).mature).toBe(true);
  });
});

describe('§36.8 / §37 — context events are shown beside metric changes, never used to dismiss', () => {
  it('attaches overlapping context to a pattern finding without dismissing it', async () => {
    const finding = await PatternFinding.findOne({
      tenantId,
      teamId: teams.receiving.team._id,
    }).sort({ periodStart: -1 });

    const target = finding || (await PatternFinding.findOne({ tenantId }).sort({ periodStart: -1 }));

    await ContextEvent.create({
      tenantId,
      name: 'Platform go-live',
      eventType: 'PRODUCT_LAUNCH',
      teamIds: [target.teamId],
      startDate: target.periodStart,
      endDate: target.periodEnd,
      notes: 'Staged rollout.',
      createdBy: hsAdmin._id,
    });

    const recalculated = await patternService.evaluateTeamPeriod({
      tenantId,
      teamId: target.teamId,
      periodStart: target.periodStart,
    });

    expect(recalculated).toBeTruthy();
    // Context is displayed, not applied as an automatic dismissal.
    expect(recalculated.status).not.toBe('DISMISSED');
    if (recalculated.overlappingContextEventIds.length) {
      expect(recalculated.summary).toMatch(/Overlapping recorded context/);
    }
  });
});

describe('§36.9 — consultation captures views, response, decision impact and feedback back', () => {
  let caseId;

  beforeAll(async () => {
    const created = await caseService.openCase({
      tenantId,
      actor,
      title: 'Consultation coverage case',
      triggerType: 'WORKER_CONSULTATION',
      triggerDate: new Date(),
      teamIds: [teams.clean.team._id],
    });
    caseId = created._id;
  });

  it('records the full consultation chain', async () => {
    const record = await consultationService.recordConsultation({
      tenantId,
      caseId,
      actor,
      date: new Date(),
      method: 'MEETING',
      groupDescription: 'Team meeting, 11 attendees',
      hsrInvolved: true,
      questions: consultationService.SUGGESTED_QUESTIONS.slice(0, 3),
      workerViews: ['Recurring meetings overlap peak workload.'],
      managementResponse: ['Two meetings will be removed.'],
      decisionImpact: ['Worker views determined which meetings were removed.'],
      summary: 'Workers linked demand to recurring meetings.',
      workerReportedDirection: 'NOT_ASSESSED',
    });

    expect(record.workerViews).toHaveLength(1);
    expect(record.managementResponse).toHaveLength(1);
    expect(record.decisionImpact).toHaveLength(1);
    expect(record.hsrInvolved).toBe(true);
    expect(record.feedbackBackToWorkers.provided).toBe(false);

    const withFeedback = await consultationService.recordFeedbackToWorkers({
      tenantId,
      consultationId: record._id,
      actor,
      description: 'Outcome shared at the team meeting.',
    });
    expect(withFeedback.feedbackBackToWorkers.provided).toBe(true);
  });

  it('allows consultation to be recorded as not applicable with a reason', async () => {
    const created = await caseService.openCase({
      tenantId,
      actor,
      title: 'Not-applicable consultation case',
      triggerType: 'AUDIT',
      triggerDate: new Date(),
      teamIds: [teams.clean.team._id],
    });

    await expect(
      caseService.recordConsultationNotApplicable({ tenantId, caseId: created._id, actor, reason: '' })
    ).rejects.toThrow(/reason is required/i);

    const updated = await caseService.recordConsultationNotApplicable({
      tenantId,
      caseId: created._id,
      actor,
      reason: 'Control applies to a system configuration with no affected worker group.',
    });
    expect(updated.consultationNotApplicable.isNotApplicable).toBe(true);

    const completeness = await completenessService.assessCompleteness({
      tenantId,
      caseId: created._id,
    });
    const consultation = completeness.components.find((c) => c.key === 'consultation');
    expect(consultation.status).toBe('NOT_APPLICABLE');
  });
});

describe('§36.10 — an intervention must define expected effects', () => {
  it('refuses to plan a control without expected effects', async () => {
    const created = await caseService.openCase({
      tenantId,
      actor,
      title: 'Expected effects required',
      triggerType: 'MANAGER_CONCERN',
      triggerDate: new Date(),
      teamIds: [teams.clean.team._id],
    });

    await expect(
      interventionService.planIntervention({
        tenantId,
        caseId: created._id,
        actor,
        name: 'Unspecified control',
        interventionType: 'WORKLOAD',
        implementationDate: new Date(),
        expectedEffects: [],
      })
    ).rejects.toThrow(/expect to change/i);
  });

  it('freezes expected effects once implementation is confirmed', async () => {
    const created = await caseService.openCase({
      tenantId,
      actor,
      title: 'Frozen expectations',
      triggerType: 'MANAGER_CONCERN',
      triggerDate: new Date(),
      teamIds: [teams.clean.team._id],
    });

    const intervention = await interventionService.planIntervention({
      tenantId,
      caseId: created._id,
      actor,
      name: 'Meeting reset',
      interventionType: 'MEETING_PRACTICE',
      implementationDate: new Date(),
      expectedEffects: [{ metric: 'MEETING_LOAD', direction: 'DECREASE' }],
    });

    expect(intervention.expectedEffectsRecordedAt).toBeTruthy();

    await interventionService.updateExpectedEffects({
      tenantId,
      interventionId: intervention._id,
      actor,
      expectedEffects: [
        { metric: 'MEETING_LOAD', direction: 'DECREASE' },
        { metric: 'AFTER_HOURS_ACTIVITY', direction: 'DECREASE' },
      ],
    });

    await interventionService.confirmImplementation({
      tenantId,
      interventionId: intervention._id,
      actor,
    });

    await expect(
      interventionService.updateExpectedEffects({
        tenantId,
        interventionId: intervention._id,
        actor,
        expectedEffects: [{ metric: 'COORDINATION_CHANNEL_LOAD', direction: 'DECREASE' }],
      })
    ).rejects.toThrow(/frozen/i);
  });
});

describe('§36.11 — pre / buffer / post periods are calculated and overridable', () => {
  it('uses the 28 / 7 / 28 defaults', () => {
    const p = evaluationService.analysisPeriods({
      implementationDate: new Date('2026-05-01T00:00:00Z'),
    });

    expect((p.preEnd - p.preStart) / DAY_MS).toBe(28);
    expect((p.bufferEnd - p.bufferStart) / DAY_MS).toBe(7);
    expect((p.postEnd - p.postStart) / DAY_MS).toBe(28);
    expect(p.preEnd.getTime()).toBe(new Date('2026-05-01T00:00:00Z').getTime());
    expect(p.postStart.getTime()).toBe(p.bufferEnd.getTime());
  });

  it('honours per-control overrides', () => {
    const p = evaluationService.analysisPeriods({
      implementationDate: new Date('2026-05-01T00:00:00Z'),
      prePeriodDays: 14,
      implementationBufferDays: 3,
      postPeriodDays: 42,
    });

    expect((p.preEnd - p.preStart) / DAY_MS).toBe(14);
    expect((p.bufferEnd - p.bufferStart) / DAY_MS).toBe(3);
    expect((p.postEnd - p.postStart) / DAY_MS).toBe(42);
  });
});

// ── The full journey, used by the remaining criteria ─────────────────────────

describe('§36.12–14, §17, §18, §32 — verification, migration and sustainability', () => {
  let caseId;
  let interventionId;
  let evaluations;
  let migrations;

  beforeAll(async () => {
    const created = await caseService.openCase({
      tenantId,
      actor,
      title: 'Meeting reduction with possible migration',
      triggerType: 'HSR_CONCERN',
      triggerDate: periods[IMPL_INDEX].periodStart,
      teamIds: [teams.migrating.team._id],
    });
    caseId = created._id;

    const intervention = await interventionService.planIntervention({
      tenantId,
      caseId,
      actor,
      name: 'Remove three recurring cross-team status meetings',
      interventionType: 'MEETING_PRACTICE',
      implementationDate: periods[IMPL_INDEX].periodStart,
      expectedEffects: [
        { metric: 'MEETING_LOAD', direction: 'DECREASE' },
        { metric: 'AFTER_HOURS_ACTIVITY', direction: 'DECREASE' },
      ],
    });
    interventionId = intervention._id;

    await interventionService.confirmImplementation({ tenantId, interventionId, actor });
    evaluations = await evaluationService.evaluateIntervention({ tenantId, interventionId, actor });
    migrations = await migrationService.detectMigration({ tenantId, interventionId, actor });
  });

  it('§36.12 — compares post with pre without causal language', () => {
    const meetingLoad = evaluations.find((e) => e.metric === 'MEETING_LOAD');

    expect(meetingLoad.prePeriodValue).toBeGreaterThan(meetingLoad.postPeriodValue);
    expect(meetingLoad.directionMatched).toBe(true);

    const sentence = evaluationService.describeEvaluation(meetingLoad, 'meeting load');
    expect(sentence).toMatch(/After the intervention, meeting load was \d+% lower/);
    expect(interpretationService.isLanguageSafe(sentence)).toBe(true);
    expect(sentence).not.toMatch(/caused/i);
  });

  it('§36.13 — flags an improvement that did not hold', () => {
    const afterHours = evaluations.find((e) => e.metric === 'AFTER_HOURS_ACTIVITY');

    expect(afterHours.directionMatched).toBe(true);
    expect(afterHours.reboundDetected).toBe(true);
    expect(afterHours.sustained).toBe(false);
    expect(afterHours.sustainabilityPeriods.length).toBeGreaterThan(0);

    const sentence = evaluationService.describeEvaluation(afterHours, 'after-hours activity');
    expect(sentence).toMatch(/Initial improvement was not sustained/);
  });

  it('§36.14 — flags possible workload migration to another channel', () => {
    const channel = migrations.find(
      (m) => m.migrationType === 'CHANNEL' && m.destinationMetric === 'COORDINATION_CHANNEL_LOAD'
    );

    expect(channel).toBeTruthy();
    expect(channel.sourceMetric).toBe('MEETING_LOAD');
    expect(channel.destinationChange).toBeGreaterThan(0);
    expect(channel.summary).toMatch(/^Possible workload migration/);
    // §17.1 — never assert that workload definitely moved.
    expect(channel.summary).not.toMatch(/workload moved/i);
    expect(channel.summary).toMatch(/may have shifted/);
    expect(channel.investigationQuestions.length).toBeGreaterThan(2);
    expect(channel.investigationQuestions.every((q) => q.trim().endsWith('?'))).toBe(true);
  });

  it('§17 — flags possible team-to-team migration to an interacting team', () => {
    const team = migrations.find((m) => m.migrationType === 'TEAM');

    expect(team).toBeTruthy();
    expect(String(team.destinationTeamId)).toBe(String(teams.receiving.team._id));
    expect(team.summary).toMatch(/another team/);
  });

  it('raises no migration for a control where nothing else worsened', async () => {
    const cleanCase = await caseService.openCase({
      tenantId,
      actor,
      title: 'Clean meeting reduction',
      triggerType: 'PSYCHOSOCIAL_SURVEY',
      triggerDate: periods[IMPL_INDEX].periodStart,
      teamIds: [teams.clean.team._id],
    });

    const intervention = await interventionService.planIntervention({
      tenantId,
      caseId: cleanCase._id,
      actor,
      name: 'Remove two recurring status meetings',
      interventionType: 'MEETING_PRACTICE',
      implementationDate: periods[IMPL_INDEX].periodStart,
      expectedEffects: [
        { metric: 'MEETING_LOAD', direction: 'DECREASE' },
        { metric: 'AFTER_HOURS_ACTIVITY', direction: 'DECREASE' },
      ],
    });

    await interventionService.confirmImplementation({
      tenantId,
      interventionId: intervention._id,
      actor,
    });
    await evaluationService.evaluateIntervention({
      tenantId,
      interventionId: intervention._id,
      actor,
    });
    const cleanMigrations = await migrationService.detectMigration({
      tenantId,
      interventionId: intervention._id,
      actor,
    });

    expect(cleanMigrations).toHaveLength(0);
  });

  it('§36.15 — shows metadata and worker feedback as mixed evidence', async () => {
    await consultationService.recordConsultation({
      tenantId,
      caseId,
      actor,
      date: new Date(),
      method: 'PULSE',
      groupDescription: 'Follow-up, 11 responses',
      workerViews: ['More asynchronous requests and evening catch-up.'],
      managementResponse: ['Reviewing workload and priority controls.'],
      decisionImpact: ['Prevented closure as a success on meeting load alone.'],
      workerReportedDirection: 'WORSENED',
      isPostInterventionFollowUp: true,
      interventionId,
    });

    const completeness = await completenessService.assessCompleteness({ tenantId, caseId });

    expect(completeness.mixedEvidence.present).toBe(true);
    expect(completeness.mixedEvidence.statement).toMatch(/^Mixed evidence/);
    expect(completeness.mixedEvidence.statement).toMatch(/Further investigation may be required/);
    // No success label anywhere.
    expect(interpretationService.isLanguageSafe(completeness.mixedEvidence.statement)).toBe(true);
  });

  it('§36.16 — completeness lists outstanding components and never grades evidence', async () => {
    const completeness = await completenessService.assessCompleteness({ tenantId, caseId });

    expect(completeness.components.length).toBeGreaterThanOrEqual(10);
    expect(completeness.note).toMatch(/organisation/i);
    expect(completeness).not.toHaveProperty('score');
    expect(completeness).not.toHaveProperty('sufficient');
    // No component may be labelled sufficient or insufficient. The only place
    // the word appears is the note attributing that judgement to the customer.
    for (const component of completeness.components) {
      expect(component.status).not.toMatch(/sufficien/i);
      expect(component.label).not.toMatch(/sufficien/i);
    }
    expect(completeness.note).toMatch(/is the organisation’s judgement/);

    const decision = completeness.components.find((c) => c.key === 'organisationDecision');
    expect(decision.status).toBe('PENDING');
  });

  it('§36.17 — only a human can close the case', async () => {
    await expect(
      caseService.setStatus({ tenantId, caseId, actor, status: 'CLOSED_IMPROVEMENT_OBSERVED' })
    ).rejects.toThrow(/only be closed through a recorded organisation decision/i);

    await expect(
      caseService.recordDecision({
        tenantId,
        caseId,
        actor: {},
        status: 'CLOSED_MIXED_EVIDENCE',
        organisationDecision: 'Close',
      })
    ).rejects.toThrow(/must be recorded by a person/i);

    await expect(
      caseService.recordDecision({
        tenantId,
        caseId,
        actor,
        status: 'CLOSED_MIXED_EVIDENCE',
        organisationDecision: '',
      })
    ).rejects.toThrow(/organisation decision must be recorded/i);

    const closed = await caseService.recordDecision({
      tenantId,
      caseId,
      actor,
      status: 'CLOSED_MIXED_EVIDENCE',
      organisationDecision:
        'Continue the review; consider a workload or coordination control rather than declaring the meeting change effective.',
      decisionNotes: 'Possible migration and an unsustained after-hours improvement.',
    });

    expect(CLOSED_STATUSES).toContain(closed.status);
    expect(String(closed.closedBy)).toBe(String(hsAdmin._id));
    expect(closed.closedAt).toBeTruthy();
  });

  it('§36.18, §36.21 — the Evidence Pack carries the full chain and is audited', async () => {
    const before = await ControlReviewAuditEvent.countDocuments({
      tenantId,
      action: 'EVIDENCE_PACK_GENERATED',
    });

    const { pack, buffer, fileName } = await evidencePackService.generateEvidencePack({
      tenantId,
      caseId,
      actor,
    });

    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(8000);
    expect(fileName).toMatch(/^CR-\d+-evidence-pack-v\d+\.pdf$/);

    // Trigger → investigation → consultation → control → verification →
    // decision → audit timeline.
    expect(pack.snapshot.trigger.type).toBe('HSR_CONCERN');
    expect(pack.snapshot.evaluations.length).toBeGreaterThan(0);
    expect(pack.snapshot.migrations.length).toBeGreaterThan(0);
    expect(pack.snapshot.decision.organisationDecision).toBeTruthy();
    expect(pack.snapshot.completeness).toBeTruthy();
    expect(pack.snapshot.algorithmVersion).toMatch(/^au-control-verification-/);

    const after = await ControlReviewAuditEvent.countDocuments({
      tenantId,
      action: 'EVIDENCE_PACK_GENERATED',
    });
    expect(after).toBe(before + 1);
  });

  it('§36.21 — downloading a pack re-renders that version and audits the export', async () => {
    const pack = await EvidencePack.findOne({ tenantId, caseId }).sort({ version: -1 }).lean();
    const versionsBefore = await EvidencePack.countDocuments({ tenantId, caseId });

    const exported = await evidencePackService.exportEvidencePack({
      tenantId,
      packId: pack._id,
      actor,
    });

    // The reader asked for this version and must receive it, not a new one.
    expect(exported.pack.version).toBe(pack.version);
    expect(exported.fileName).toBe(pack.fileName);
    expect(exported.buffer.slice(0, 4).toString()).toBe('%PDF');
    expect(await EvidencePack.countDocuments({ tenantId, caseId })).toBe(versionsBefore);

    const exportEvents = await ControlReviewAuditEvent.countDocuments({
      tenantId,
      action: 'EVIDENCE_PACK_EXPORTED',
      objectId: pack._id,
    });
    expect(exportEvents).toBe(1);
  });

  it('§37 — pack values match the stored source calculations', async () => {
    const pack = await EvidencePack.findOne({ tenantId, caseId }).sort({ version: -1 }).lean();
    const stored = await InterventionEvaluation.find({ tenantId, interventionId }).lean();

    for (const snapshotRow of pack.snapshot.evaluations) {
      const source = stored.find((e) => e.metric === snapshotRow.metric);
      expect(source).toBeTruthy();
      expect(snapshotRow.prePeriodValue).toBe(source.prePeriodValue);
      expect(snapshotRow.postPeriodValue).toBe(source.postPeriodValue);
      expect(snapshotRow.relativeChange).toBe(source.relativeChange);
      expect(snapshotRow.directionMatched).toBe(source.directionMatched);
      expect(snapshotRow.algorithmVersion).toBe(source.algorithmVersion);
    }
  });

  it('§24 — the interpretation carries all six blocks and no forbidden language', async () => {
    const caseDoc = await ControlReviewCase.findById(caseId).lean();
    const storedEvaluations = await InterventionEvaluation.find({ tenantId, interventionId }).lean();
    const storedMigrations = await MigrationFinding.find({ tenantId, interventionId }).lean();
    const storedConsultations = await ConsultationRecord.find({ tenantId, caseId }).lean();
    const completeness = await completenessService.assessCompleteness({ tenantId, caseId });

    const interpretation = interpretationService.buildInterpretation({
      caseDoc,
      observations: [],
      evaluations: storedEvaluations,
      migrations: storedMigrations,
      consultations: storedConsultations,
      contextEvents: [],
      completeness,
    });

    for (const block of [
      'OBSERVED',
      'POSSIBLE_SIGNIFICANCE',
      'INVESTIGATE',
      'ACTION_OPTIONS',
      'MONITOR',
      'LIMITATIONS',
    ]) {
      expect(interpretation.blocks[block].length).toBeGreaterThan(0);
    }

    expect(interpretation.violations).toHaveLength(0);
    const everything = Object.values(interpretation.blocks).flat().join(' ');
    expect(interpretationService.isLanguageSafe(everything)).toBe(true);
    expect(interpretation.disclaimer).toMatch(/does not determine legal compliance/);
  });
});

describe('§37 — no post-period data due to a connector outage', () => {
  it('reports the data gap rather than fabricating an evaluation', async () => {
    const created = await caseService.openCase({
      tenantId,
      actor,
      title: 'Connector outage case',
      triggerType: 'INCIDENT',
      triggerDate: new Date(),
      teamIds: [teams.quiet.team._id],
    });

    // Implementation far enough in the future that no post data can exist.
    const future = new Date(Date.now() + 120 * DAY_MS);
    const intervention = await interventionService.planIntervention({
      tenantId,
      caseId: created._id,
      actor,
      name: 'Control with no post data',
      interventionType: 'WORKLOAD',
      implementationDate: future,
      expectedEffects: [{ metric: 'AFTER_HOURS_ACTIVITY', direction: 'DECREASE' }],
    });

    const evaluations = await evaluationService.evaluateIntervention({
      tenantId,
      interventionId: intervention._id,
      actor,
    });

    const afterHours = evaluations.find((e) => e.metric === 'AFTER_HOURS_ACTIVITY');
    expect(afterHours.evaluationPossible).toBe(false);
    expect(afterHours.postPeriodValue).toBeNull();
    expect(afterHours.unavailableReason).toMatch(/no work-pattern data/i);

    const completeness = await completenessService.assessCompleteness({
      tenantId,
      caseId: created._id,
    });
    const workPattern = completeness.components.find((c) => c.key === 'workPatternEvidence');
    expect(['UNAVAILABLE', 'PARTIAL']).toContain(workPattern.status);
  });
});

describe('§37 — external trigger with no observed anomaly', () => {
  it('works normally and reports no material change without rejecting the case', async () => {
    const created = await caseService.openCase({
      tenantId,
      actor,
      title: 'Stable team, external trigger',
      triggerType: 'FORMAL_RISK_ASSESSMENT',
      triggerDate: new Date(),
      teamIds: [teams.quiet.team._id],
    });

    expect(created.status).toBe('OPENED');

    const findings = await PatternFinding.find({ tenantId, teamId: teams.quiet.team._id }).lean();
    expect(findings).toHaveLength(0);

    const interpretation = interpretationService.buildInterpretation({
      caseDoc: created,
      observations: [],
      evaluations: [],
      migrations: [],
      consultations: [],
      contextEvents: [],
      completeness: null,
    });

    expect(interpretation.blocks.OBSERVED.join(' ')).toMatch(/No material work-pattern change/);
  });
});

describe('§9.1 — the severe single-signal exception path', () => {
  it('can recommend review from one large, persistent change', async () => {
    const thresholds = await patternService.resolveThresholds(tenantId);

    expect(thresholds.minimumSignals).toBe(2);
    expect(thresholds.severeSingleSignalDeviation).toBeGreaterThan(
      thresholds.robustDeviationThreshold
    );

    // Configure a tenant where only one signal can ever qualify, then confirm
    // the exception path still produces a recommendation.
    const solo = await makeTeam('Solo Signal Team', 9);
    const events = [];
    periods.forEach(({ periodStart }, index) => {
      events.push(
        generateWeek({
          teamId: solo.team._id,
          memberIds: solo.memberIds,
          weekStart: periodStart,
          // Only after-hours moves; meetings and chat stay flat.
          profile: { meetings: 8, chat: 40, afterHours: index < 18 ? 2 : 14 },
        })
      );
    });

    const flat = events.flat();
    for (let i = 0; i < flat.length; i += 2000) {
      await WorkEvent.insertMany(flat.slice(i, i + 2000), { ordered: false });
    }

    await metricsService.persistTeamMetrics({ tenantId, teamId: solo.team._id, periods });
    for (const { periodStart } of periods) {
      await baselineService.observeTeamPeriod({ tenantId, teamId: solo.team._id, periodStart });
      await patternService.evaluateTeamPeriod({ tenantId, teamId: solo.team._id, periodStart });
    }

    const findings = await PatternFinding.find({ tenantId, teamId: solo.team._id }).lean();
    expect(findings.length).toBeGreaterThan(0);

    const afterHoursSignal = findings.some((f) =>
      f.signals.some((s) => s.metric === 'AFTER_HOURS_ACTIVITY')
    );
    expect(afterHoursSignal).toBe(true);
  });
});

describe('§36.19–20, §22 — privacy architecture', () => {
  it('exposes no individual-level record anywhere in the module', async () => {
    const collections = [
      TeamWorkPatternMetric,
      SignalObservation,
      PatternFinding,
      InterventionEvaluation,
      MigrationFinding,
    ];

    for (const Model of collections) {
      const paths = Object.keys(Model.schema.paths);
      expect(paths).not.toContain('userId');
      expect(paths).not.toContain('personId');
      expect(paths).not.toContain('actorUserId');
      // robustDeviationScore is a distance from the team's own baseline, not a
      // rating of anyone. No other score-shaped field may exist.
      const scoreFields = paths.filter((p) => /score$/i.test(p) && !/deviationScore$/i.test(p));
      expect(scoreFields).toEqual([]);
    }
  });

  it('has no burnout, stress, engagement or productivity score in the metric set', async () => {
    const { P0_METRICS, METRIC_LABELS } = await import('../models/controlReview/constants.js');
    const text = [...P0_METRICS, ...Object.values(METRIC_LABELS)].join(' ').toLowerCase();

    for (const banned of ['burnout', 'stress', 'engagement', 'productivity', 'wellbeing', 'risk score']) {
      expect(text).not.toContain(banned);
    }
  });

  it('§24.1 — screens every forbidden phrase', () => {
    const forbidden = [
      'employees are stressed',
      'burnout detected',
      'psychosocial hazard confirmed',
      'manager is overloaded',
      'employees are disengaged',
      'company is non-compliant',
      'control is legally effective',
      'the intervention caused a reduction',
    ];

    for (const phrase of forbidden) {
      expect(interpretationService.isLanguageSafe(phrase)).toBe(false);
    }
  });

  it('§24.2 — permits the product’s own language', () => {
    const permitted = [
      'persistent work-pattern change',
      'may warrant investigation',
      'possible contributing factor',
      'additional worker context is needed',
      'observed change is consistent with intended direction',
      'possible workload migration',
      'initial improvement was not sustained',
      'mixed evidence',
    ];

    for (const phrase of permitted) {
      expect(interpretationService.isLanguageSafe(phrase)).toBe(true);
    }
  });
});

describe('§23, §36.21 — roles, access and the immutable audit trail', () => {
  it('maps platform roles to H&S roles and withholds consultation detail appropriately', () => {
    expect(resolveHsRole({ role: 'hr_admin' })).toBe('HS_ADMIN');
    expect(resolveHsRole({ role: 'it_admin' })).toBe('SYSTEM_ADMIN');
    expect(resolveHsRole({ role: 'viewer' })).toBe('AUDITOR_READONLY');
    expect(resolveHsRole({ role: 'team_member' })).toBeNull();

    // A system administrator configures the platform; they do not read what
    // workers said.
    expect(HS_PERMISSIONS.SYSTEM_ADMIN.consultationDetail).toBe(false);
    expect(HS_PERMISSIONS.AUDITOR_READONLY.consultationDetail).toBe(false);
    expect(HS_PERMISSIONS.FUNCTION_LEADER.consultationDetail).toBe(false);
    expect(HS_PERMISSIONS.HS_ADMIN.consultationDetail).toBe(true);
  });

  it('redacts restricted consultation content for roles without detail access', async () => {
    const caseDoc = await ControlReviewCase.findOne({ tenantId, title: /Consultation coverage/ }).lean();

    const full = await consultationService.listConsultations({
      tenantId,
      caseId: caseDoc._id,
      includeRestricted: true,
    });
    const redacted = await consultationService.listConsultations({
      tenantId,
      caseId: caseDoc._id,
      includeRestricted: false,
    });

    expect(full[0].workerViews.length).toBeGreaterThan(0);
    expect(redacted[0].restricted).toBe(true);
    expect(redacted[0].workerViews).toBeUndefined();
  });

  it('refuses to update or delete an audit event', async () => {
    const event = await ControlReviewAuditEvent.findOne({ tenantId });
    expect(event).toBeTruthy();

    await expect(
      ControlReviewAuditEvent.updateOne({ _id: event._id }, { $set: { action: 'TAMPERED' } })
    ).rejects.toThrow(/immutable/i);

    await expect(ControlReviewAuditEvent.deleteOne({ _id: event._id })).rejects.toThrow(/immutable/i);

    event.action = 'TAMPERED';
    await expect(event.save()).rejects.toThrow(/immutable/i);
  });

  it('records an audit event for every material action', async () => {
    const actions = await ControlReviewAuditEvent.distinct('action', { tenantId });

    for (const expected of [
      'CASE_OPENED',
      'CONSULTATION_RECORDED',
      'INTERVENTION_PLANNED',
      'INTERVENTION_IMPLEMENTED',
      'CASE_CLOSED',
      'EVIDENCE_PACK_GENERATED',
      'CONFIG_CHANGED',
    ]) {
      expect(actions).toContain(expected);
    }
  });
});

describe('§36.22 — the Trust Deployment Pack gates connector activation', () => {
  let gatedTenantId;
  let gatedActor;

  beforeAll(async () => {
    const org = await Organization.create({ name: 'Gated Org' });
    gatedTenantId = org._id;
    const gatedTeam = await Team.create({
      name: 'Gated H&S',
      orgId: gatedTenantId,
      metadata: { actualSize: 3, function: 'Operations' },
    });
    const user = await User.create({
      email: 'gated@test.local',
      name: 'Gated Admin',
      role: 'hr_admin',
      orgId: gatedTenantId,
      teamId: gatedTeam._id,
      password: 'test-password-not-used',
    });
    gatedActor = { userId: user._id, email: user.email, hsRole: 'HS_ADMIN' };
  });

  it('refuses activation while required items are outstanding', async () => {
    await expect(
      trustService.acknowledgeAndActivate({
        tenantId: gatedTenantId,
        actor: gatedActor,
        legalReviewConfirmed: true,
      })
    ).rejects.toThrow(/Trust Deployment Pack must be completed/);

    await expect(trustService.assertConnectorsPermitted(gatedTenantId)).rejects.toThrow(
      /blocked until the Trust Deployment Pack/
    );
  });

  it('requires the customer to confirm their own legal review', async () => {
    for (const item of trustService.TRUST_PACK_CHECKLIST) {
      await trustService.updateChecklistItem({
        tenantId: gatedTenantId,
        actor: gatedActor,
        key: item.key,
        completed: true,
      });
    }

    await expect(
      trustService.acknowledgeAndActivate({
        tenantId: gatedTenantId,
        actor: gatedActor,
        legalReviewConfirmed: false,
      })
    ).rejects.toThrow(/legal adviser/);

    const activated = await trustService.acknowledgeAndActivate({
      tenantId: gatedTenantId,
      actor: gatedActor,
      legalReviewConfirmed: true,
    });

    expect(activated.connectorsActivated).toBe(true);
    await expect(trustService.assertConnectorsPermitted(gatedTenantId)).resolves.toBe(true);
  });

  it('§21 — the pack contains the employee explanation, data flow and metadata dictionary', async () => {
    const pack = await trustService.getTrustPack({ tenantId: gatedTenantId, actor: gatedActor });

    expect(pack.checklist).toHaveLength(10);
    expect(pack.dataFlow.length).toBeGreaterThan(10);
    expect(pack.metadataDictionary.length).toBeGreaterThanOrEqual(4);
    expect(pack.employeeExplanation.whatItDoesNotCollect.join(' ')).toMatch(/content of any message/i);
    expect(pack.employeeExplanation.minimumGroupRule).toMatch(/\d+ people/);
    expect(pack.disclaimer).toMatch(/does not determine legal compliance/);
    expect(pack.legalNote).toMatch(/not legal advice/i);

    for (const entry of pack.metadataDictionary) {
      expect(entry.excluded.length).toBeGreaterThan(0);
    }
  });

  it('§4 — surfaces jurisdiction checkpoints without asserting compliance', async () => {
    await trustService.updateConfiguration({
      tenantId: gatedTenantId,
      actor: gatedActor,
      updates: { jurisdictions: ['NSW', 'VIC'], primaryJurisdiction: 'NSW' },
    });

    const pack = await trustService.getTrustPack({ tenantId: gatedTenantId, actor: gatedActor });
    const text = pack.jurisdictionCheckpoints.map((c) => c.checkpoint).join(' ');

    expect(text).toMatch(/Workplace Surveillance Act 2005/);
    expect(text).toMatch(/WorkSafe Victoria/);
    expect(text).not.toMatch(/you are compliant/i);
  });
});

describe('the product is not Australia-only', () => {
  let euTenantId;
  let euActor;

  beforeAll(async () => {
    const org = await Organization.create({ name: 'Tehnopol-style EU Org' });
    euTenantId = org._id;
    const team = await Team.create({
      name: 'EU H&S',
      orgId: euTenantId,
      metadata: { actualSize: 3, function: 'Operations' },
    });
    const user = await User.create({
      email: 'eu.admin@test.local',
      name: 'EU Admin',
      role: 'hr_admin',
      orgId: euTenantId,
      teamId: team._id,
      password: 'test-password-not-used',
    });
    euActor = { userId: user._id, email: user.email, hsRole: 'HS_ADMIN' };
  });

  it('defaults a brand-new tenant to no jurisdiction and a neutral timezone', async () => {
    const config = await trustService.getOrCreateConfig({ tenantId: euTenantId, actor: euActor });

    // A customer outside Australia must never be silently defaulted into an
    // Australian state or timezone.
    expect(config.primaryJurisdiction).toBe('GLOBAL');
    expect(config.defaultTimezone).toBe('UTC');
    expect(config.defaultTimezone).not.toMatch(/Australia/);
  });

  it('accepts a non-Australian jurisdiction and serves its own checkpoints', async () => {
    const pack = await trustService.updateConfiguration({
      tenantId: euTenantId,
      actor: euActor,
      updates: { jurisdictions: ['EE'], primaryJurisdiction: 'EE' },
    });

    const text = pack.jurisdictionCheckpoints.map((c) => c.checkpoint).join(' ');

    expect(text).toMatch(/GDPR/);
    expect(text).toMatch(/Occupational Health and Safety Act/);
    expect(text).toMatch(/works-council|working environment representative/i);
    // Estonia must not be shown Australian state law.
    expect(text).not.toMatch(/Workplace Surveillance Act/);
    expect(text).not.toMatch(/WorkSafe Victoria/);
    expect(text).not.toMatch(/Comcare/);
  });

  it('inherits the global floor beneath every regional pack', async () => {
    const ee = jurisdictionPacks.resolvePack('EE');
    const sources = [...new Set(ee.checkpoints.map((c) => c.jurisdiction))];

    expect(sources).toEqual(['GLOBAL', 'EU', 'EE']);
    expect(ee.checkpoints.length).toBeGreaterThan(5);
  });

  it('degrades an unmodelled country to the universal checklist instead of failing', async () => {
    const pack = await trustService.updateConfiguration({
      tenantId: euTenantId,
      actor: euActor,
      updates: { jurisdictions: ['ZZ'], primaryJurisdiction: 'ZZ' },
    });

    // Still deployable, and honest that no pack exists for it.
    expect(pack.jurisdictionCheckpoints.length).toBeGreaterThan(0);
    expect(pack.unrecognisedJurisdictions).toContain('ZZ');
    expect(pack.checklist).toHaveLength(10);
  });

  it('keeps the deployment checklist and disclaimer country-neutral', async () => {
    const pack = await trustService.getTrustPack({ tenantId: euTenantId, actor: euActor });

    const checklistText = pack.checklist.map((i) => `${i.label} ${i.guidance}`).join(' ');
    expect(checklistText).not.toMatch(/Australia|WHS|Safe Work/i);

    expect(pack.disclaimer).not.toMatch(/Australia/i);
    expect(pack.legalNote).not.toMatch(/Australian/i);
    expect(pack.legalNote).toMatch(/not legal advice/i);

    // Worker representation is described generically, not by one country's term.
    expect(checklistText).toMatch(/works council|representative/i);
  });

  it('admits which checkpoint packs no adviser has signed off on', async () => {
    await trustService.updateConfiguration({
      tenantId: euTenantId,
      actor: euActor,
      updates: { jurisdictions: ['EE'], primaryJurisdiction: 'EE' },
    });
    const pack = await trustService.getTrustPack({ tenantId: euTenantId, actor: euActor });

    // Ships unreviewed everywhere, and says so rather than looking authoritative.
    expect(pack.awaitingCounselReview.map((j) => j.code)).toContain('EE');
    expect(pack.counselReviewNote).toMatch(/has not yet been reviewed by a qualified adviser/);
    expect(jurisdictionPacks.resolvePack('EE').counselReviewed).toBe(false);
    expect(jurisdictionPacks.listJurisdictions().every((j) => 'counselReviewed' in j)).toBe(true);
  });

  it('offers jurisdictions beyond Australia in the picker', () => {
    const codes = jurisdictionPacks.listJurisdictions().map((j) => j.code);

    for (const expected of ['GLOBAL', 'EU', 'EE', 'UK', 'US', 'AU', 'VIC']) {
      expect(codes).toContain(expected);
    }

    const regions = [...new Set(jurisdictionPacks.listJurisdictions().map((j) => j.region))];
    expect(regions.length).toBeGreaterThan(2);
  });

  it('runs the whole case workflow for a tenant with no jurisdiction configured', async () => {
    const created = await caseService.openCase({
      tenantId: euTenantId,
      actor: euActor,
      title: 'Workload concern raised through the works council',
      triggerType: 'WORKER_CONSULTATION',
      triggerDate: new Date(),
      teamIds: [],
    });

    expect(created.caseNumber).toMatch(/^CR-\d+$/);

    const completeness = await completenessService.assessCompleteness({
      tenantId: euTenantId,
      caseId: created._id,
    });
    expect(completeness.components.length).toBeGreaterThanOrEqual(10);

    // The verification vocabulary is identical regardless of country.
    const interpretation = interpretationService.buildInterpretation({
      caseDoc: created,
      observations: [],
      evaluations: [],
      migrations: [],
      consultations: [],
      contextEvents: [],
      completeness,
    });
    expect(interpretation.violations).toHaveLength(0);
    expect(interpretation.disclaimer).not.toMatch(/Australia/i);
  });
});

describe('§7 — the dashboard answers the five operational questions', () => {
  it('returns exactly the five modules', async () => {
    const dashboard = await dashboardService.buildDashboard({ tenantId });

    expect(Object.keys(dashboard.modules)).toEqual([
      'needsAttention',
      'controlsBeingImplemented',
      'monitoring',
      'reviewsDue',
      'exceptions',
    ]);

    expect(dashboard.modules.needsAttention.question).toBe('What needs attention now?');
    expect(dashboard.modules.exceptions.question).toBe(
      'Where did the expected improvement not hold?'
    );
  });

  it('surfaces migration, rebound and mixed evidence as exceptions', async () => {
    const dashboard = await dashboardService.buildDashboard({ tenantId });
    const types = dashboard.modules.exceptions.items.map((e) => e.type);

    expect(types).toContain('POSSIBLE_WORKLOAD_MIGRATION');
    expect(types).toContain('IMPROVEMENT_NOT_SUSTAINED');
  });

  it('gives every open case a concrete next step', async () => {
    const dashboard = await dashboardService.buildDashboard({ tenantId });
    for (const item of dashboard.modules.needsAttention.items) {
      expect(item.nextStep).toBeTruthy();
      expect(item.nextStep.length).toBeGreaterThan(10);
    }
  });

  it('§30.2 — the weekly digest carries all ten sections', async () => {
    const digest = await dashboardService.buildWeeklyDigest({ tenantId });

    for (const key of [
      'newCasesWorthReviewing',
      'activeInvestigations',
      'consultationsAwaitingCompletion',
      'controlsBeingImplemented',
      'controlsMonitored',
      'reviewsDue',
      'possibleWorkloadMigration',
      'shortLivedImprovements',
      'decisionsAwaitingOwner',
      'evidencePacksGenerated',
    ]) {
      expect(digest).toHaveProperty(key);
    }
  });
});
