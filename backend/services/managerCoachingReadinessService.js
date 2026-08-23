import EngagementTeamDaily from '../models/engagementTeamDaily.js';
import ManagerWeekly from '../models/managerWeekly.js';
import OrgUnit from '../models/orgUnit.js';
import WorkEvent from '../models/workEvent.js';
import { MIN_HEALTH_SAFETY_TEAM_SIZE, resolveMinimumTeamSize } from '../utils/privacyGate.js';
import { hashPerson } from '../utils/identity.js';

export const MANAGER_COACHING_VERSION = '2.1.0';

export async function getManagerCoachingReadiness({ orgId, userId }) {
  if (process.env.MANAGER_COACHING_V2_ENABLED === 'false') {
    return unavailable('feature_disabled');
  }

  const manager = await OrgUnit.findOne({
    orgId,
    userId,
    isManager: true,
    effectiveTo: null,
  }).lean();
  if (!manager) return unavailable('manager_relationship_missing');

  const directReports = await OrgUnit.find({
    orgId,
    managerUserId: manager.userId,
    effectiveTo: null,
  })
    .select('userId')
    .lean();
  const minimumRequired = Math.max(
    MIN_HEALTH_SAFETY_TEAM_SIZE,
    await resolveMinimumTeamSize(orgId)
  );

  const managerHash = manager.personHash || hashPerson(orgId, manager.userId);
  const latestWeek = await ManagerWeekly.findOne({
    orgId,
    managerHash,
    dataQualityVersion: '2.0.0',
  })
    .sort({ weekStart: -1 })
    .lean();
  const activeReports = latestWeek?.span ?? 0;
  const privacyPassed = activeReports >= minimumRequired && latestWeek?.suppressed !== true;

  const managerWeeks = latestWeek
    ? await ManagerWeekly.find({
        orgId,
        managerHash: latestWeek.managerHash,
        suppressed: { $ne: true },
        dataQualityVersion: '2.0.0',
        weekStart: { $lt: latestWeek.weekStart },
      })
        .sort({ weekStart: -1 })
        .limit(6)
        .lean()
    : [];

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 42);
  const sinceDate = since.toISOString().slice(0, 10);
  const teamDays = manager.teamId
    ? await EngagementTeamDaily.find({
        orgId,
        teamId: manager.teamId,
        date: { $gte: sinceDate },
      })
        .sort({ date: -1 })
        .lean()
    : [];
  const calendarDays = teamDays.filter((day) => day.integrationCoverage?.hasCalendar).length;
  const collaborationDays = teamDays.filter(
    (day) => day.integrationCoverage?.hasMessaging || day.integrationCoverage?.hasEmail
  ).length;
  const sourceSince = latestWeek ? new Date(`${latestWeek.weekStart}T00:00:00.000Z`) : since;
  const sources = await WorkEvent.distinct('source', {
    orgId,
    actorUserId: manager.userId,
    timestamp: { $gte: sourceSince },
  });

  const reportingAvailable = directReports.length > 0 && Boolean(manager.userId);
  const calendarCoverage = teamDays.length ? calendarDays / teamDays.length : 0;
  const collaborationCoverage = teamDays.length ? collaborationDays / teamDays.length : 0;
  const baselineWeeks = managerWeeks.length;
  const managerMetricsAvailable = Boolean(latestWeek && latestWeek.suppressed !== true);
  const ready =
    reportingAvailable &&
    privacyPassed &&
    managerMetricsAvailable &&
    calendarCoverage >= 0.4 &&
    baselineWeeks >= 3;

  let status = 'ready';
  let reason = null;
  if (!privacyPassed) {
    status = 'suppressed';
    reason = 'manager_span_below_privacy_minimum';
  } else if (!ready) {
    status = 'insufficient_data';
    reason = !reportingAvailable
      ? 'reporting_structure_missing'
      : !managerMetricsAvailable
        ? 'manager_weekly_unavailable'
        : calendarCoverage < 0.4
          ? 'calendar_coverage_low'
          : 'baseline_insufficient';
  }

  return {
    status,
    reason,
    ready,
    manager: { ...manager, managerHash },
    latestWeek,
    managerWeeks,
    teamDays,
    sources,
    requirements: {
      reportingStructure: {
        available: reportingAvailable,
        source: manager.source || null,
        directReports: directReports.length,
      },
      calendar: {
        available: calendarDays > 0,
        coverage: round2(calendarCoverage),
        coveredDays: calendarDays,
      },
      collaboration: {
        available: collaborationDays > 0,
        coverage: round2(collaborationCoverage),
        coveredDays: collaborationDays,
        required: false,
      },
      baseline: {
        available: baselineWeeks >= 3,
        weeks: baselineWeeks,
        preferredWeeks: 6,
      },
      privacy: {
        passed: privacyPassed,
        activeReports,
        minimumRequired,
      },
    },
    confidence:
      ready && baselineWeeks >= 6 && calendarCoverage >= 0.7 ? 'high' : ready ? 'medium' : 'low',
    coachingVersion: MANAGER_COACHING_VERSION,
  };
}

function unavailable(reason) {
  return {
    status: 'insufficient_data',
    reason,
    ready: false,
    manager: null,
    latestWeek: null,
    managerWeeks: [],
    teamDays: [],
    sources: [],
    requirements: {},
    confidence: 'low',
    coachingVersion: MANAGER_COACHING_VERSION,
  };
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

export function publicReadiness(readiness) {
  return {
    status: readiness.status,
    reason: readiness.reason,
    ready: readiness.ready,
    confidence: readiness.confidence,
    requirements: readiness.requirements,
    coachingVersion: readiness.coachingVersion,
  };
}

export default { getManagerCoachingReadiness, publicReadiness, MANAGER_COACHING_VERSION };
