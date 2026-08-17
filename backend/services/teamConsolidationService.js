/**
 * Team consolidation.
 *
 * Directory syncs create a team per distinct department string, so the same
 * team arrives several times under punctuation or wording variants ("Müük ja
 * projektijuhid" and "Müük & projektijuhid", "it" and "IT osakond"). Each
 * variant holds a fraction of the people, and any team under the privacy floor
 * reports nothing — so a real team of fourteen can be silent because it is
 * stored as a nine and a five.
 *
 * Merging variants back together is the difference between reporting on most
 * of an organization and reporting on part of it. Only names that normalize
 * identically are merged; anything requiring judgement is reported for a human
 * to decide, never merged automatically.
 */
import Team from '../models/team.js';
import User from '../models/user.js';
import WorkEvent from '../models/workEvent.js';
import { normalizeDepartmentName } from './employeeSyncService.js';
import { isCatchAllTeam } from './weeklyBriefService.js';

/**
 * Reduce a team name to a comparison key. Builds on the department
 * normalization already used at sync time (which strips "osakond",
 * "department", "team" and similar), then removes the punctuation and
 * conjunction differences that make otherwise identical names distinct.
 */
export function teamNameKey(name) {
  const normalized = normalizeDepartmentName(name) || String(name || '');
  return normalized
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ja ')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Build a lookup that folds explicitly stated equivalents onto one key.
 *
 * Translations and renames ("Turundus" is Estonian for "Marketing") cannot be
 * inferred from the strings, so they are supplied deliberately rather than
 * guessed — merging teams on a hunch would silently reshape an organization.
 */
function buildAliasKeys(aliases = []) {
  const map = new Map();
  for (const [from, to] of aliases) {
    const fromKey = teamNameKey(from);
    const toKey = teamNameKey(to);
    if (fromKey && toKey) map.set(fromKey, toKey);
  }
  return map;
}

export async function planTeamConsolidation(orgId, options = {}) {
  const minTeamSize = options.minTeamSize ?? 5;
  const aliasKeys = buildAliasKeys(options.aliases);
  const teams = await Team.find({ orgId }).select('name createdAt').lean();

  const counts = new Map();
  for (const team of teams) {
    counts.set(String(team._id), await User.countDocuments({ orgId, teamId: team._id }));
  }

  // Group by comparison key, leaving catch-all buckets alone: they are not
  // teams and must never absorb people or be merged into one.
  const groups = new Map();
  for (const team of teams) {
    if (isCatchAllTeam(team.name)) continue;
    const rawKey = teamNameKey(team.name);
    if (!rawKey) continue;
    const key = aliasKeys.get(rawKey) || rawKey;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(team);
  }

  const merges = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    // Keep the variant with the most people; it is the one already in use.
    const sorted = [...group].sort(
      (a, b) =>
        counts.get(String(b._id)) - counts.get(String(a._id)) ||
        new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );
    const [keep, ...absorb] = sorted;
    const movedMembers = absorb.reduce((sum, t) => sum + counts.get(String(t._id)), 0);
    merges.push({
      keep: { id: keep._id, name: keep.name, members: counts.get(String(keep._id)) },
      absorb: absorb.map((t) => ({ id: t._id, name: t.name, members: counts.get(String(t._id)) })),
      membersAfter: counts.get(String(keep._id)) + movedMembers,
      movedMembers,
    });
  }

  const emptyTeams = teams.filter(
    (t) => counts.get(String(t._id)) === 0 && !isCatchAllTeam(t.name)
  );

  // Teams that stay below the floor after merging still report nothing. They
  // are surfaced rather than merged: combining unrelated teams to clear a
  // threshold would produce an aggregate that describes nobody.
  const mergedAway = new Set(merges.flatMap((m) => m.absorb.map((a) => String(a.id))));
  const sizeAfter = new Map(counts);
  for (const merge of merges) sizeAfter.set(String(merge.keep.id), merge.membersAfter);

  const stillBelowFloor = teams
    .filter(
      (t) =>
        !isCatchAllTeam(t.name) &&
        !mergedAway.has(String(t._id)) &&
        sizeAfter.get(String(t._id)) > 0 &&
        sizeAfter.get(String(t._id)) < minTeamSize
    )
    .map((t) => ({ name: t.name, members: sizeAfter.get(String(t._id)) }));

  const reportableBefore = teams.filter(
    (t) => !isCatchAllTeam(t.name) && counts.get(String(t._id)) >= minTeamSize
  ).length;
  const reportableAfter = teams.filter(
    (t) =>
      !isCatchAllTeam(t.name) &&
      !mergedAway.has(String(t._id)) &&
      sizeAfter.get(String(t._id)) >= minTeamSize
  ).length;

  const peopleInReportableBefore = teams
    .filter((t) => !isCatchAllTeam(t.name) && counts.get(String(t._id)) >= minTeamSize)
    .reduce((sum, t) => sum + counts.get(String(t._id)), 0);
  const peopleInReportableAfter = teams
    .filter(
      (t) =>
        !isCatchAllTeam(t.name) &&
        !mergedAway.has(String(t._id)) &&
        sizeAfter.get(String(t._id)) >= minTeamSize
    )
    .reduce((sum, t) => sum + sizeAfter.get(String(t._id)), 0);

  return {
    minTeamSize,
    merges,
    emptyTeams: emptyTeams.map((t) => ({ id: t._id, name: t.name })),
    stillBelowFloor,
    reportableTeams: { before: reportableBefore, after: reportableAfter },
    peopleInReportableTeams: { before: peopleInReportableBefore, after: peopleInReportableAfter },
  };
}

export async function applyTeamConsolidation(orgId, options = {}) {
  const plan = await planTeamConsolidation(orgId, options);
  let movedUsers = 0;
  let movedEvents = 0;

  for (const merge of plan.merges) {
    const absorbIds = merge.absorb.map((t) => t.id);
    const users = await User.updateMany(
      { orgId, teamId: { $in: absorbIds } },
      { $set: { teamId: merge.keep.id } }
    );
    const events = await WorkEvent.updateMany(
      { orgId, teamId: { $in: absorbIds } },
      { $set: { teamId: merge.keep.id } }
    );
    movedUsers += users.modifiedCount || 0;
    movedEvents += events.modifiedCount || 0;
    await Team.deleteMany({ _id: { $in: absorbIds }, orgId });
  }

  // Remove teams that hold nobody once merging is done.
  const removableEmpty = [];
  for (const team of plan.emptyTeams) {
    const remaining = await User.countDocuments({ orgId, teamId: team.id });
    if (remaining === 0) removableEmpty.push(team.id);
  }
  const removedEmpty = await Team.deleteMany({ _id: { $in: removableEmpty }, orgId });

  return {
    ...plan,
    applied: true,
    movedUsers,
    movedEvents,
    removedEmptyTeams: removedEmpty.deletedCount || 0,
  };
}
