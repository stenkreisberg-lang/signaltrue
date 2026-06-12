/**
 * Idempotent Nobel Digital data-readiness repair.
 *
 * Applies the accepted one-person threshold, synchronizes Microsoft directory
 * departments, remaps historical events, and rebuilds the derived analytics
 * collections. Output is aggregate-only.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import Team from '../models/team.js';
import WorkEvent from '../models/workEvent.js';
import EngagementTeamDaily from '../models/engagementTeamDaily.js';
import EngagementBaseline from '../models/engagementBaseline.js';
import EngagementStrainWeekly from '../models/engagementStrainWeekly.js';
import { MicrosoftAdapter } from '../services/coreIntegrationAdapters.js';
import {
  remapWorkEventTeams,
  syncEmployeesFromMicrosoft,
} from '../services/employeeSyncService.js';
import { computeDailyMetrics } from '../services/integrationMetricsService.js';
import { computeAndSaveTeamDay } from '../services/engagementDailyAggregationService.js';
import { computeAndSaveBaseline } from '../services/engagementBaselineService.js';
import { runWeeklyEngagementStrainJob } from '../services/engagementWeeklyJobService.js';
import { detectSignals } from '../services/signalGenerationService.js';
import { bridgeSignalsForOrg } from '../services/signalBridgeService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const BACKFILL_DAYS = 60;

function mondayOf(date) {
  const result = new Date(date);
  const day = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() - day + (day === 0 ? -6 : 1));
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI);

  const org = await Organization.findOne({ domain: /nobeldigital/i });
  if (!org) throw new Error('Nobel Digital organization not found');
  const orgId = org._id;
  const skipMicrosoftSync = process.argv.includes('--skip-microsoft');

  const unassignedTeam = await Team.findOne({ orgId, name: 'Unassigned' }).select('_id');
  const before = {
    users: await User.countDocuments({ orgId }),
    teams: await Team.countDocuments({ orgId }),
    unassignedUsers: unassignedTeam
      ? await User.countDocuments({ orgId, teamId: unassignedTeam._id })
      : 0,
    engagementDays: await EngagementTeamDaily.countDocuments({ orgId }),
    baselines: await EngagementBaseline.countDocuments({ orgId }),
    weeklyScores: await EngagementStrainWeekly.countDocuments({ orgId }),
  };

  await Organization.findByIdAndUpdate(orgId, { $set: { 'settings.minTeamSize': 1 } });
  await Team.updateMany({ orgId }, { $set: { isActive: true, analyticsEnabled: true } });

  const until = new Date();
  const since = new Date(until.getTime() - BACKFILL_DAYS * DAY_MS);
  let directoryResult = { success: true, skipped: true, stats: {} };
  let microsoftResult = { success: true, skipped: true };
  if (!skipMicrosoftSync) {
    const microsoft = new MicrosoftAdapter();
    const accessToken = await microsoft.getAccessToken(orgId);
    directoryResult = await syncEmployeesFromMicrosoft(orgId, accessToken);
    microsoftResult = await microsoft.sync(orgId, since, until);
  }
  const eventRemap = await remapWorkEventTeams(orgId);

  const eventDays = await WorkEvent.aggregate([
    {
      $match: {
        orgId,
        timestamp: { $gte: since, $lt: until },
        actorUserId: { $ne: null },
        teamId: { $ne: null },
      },
    },
    {
      $project: {
        teamId: 1,
        day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: 'UTC' } },
      },
    },
    { $group: { _id: { teamId: '$teamId', day: '$day' } } },
    { $sort: { '_id.day': 1 } },
  ]);

  const uniqueDays = [...new Set(eventDays.map((row) => row._id.day))];
  for (const day of uniqueDays) {
    await computeDailyMetrics(orgId, new Date(`${day}T00:00:00.000Z`));
  }

  let engagementDaysComputed = 0;
  for (const row of eventDays) {
    const result = await computeAndSaveTeamDay(
      orgId,
      row._id.teamId,
      new Date(`${row._id.day}T00:00:00.000Z`)
    );
    if (result) engagementDaysComputed++;
  }

  const scoredTeamIds = await EngagementTeamDaily.distinct('teamId', { orgId });
  const currentWeek = mondayOf(until);
  const firstWeek = mondayOf(since);
  const existingWeeklyScores = await EngagementStrainWeekly.find({ orgId })
    .select('_id teamId weekStart')
    .lean();
  let unsupportedWeeklyScoresRemoved = 0;
  for (const score of existingWeeklyScores) {
    const baselineEnd = new Date(`${score.weekStart}T00:00:00.000Z`);
    baselineEnd.setUTCDate(baselineEnd.getUTCDate() - 1);
    const baselineStart = new Date(baselineEnd);
    baselineStart.setUTCDate(baselineStart.getUTCDate() - 41);
    const activeDays = await EngagementTeamDaily.countDocuments({
      orgId,
      teamId: score.teamId,
      date: {
        $gte: baselineStart.toISOString().split('T')[0],
        $lte: baselineEnd.toISOString().split('T')[0],
      },
      activePeopleCount: { $gte: 1 },
    });
    if (activeDays < 20) {
      await EngagementStrainWeekly.deleteOne({ _id: score._id });
      unsupportedWeeklyScoresRemoved++;
    }
  }
  let weeklyRuns = 0;
  for (let week = firstWeek; week < currentWeek; week = new Date(week.getTime() + 7 * DAY_MS)) {
    await runWeeklyEngagementStrainJob(orgId, week);
    weeklyRuns++;
  }

  // Historical scoring updates the shared baseline document as of each week.
  // Restore every baseline to the current as-of date before reporting completion.
  let validBaselines = 0;
  for (const teamId of scoredTeamIds) {
    const baseline = await computeAndSaveBaseline(orgId, teamId, until);
    if (baseline?.isValid) validBaselines++;
  }

  const generatedSignals = await detectSignals(orgId);
  const bridgedSignals = await bridgeSignalsForOrg(orgId);

  const teams = await Team.find({ orgId }).select('_id').lean();
  const teamMembership = await User.aggregate([
    { $match: { orgId } },
    { $group: { _id: '$teamId', count: { $sum: 1 } } },
  ]);
  const afterUnassigned = unassignedTeam
    ? await User.countDocuments({ orgId, teamId: unassignedTeam._id })
    : 0;

  const after = {
    users: await User.countDocuments({ orgId }),
    teams: teams.length,
    populatedTeams: teamMembership.filter((row) => row._id && row.count > 0).length,
    unassignedUsers: afterUnassigned,
    engagementDays: await EngagementTeamDaily.countDocuments({ orgId }),
    baselines: await EngagementBaseline.countDocuments({ orgId }),
    validBaselines,
    weeklyScores: await EngagementStrainWeekly.countDocuments({ orgId }),
  };

  console.log(
    JSON.stringify(
      {
        organizationConfiguredMinimum: 1,
        backfillDays: BACKFILL_DAYS,
        before,
        directory: {
          success: directoryResult.success,
          created: directoryResult.stats?.created || 0,
          updated: directoryResult.stats?.updated || 0,
          skipped: directoryResult.stats?.skipped || 0,
          errors: directoryResult.stats?.errors?.length || 0,
          skipped: directoryResult.skipped || false,
        },
        microsoft: {
          success: microsoftResult.success,
          eventsProcessed: microsoftResult.eventsProcessed || 0,
          eventsCreated: microsoftResult.eventsCreated || 0,
          eventsUpdated: microsoftResult.eventsUpdated || 0,
          error: microsoftResult.error || null,
          skipped: microsoftResult.skipped || false,
        },
        eventRemap,
        derived: {
          metricDaysComputed: uniqueDays.length,
          engagementDaysComputed,
          weeklyRuns,
          unsupportedWeeklyScoresRemoved,
          generatedSignals: generatedSignals.length,
          bridgedSignals,
        },
        after,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('[NobelDataReadinessFix] Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
