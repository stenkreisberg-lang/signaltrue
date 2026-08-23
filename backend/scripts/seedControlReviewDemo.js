/**
 * Seeded end-to-end demo for the Australia control-verification module
 * (spec §31, §32, §36.24).
 *
 * Builds two complete journeys against a real database:
 *
 *   CR-101  the §31 journey — survey trigger, consultation, meeting control,
 *           improvement observed, no material migration, decision recorded.
 *   CR-102  the §32 exception — meetings fall, but chat coordination and
 *           after-hours rise and the early improvement does not hold.
 *
 * Also seeds a below-threshold team to demonstrate suppression, and a team with
 * a connector outage to demonstrate an honest data gap.
 *
 * Usage: node scripts/seedControlReviewDemo.js [--drop] [--emit-pdf <dir>]
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
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
  TriggerEvidence,
  TeamWorkPatternMetric,
  SignalObservation,
  PatternFinding,
  InterventionEvaluation,
  MigrationFinding,
  EvidencePack,
  ControlReviewAuditEvent,
  HsDeploymentConfig,
} from '../models/controlReview/index.js';
import metricsService from '../services/controlReview/workPatternMetricsService.js';
import baselineService from '../services/controlReview/baselineDeviationService.js';
import patternService from '../services/controlReview/patternDetectionService.js';
import caseService from '../services/controlReview/controlReviewCaseService.js';
import consultationService from '../services/controlReview/consultationService.js';
import interventionService from '../services/controlReview/controlInterventionService.js';
import evaluationService from '../services/controlReview/interventionEvaluationService.js';
import migrationService from '../services/controlReview/workloadMigrationService.js';
import completenessService from '../services/controlReview/reviewCompletenessService.js';
import trustService from '../services/controlReview/trustDeploymentService.js';
import evidencePackService from '../services/controlReview/evidencePackService.js';
import scheduleService from '../services/controlReview/workingScheduleService.js';

dotenv.config();

const DAY_MS = 24 * 60 * 60 * 1000;
const TZ = 'Australia/Melbourne';

// Anchor the demo so the post period and sustainability window have both closed.
const NOW = new Date();

function weeksAgo(n) {
  return new Date(NOW.getTime() - n * 7 * DAY_MS);
}

/** Build a calendar meeting event inside working hours. */
function meetingEvent({ orgId, teamId, userId, at, durationMinutes = 60, recurring = false, participantTeamIds = [] }) {
  return {
    orgId,
    source: 'google-calendar',
    eventType: 'meeting',
    actorUserId: userId,
    teamId,
    timestamp: at,
    externalId: `demo-${userId}-${at.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    metadata: {
      startTime: at,
      endTime: new Date(at.getTime() + durationMinutes * 60000),
      durationMinutes,
      isRecurring: recurring,
      isCancelled: false,
      isAllDay: false,
      attendeeCount: 6,
      participantTeamIds,
      meetingInstanceIdHash: `mtg-${at.getTime()}`,
    },
  };
}

function messageEvent({ orgId, teamId, userId, at, source = 'slack' }) {
  return {
    orgId,
    source,
    eventType: 'message',
    actorUserId: userId,
    teamId,
    timestamp: at,
    externalId: `demo-msg-${userId}-${at.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    metadata: {},
  };
}

function emailEvent({ orgId, teamId, userId, at }) {
  return {
    orgId,
    source: 'gmail',
    eventType: 'email_sent',
    actorUserId: userId,
    teamId,
    timestamp: at,
    externalId: `demo-eml-${userId}-${at.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    metadata: { toCount: 3, isExternal: false },
  };
}

/** Local-time helper: returns a UTC instant for a local hour on a given day. */
function atLocalHour(dayDate, hour, minute = 0) {
  const iso = scheduleService.toLocalParts(dayDate, TZ).isoDate;
  return scheduleService.localDateTimeToUtc(iso, hour * 60 + minute, TZ);
}

/**
 * Generate a week of events for one team with a given intensity profile.
 * `profile` is per-person-per-week counts; the generator spreads them across
 * the working week and, for after-hours, into the evening.
 */
function generateWeek({ orgId, teamId, memberIds, weekStart, profile, partnerTeamIds = [] }) {
  const events = [];
  // Monday–Friday of this week. The midday offset keeps the local date correct
  // when a DST change shifts the wall clock inside the week.
  const workingDays = [0, 1, 2, 3, 4].map(
    (offset) => new Date(weekStart.getTime() + offset * DAY_MS + 12 * 60 * 60 * 1000)
  );

  for (const userId of memberIds) {
    // Meetings, spread over the week inside working hours.
    for (let i = 0; i < profile.meetings; i += 1) {
      const day = workingDays[i % workingDays.length];
      const hour = 9 + ((i * 2) % 7);
      events.push(
        meetingEvent({
          orgId,
          teamId,
          userId,
          at: atLocalHour(day, hour),
          durationMinutes: profile.meetingMinutes || 60,
          recurring: i % 2 === 0,
          // Every third meeting is cross-team, which is what makes a
          // team-to-team migration check possible at all.
          participantTeamIds: partnerTeamIds.length && i % 3 === 0 ? partnerTeamIds : [],
        })
      );
    }

    // Chat and email inside working hours.
    for (let i = 0; i < profile.chat; i += 1) {
      const day = workingDays[i % workingDays.length];
      events.push(
        messageEvent({ orgId, teamId, userId, at: atLocalHour(day, 10 + (i % 6), (i * 7) % 60) })
      );
    }
    for (let i = 0; i < profile.email; i += 1) {
      const day = workingDays[i % workingDays.length];
      events.push(emailEvent({ orgId, teamId, userId, at: atLocalHour(day, 11 + (i % 5), (i * 11) % 60) }));
    }

    // After-hours activity: evenings, outside the 09:00–17:00 schedule.
    for (let i = 0; i < profile.afterHours; i += 1) {
      const day = workingDays[i % workingDays.length];
      events.push(
        messageEvent({ orgId, teamId, userId, at: atLocalHour(day, 19 + (i % 3), (i * 13) % 60) })
      );
    }
  }

  return events;
}

async function main() {
  const shouldDrop = process.argv.includes('--drop');
  const emitIndex = process.argv.indexOf('--emit-pdf');
  const emitDir = emitIndex >= 0 ? process.argv[emitIndex + 1] : null;
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/signaltrue';

  await mongoose.connect(uri);
  console.log(`Connected to ${uri.replace(/\/\/[^@]*@/, '//***@')}`);

  const org = await Organization.findOneAndUpdate(
    { name: 'Southern Cross Logistics (demo)' },
    { $set: { name: 'Southern Cross Logistics (demo)', isActive: true } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  const tenantId = org._id;

  if (shouldDrop) {
    console.log('Clearing previous demo data…');
    await Promise.all([
      ControlReviewCase.deleteMany({ tenantId }),
      TriggerEvidence.deleteMany({ tenantId }),
      ContextEvent.deleteMany({ tenantId }),
      ConsultationRecord.deleteMany({ tenantId }),
      ControlIntervention.deleteMany({ tenantId }),
      InterventionEvaluation.deleteMany({ tenantId }),
      MigrationFinding.deleteMany({ tenantId }),
      TeamWorkPatternMetric.deleteMany({ tenantId }),
      SignalObservation.deleteMany({ tenantId }),
      PatternFinding.deleteMany({ tenantId }),
      EvidencePack.deleteMany({ tenantId }),
      ControlReviewAuditEvent.purgeForRetention({ tenantId }, { reason: 'demo tenant reseed' }),
      WorkEvent.deleteMany({ orgId: tenantId }),
      OrgUnit.deleteMany({ orgId: tenantId }),
      HsDeploymentConfig.deleteMany({ tenantId }),
      WorkingSchedule.deleteMany({ tenantId }),
    ]);
  }

  // ── People and teams ───────────────────────────────────────────────────────
  const hsAdmin = await User.findOneAndUpdate(
    { email: 'hs.manager@demo.signaltrue.com' },
    {
      $set: {
        email: 'hs.manager@demo.signaltrue.com',
        name: 'Priya Raman',
        role: 'hr_admin',
        orgId: tenantId,
        password: 'seeded-demo-account-not-for-login',
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const actor = { userId: hsAdmin._id, email: hsAdmin.email, role: 'hr_admin', hsRole: 'HS_ADMIN' };

  async function makeTeam(name, size, fn = 'Engineering') {
    const team = await Team.findOneAndUpdate(
      { name, orgId: tenantId },
      { $set: { name, orgId: tenantId, 'metadata.actualSize': size, 'metadata.function': fn } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    const memberIds = [];
    for (let i = 0; i < size; i += 1) {
      const email = `${name.toLowerCase().replace(/\W+/g, '.')}.${i}@demo.signaltrue.com`;
      const user = await User.findOneAndUpdate(
        { email },
        {
          $set: {
            email,
            name: `${name} member ${i + 1}`,
            role: 'team_member',
            orgId: tenantId,
            teamId: team._id,
            password: 'seeded-demo-account-not-for-login',
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
      memberIds.push(user._id);

      await OrgUnit.findOneAndUpdate(
        { orgId: tenantId, userId: user._id, effectiveTo: null },
        {
          $set: {
            orgId: tenantId,
            userId: user._id,
            teamId: team._id,
            isManager: i === 0,
            roleLevel: i === 0 ? 2 : 0,
            source: 'manual',
            effectiveFrom: weeksAgo(30),
            effectiveTo: null,
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    }

    return { team, memberIds };
  }

  const engineering = await makeTeam('Engineering Platform', 12);
  const support = await makeTeam('Customer Support', 11, 'Support');
  const dataOps = await makeTeam('Data Operations', 10, 'Operations');
  const smallTeam = await makeTeam('Security Guild', 6, 'Engineering');

  // ── Working schedule and deployment config ─────────────────────────────────
  await WorkingSchedule.findOneAndUpdate(
    { tenantId, scope: 'ORG', teamId: null, personId: null },
    {
      $set: {
        tenantId,
        scope: 'ORG',
        timezone: TZ,
        days: [
          { dayOfWeek: 0, working: false, startMinute: 540, endMinute: 1020 },
          { dayOfWeek: 1, working: true, startMinute: 540, endMinute: 1020 },
          { dayOfWeek: 2, working: true, startMinute: 540, endMinute: 1020 },
          { dayOfWeek: 3, working: true, startMinute: 540, endMinute: 1020 },
          { dayOfWeek: 4, working: true, startMinute: 540, endMinute: 1020 },
          { dayOfWeek: 5, working: true, startMinute: 540, endMinute: 1020 },
          { dayOfWeek: 6, working: false, startMinute: 540, endMinute: 1020 },
        ],
        publicHolidays: [],
        createdBy: hsAdmin._id,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const config = await trustService.getOrCreateConfig({ tenantId, actor });
  config.primaryJurisdiction = 'VIC';
  config.jurisdictions = ['VIC', 'NSW'];
  config.defaultTimezone = TZ;
  await config.save();

  for (const item of trustService.TRUST_PACK_CHECKLIST) {
    await trustService.updateChecklistItem({ tenantId, actor, key: item.key, completed: true });
  }
  await trustService.acknowledgeAndActivate({ tenantId, actor, legalReviewConfirmed: true });
  console.log('Trust Deployment Pack acknowledged; connectors activated.');

  // ── Work events ────────────────────────────────────────────────────────────
  console.log('Generating work events…');
  await WorkEvent.deleteMany({ orgId: tenantId });

  const schedule = await scheduleService.resolveSchedule({ tenantId });
  const periods = scheduleService.weeklyPeriods({ end: NOW, weeks: 24, schedule });

  const events = [];

  // Implementation lands at period index 15. With a 7-day buffer and a 28-day
  // post period that makes week 15 the buffer, weeks 16–19 the post period and
  // weeks 20+ the sustainability window.
  const IMPL_INDEX = 15;
  const POST_START = IMPL_INDEX + 1;
  const POST_END = IMPL_INDEX + 5;

  // Engineering: the §32 exception. Meetings fall and after-hours improves at
  // first, chat coordination climbs throughout, and the after-hours improvement
  // gives way in the sustainability window.
  periods.forEach(({ periodStart }, index) => {
    let profile;
    if (index < 11) {
      profile = { meetings: 8, chat: 40, email: 12, afterHours: 3 };
    } else if (index < IMPL_INDEX) {
      // Persistent work-demand change that produces the PatternFinding.
      profile = { meetings: 13, chat: 58, email: 15, afterHours: 8 };
    } else if (index < POST_START) {
      profile = { meetings: 11, chat: 66, email: 15, afterHours: 7 };
    } else if (index < POST_END) {
      // Post period: meetings down, after-hours down, chat sharply up.
      profile = { meetings: 9, chat: 84, email: 16, afterHours: 6 };
    } else {
      // Sustainability window: the after-hours improvement does not hold.
      profile = { meetings: 9, chat: 88, email: 17, afterHours: 11 };
    }
    events.push(
      ...generateWeek({
        orgId: tenantId,
        teamId: engineering.team._id,
        memberIds: engineering.memberIds,
        weekStart: periodStart,
        profile,
        partnerTeamIds: [dataOps.team._id],
      })
    );
  });

  // Support: the §31 clean journey — meetings fall, nothing else rises.
  periods.forEach(({ periodStart }, index) => {
    let profile;
    if (index < 11) profile = { meetings: 9, chat: 45, email: 14, afterHours: 4 };
    else if (index < IMPL_INDEX) profile = { meetings: 14, chat: 52, email: 16, afterHours: 8 };
    else if (index < POST_START) profile = { meetings: 12, chat: 50, email: 15, afterHours: 6 };
    else profile = { meetings: 10, chat: 47, email: 15, afterHours: 5 };
    events.push(
      ...generateWeek({
        orgId: tenantId,
        teamId: support.team._id,
        memberIds: support.memberIds,
        weekStart: periodStart,
        profile,
      })
    );
  });

  // Data Operations: the team Engineering coordinates with, and the one demand
  // appears to move to after the Engineering control.
  periods.forEach(({ periodStart }, index) => {
    const profile =
      index < POST_START
        ? { meetings: 7, chat: 38, email: 11, afterHours: 3 }
        : { meetings: 8, chat: 58, email: 13, afterHours: 6 };
    events.push(
      ...generateWeek({
        orgId: tenantId,
        teamId: dataOps.team._id,
        memberIds: dataOps.memberIds,
        weekStart: periodStart,
        profile,
        partnerTeamIds: [engineering.team._id],
      })
    );
  });

  // Security Guild: below the minimum group size — suppressed everywhere.
  periods.forEach(({ periodStart }) => {
    events.push(
      ...generateWeek({
        orgId: tenantId,
        teamId: smallTeam.team._id,
        memberIds: smallTeam.memberIds,
        weekStart: periodStart,
        profile: { meetings: 10, chat: 50, email: 12, afterHours: 6 },
      })
    );
  });

  for (let i = 0; i < events.length; i += 2000) {
    await WorkEvent.insertMany(events.slice(i, i + 2000), { ordered: false });
  }
  console.log(`Inserted ${events.length} content-free work events.`);

  // ── Metrics, baselines, pattern findings ───────────────────────────────────
  console.log('Calculating metrics, baselines and pattern findings…');
  const teams = [engineering, support, dataOps, smallTeam];
  for (const { team } of teams) {
    await metricsService.persistTeamMetrics({ tenantId, teamId: team._id, periods });
    for (const { periodStart } of periods) {
      await baselineService.observeTeamPeriod({ tenantId, teamId: team._id, periodStart });
      await patternService.evaluateTeamPeriod({ tenantId, teamId: team._id, periodStart });
    }
  }

  const findings = await PatternFinding.find({ tenantId, status: 'REVIEW_RECOMMENDED' }).lean();
  console.log(`Pattern findings recommending review: ${findings.length}`);

  // ── Context events ─────────────────────────────────────────────────────────
  await ContextEvent.findOneAndUpdate(
    { tenantId, name: 'Freight platform go-live' },
    {
      $set: {
        tenantId,
        name: 'Freight platform go-live',
        eventType: 'PRODUCT_LAUNCH',
        teamIds: [engineering.team._id],
        startDate: periods[12].periodStart,
        endDate: periods[14].periodEnd,
        notes: 'Staged rollout across three regions. Known elevated coordination during this window.',
        createdBy: hsAdmin._id,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  // ══ CR journey A: external survey trigger, clean improvement (§31) ══════════
  console.log('Building case A — external survey trigger…');
  const caseA = await caseService.openCase({
    tenantId,
    actor,
    title: 'High job demands reported in Customer Support',
    description:
      'Annual psychosocial survey identified high job demands and low recovery in Customer Support. No SignalTrue pattern initiated this review.',
    triggerType: 'PSYCHOSOCIAL_SURVEY',
    triggerReference: 'People Matter Survey 2026 — Support cohort',
    triggerDate: periods[13].periodStart,
    teamIds: [support.team._id],
    initialEvidenceSummary:
      'Survey scores for job demands moved from 3.1 to 4.2 for the Support cohort, with free-text comments describing meeting volume and deadline pressure.',
    triggerEvidence: {
      sourceName: 'People Matter Survey 2026',
      sourceDate: periods[13].periodStart,
      referenceUrlOrId: 'PMS-2026-SUPPORT',
      summary: 'Job demands and recovery scores fell below the organisation-wide result for this cohort.',
    },
  });

  await caseService.saveInvestigation({
    tenantId,
    caseId: caseA._id,
    actor,
    investigation: {
      whatIsKnown:
        'Survey results show elevated job demands. Work-pattern data shows meeting load and after-hours activity above this team’s own baseline.',
      whatIsUncertain:
        'Whether the change reflects a temporary escalation cycle or a durable change in how the work is organised.',
      whyReviewIsNeeded:
        'A control has been proposed and the organisation needs evidence about whether it changes day-to-day work.',
      openQuestions: [
        'Have recurring status meetings increased in the last quarter?',
        'Have deadlines or escalation volumes changed?',
      ],
      consultationNeeded: 'Team meeting with Support, HSR present.',
    },
  });

  await consultationService.recordConsultation({
    tenantId,
    caseId: caseA._id,
    actor,
    date: periods[14].periodStart,
    method: 'MEETING',
    groupDescription: 'Customer Support team meeting, 11 attendees',
    participantCount: 11,
    hsrInvolved: true,
    questions: consultationService.SUGGESTED_QUESTIONS.slice(0, 5),
    workerViews: [
      'Three recurring status meetings each week overlap with peak ticket volume.',
      'Client deadline changes arrive late in the day and push work into the evening.',
    ],
    managementResponse: [
      'Team lead agreed to remove two of the three recurring status meetings.',
      'Escalation deadline for one major client to be moved by agreement.',
    ],
    decisionImpact: [
      'Worker views directly determined which meetings were removed rather than shortened.',
    ],
    summary: 'Workers linked demand to recurring meetings and late deadline changes.',
    keyThemes: ['recurring meetings', 'deadline pressure'],
    workerReportedDirection: 'NOT_ASSESSED',
  });

  const interventionA = await interventionService.planIntervention({
    tenantId,
    caseId: caseA._id,
    actor,
    name: 'Remove two recurring status meetings and move one client deadline',
    description:
      'Two of three weekly recurring status meetings removed. One major client escalation deadline moved by agreement.',
    interventionType: 'MEETING_PRACTICE',
    implementationDate: periods[IMPL_INDEX].periodStart,
    expectedEffects: [
      { metric: 'MEETING_LOAD', direction: 'DECREASE', rationale: 'Two recurring meetings removed.' },
      {
        metric: 'UNINTERRUPTED_CALENDAR_AVAILABILITY',
        direction: 'INCREASE',
        rationale: 'Freed calendar time during working hours.',
      },
      {
        metric: 'AFTER_HOURS_ACTIVITY',
        direction: 'DECREASE',
        rationale: 'Less catch-up work expected outside schedule.',
      },
    ],
  });

  await interventionService.confirmImplementation({
    tenantId,
    interventionId: interventionA._id,
    actor,
  });

  await evaluationService.evaluateIntervention({ tenantId, interventionId: interventionA._id, actor });
  const migrationsA = await migrationService.detectMigration({
    tenantId,
    interventionId: interventionA._id,
    actor,
  });

  await consultationService.recordConsultation({
    tenantId,
    caseId: caseA._id,
    actor,
    date: new Date(NOW.getTime() - 3 * DAY_MS),
    method: 'PULSE',
    groupDescription: 'Customer Support follow-up, 10 responses',
    participantCount: 10,
    hsrInvolved: false,
    questions: ['Can you finish core work inside your normal hours more often than before?'],
    workerViews: ['Most workers report being able to finish core work during normal schedules.'],
    managementResponse: ['Team lead will keep the reduced meeting pattern in place.'],
    decisionImpact: ['Supports continuing the control rather than adding a further change.'],
    summary: 'Follow-up indicates improvement is felt as well as observed.',
    workerReportedDirection: 'IMPROVED',
    isPostInterventionFollowUp: true,
    interventionId: interventionA._id,
    feedbackBackToWorkers: {
      provided: true,
      date: new Date(NOW.getTime() - 2 * DAY_MS),
      description: 'Results shared at the team meeting; the reduced meeting pattern will continue.',
    },
  });

  await caseService.recordDecision({
    tenantId,
    caseId: caseA._id,
    actor,
    status: 'CLOSED_IMPROVEMENT_OBSERVED',
    organisationDecision: 'Continue the control; review again in 8 weeks.',
    decisionNotes:
      'Observed work-pattern changes moved in the intended direction and worker follow-up was consistent. No material migration flagged.',
    nextReviewDate: new Date(NOW.getTime() + 56 * DAY_MS),
  });

  const packA = await evidencePackService.generateEvidencePack({ tenantId, caseId: caseA._id, actor });
  if (emitDir) fs.writeFileSync(path.join(emitDir, packA.fileName), packA.buffer);
  console.log(`  ${caseA.caseNumber}: closed, evidence pack ${packA.fileName} (${packA.buffer.length} bytes), migrations: ${migrationsA.length}`);

  // ══ CR journey B: SignalTrue-detected, migration + rebound (§32) ════════════
  console.log('Building case B — SignalTrue pattern trigger with migration…');
  const engFinding = await PatternFinding.findOne({
    tenantId,
    teamId: engineering.team._id,
    status: 'REVIEW_RECOMMENDED',
  })
    .sort({ periodStart: -1 })
    .lean();

  const caseB = await caseService.openCase({
    tenantId,
    actor,
    title: 'Persistent work-pattern change in Engineering Platform',
    description:
      'SignalTrue observed a persistent change from this team’s own baseline. H&S opened a review after considering the recorded go-live context.',
    triggerType: 'SIGNALTRUE_PATTERN',
    triggerReference: engFinding ? String(engFinding._id) : '',
    triggerDate: engFinding?.periodStart || periods[14].periodStart,
    patternFindingId: engFinding?._id || null,
    teamIds: [engineering.team._id],
  });

  await caseService.saveInvestigation({
    tenantId,
    caseId: caseB._id,
    actor,
    investigation: {
      whatIsKnown:
        'Meeting load, after-hours activity and coordination channel load are all above this team’s own baseline, persistent across several weekly periods.',
      whatIsUncertain:
        'How much of the change is explained by the recorded freight platform go-live, which overlaps part of the period.',
      whyReviewIsNeeded:
        'The change persisted beyond the go-live window, so a work-design explanation cannot be ruled out.',
      openQuestions: [
        'Did new cross-team dependencies appear during the rollout?',
        'Has the coordination pattern returned to normal since go-live completed?',
      ],
      contextConsidered: 'Freight platform go-live recorded as an overlapping Context Event.',
    },
  });

  await consultationService.recordConsultation({
    tenantId,
    caseId: caseB._id,
    actor,
    date: periods[14].periodEnd,
    method: 'WORKSHOP',
    groupDescription: 'Engineering Platform workshop, 12 attendees',
    participantCount: 12,
    hsrInvolved: true,
    questions: consultationService.SUGGESTED_QUESTIONS.slice(0, 6),
    workerViews: [
      'Recurring cross-team status meetings multiplied during the rollout and were never removed.',
      'Handover expectations with Data Operations became unclear.',
    ],
    managementResponse: ['Remove three recurring cross-team status meetings.'],
    decisionImpact: ['Worker views determined that meetings, not headcount, were addressed first.'],
    summary: 'Workers attribute demand to meeting proliferation after the rollout.',
    keyThemes: ['cross-team meetings', 'unclear handovers'],
  });

  const interventionB = await interventionService.planIntervention({
    tenantId,
    caseId: caseB._id,
    actor,
    name: 'Remove three recurring cross-team status meetings',
    description: 'Three recurring cross-team status meetings removed following the platform go-live.',
    interventionType: 'MEETING_PRACTICE',
    implementationDate: periods[IMPL_INDEX].periodStart,
    expectedEffects: [
      { metric: 'MEETING_LOAD', direction: 'DECREASE', rationale: 'Three recurring meetings removed.' },
      {
        metric: 'AFTER_HOURS_ACTIVITY',
        direction: 'DECREASE',
        rationale: 'Expected less evening catch-up once meeting time is returned.',
      },
    ],
  });

  await interventionService.confirmImplementation({
    tenantId,
    interventionId: interventionB._id,
    actor,
  });

  await evaluationService.evaluateIntervention({ tenantId, interventionId: interventionB._id, actor });
  const migrationsB = await migrationService.detectMigration({
    tenantId,
    interventionId: interventionB._id,
    actor,
  });

  await consultationService.recordConsultation({
    tenantId,
    caseId: caseB._id,
    actor,
    date: new Date(NOW.getTime() - 4 * DAY_MS),
    method: 'PULSE',
    groupDescription: 'Engineering Platform follow-up, 11 responses',
    participantCount: 11,
    hsrInvolved: false,
    questions: ['Has the way this work is coordinated become easier or harder since the change?'],
    workerViews: [
      'Workers report more asynchronous requests and evening catch-up since the meetings were removed.',
    ],
    managementResponse: ['Reviewing whether the underlying demand needs a workload or priority control.'],
    decisionImpact: ['Prevented the review being closed as a success on the meeting metric alone.'],
    summary: 'Worker experience does not match the improvement in meeting load.',
    workerReportedDirection: 'WORSENED',
    isPostInterventionFollowUp: true,
    interventionId: interventionB._id,
  });

  await caseService.setStatus({ tenantId, caseId: caseB._id, actor, status: 'DECISION_REQUIRED' });

  const completenessB = await completenessService.assessCompleteness({ tenantId, caseId: caseB._id });
  const packB = await evidencePackService.generateEvidencePack({ tenantId, caseId: caseB._id, actor });

  const reboundRows = await InterventionEvaluation.find({
    tenantId,
    interventionId: interventionB._id,
    reboundDetected: true,
  }).lean();

  console.log(`  ${caseB.caseNumber}: awaiting human decision`);
  console.log(
    `    improvement not sustained: ${
      reboundRows.map((r) => r.metric).join(', ') || 'none'
    }`
  );
  console.log(`    migration findings: ${migrationsB.length}`);
  for (const finding of migrationsB) console.log(`      · ${finding.summary}`);
  console.log(`    mixed evidence: ${completenessB.mixedEvidence.present ? completenessB.mixedEvidence.statement : 'none'}`);
  console.log(`    outstanding components: ${completenessB.outstanding.join(', ') || 'none'}`);
  if (emitDir) fs.writeFileSync(path.join(emitDir, packB.fileName), packB.buffer);
  console.log(`    evidence pack: ${packB.fileName} (${packB.buffer.length} bytes)`);

  // ══ CR journey C: external trigger with no work-pattern anomaly (§37) ═══════
  const caseC = await caseService.openCase({
    tenantId,
    actor,
    title: 'HSR concern about weekend on-call load in Data Operations',
    description:
      'HSR raised a concern about weekend on-call expectations. Opened for review regardless of whether SignalTrue observed a pattern.',
    triggerType: 'HSR_CONCERN',
    triggerReference: 'HSR minute 2026-07',
    triggerDate: new Date(NOW.getTime() - 10 * DAY_MS),
    teamIds: [dataOps.team._id],
    initialEvidenceSummary: 'HSR reported that two workers raised weekend contact expectations.',
  });
  console.log(`  ${caseC.caseNumber}: opened from an external trigger with no SignalTrue detection`);

  // ── Suppression check ──────────────────────────────────────────────────────
  const suppressed = await TeamWorkPatternMetric.countDocuments({
    tenantId,
    teamId: smallTeam.team._id,
    suppressed: true,
  });
  const unsuppressed = await TeamWorkPatternMetric.countDocuments({
    tenantId,
    teamId: smallTeam.team._id,
    suppressed: false,
  });
  console.log(`Security Guild (6 people, below minimum 8): ${suppressed} suppressed rows, ${unsuppressed} unsuppressed.`);

  const auditCount = await ControlReviewAuditEvent.countDocuments({ tenantId });
  console.log(`Audit events recorded: ${auditCount}`);

  console.log('\nSeed complete. Sign in as hs.manager@demo.signaltrue.com to view the H&S dashboard.');
  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error('Seed failed:', error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
