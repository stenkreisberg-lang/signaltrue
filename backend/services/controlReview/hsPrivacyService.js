/**
 * Minimum group size enforcement (spec §22.1).
 *
 * Default MIN_GROUP_SIZE = 8, recommended deployment target 10. This is a
 * product privacy and trust control, not a claim about legal sufficiency.
 *
 * The gate has to hold at every boundary — metrics, drilldowns, exports and the
 * Evidence Pack — so everything that leaves this module goes through
 * `applyGroupSizeGate` rather than each caller re-deriving the rule.
 */

import Team from '../../models/team.js';
import OrgUnit from '../../models/orgUnit.js';
import HsDeploymentConfig from '../../models/controlReview/deploymentConfig.js';
import { MIN_GROUP_SIZE_DEFAULT } from '../../models/controlReview/constants.js';

export const SUPPRESSION_MESSAGE =
  'Suppressed: group smaller than the configured minimum for reporting.';

export async function resolveMinGroupSize(tenantId) {
  if (!tenantId) return MIN_GROUP_SIZE_DEFAULT;
  try {
    const config = await HsDeploymentConfig.findOne({ tenantId }).select('minGroupSize').lean();
    const configured = Number(config?.minGroupSize);
    // A customer may raise the floor, never lower it.
    return Number.isFinite(configured)
      ? Math.max(configured, MIN_GROUP_SIZE_DEFAULT)
      : MIN_GROUP_SIZE_DEFAULT;
  } catch {
    return MIN_GROUP_SIZE_DEFAULT;
  }
}

/**
 * Decide whether a group may be reported on, and where to aggregate to if not.
 *
 * @returns {{ allowed: boolean, minGroupSize: number, groupSize: number,
 *             reason: string, aggregateToTeamId: string|null }}
 */
export async function checkGroup({ tenantId, teamId, groupSize = null }) {
  const minGroupSize = await resolveMinGroupSize(tenantId);

  let size = groupSize;

  if (size === null || size === undefined) {
    const team = await Team.findById(teamId).select('metadata.actualSize').lean();
    size = team?.metadata?.actualSize ?? 0;
  }

  const parentTeamId = size >= minGroupSize ? null : await resolveParentTeamId({ tenantId, teamId });

  if (size >= minGroupSize) {
    return { allowed: true, minGroupSize, groupSize: size, reason: '', aggregateToTeamId: null };
  }

  return {
    allowed: false,
    minGroupSize,
    groupSize: size,
    reason: SUPPRESSION_MESSAGE,
    aggregateToTeamId: parentTeamId ? String(parentTeamId) : null,
  };
}

/**
 * The group a suppressed team rolls up into (spec §22.1: "aggregate to parent
 * group"). Team carries no parent pointer, so the reporting line in OrgUnit
 * supplies it: the parent group is the team the members' manager sits in.
 */
export async function resolveParentTeamId({ tenantId, teamId }) {
  if (!teamId) return null;
  try {
    const members = await OrgUnit.find({ orgId: tenantId, teamId, effectiveTo: null })
      .select('managerUserId')
      .lean();

    const managerIds = [...new Set(members.map((m) => m.managerUserId).filter(Boolean).map(String))];
    if (managerIds.length === 0) return null;

    const managerUnits = await OrgUnit.find({
      orgId: tenantId,
      userId: { $in: managerIds },
      effectiveTo: null,
    })
      .select('teamId')
      .lean();

    const parent = managerUnits.map((u) => u.teamId).find((t) => t && String(t) !== String(teamId));
    return parent ? String(parent) : null;
  } catch {
    return null;
  }
}

/**
 * Strip values from anything leaving the module when the group is too small.
 * Keeps the shape so the UI can render "suppressed" rather than crash on nulls.
 */
export function suppressPayload(payload, { minGroupSize, groupSize, aggregateToTeamId = null }) {
  return {
    ...payload,
    value: null,
    components: {},
    contributorCount: null,
    groupSize: null,
    suppressed: true,
    suppressionReason: SUPPRESSION_MESSAGE,
    minGroupSize,
    // The size itself is withheld: publishing "7 of 8" is its own disclosure.
    belowMinimum: groupSize < minGroupSize,
    aggregateToTeamId,
  };
}

/**
 * Filter a list of metric-bearing rows through the gate.
 * Rows already marked suppressed at calculation time stay suppressed.
 */
export function filterSuppressed(rows = []) {
  return rows.filter((row) => !row.suppressed);
}

export default {
  SUPPRESSION_MESSAGE,
  resolveMinGroupSize,
  checkGroup,
  resolveParentTeamId,
  suppressPayload,
  filterSuppressed,
};
