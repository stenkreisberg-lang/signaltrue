/**
 * Privacy Gate Middleware
 *
 * Enforces the minimum-team-size rule before any analytics endpoint returns data.
 * If a team's actualSize is below the org-configured minimum (default: 5),
 * the request is suppressed and a 204 is returned with a structured body.
 *
 * Usage:
 *   import { privacyGate } from '../middleware/privacyGate.js';
 *   router.get('/:teamId', privacyGate, handler);
 *
 * The teamId must be present in req.params.teamId OR req.query.teamId.
 * For org-level routes that return multiple teams, use privacyGateOrg instead.
 */

import Team from '../models/team.js';
import Organization from '../models/organizationModel.js';
import TeamSizeGate from '../models/teamSizeGate.js';

const DEFAULT_MIN_SIZE = 5;

/**
 * Resolve the effective minimum team size for an org.
 * Falls back to DEFAULT_MIN_SIZE if org config is absent.
 */
async function resolveMinSize(orgId) {
  if (!orgId) return DEFAULT_MIN_SIZE;
  try {
    const org = await Organization.findById(orgId)
      .select('minTeamSizeForAnalytics')
      .lean();
    return org?.minTeamSizeForAnalytics ?? DEFAULT_MIN_SIZE;
  } catch {
    return DEFAULT_MIN_SIZE;
  }
}

/**
 * Single-team privacy gate.
 * Reads teamId from req.params.teamId or req.query.teamId.
 */
export async function privacyGate(req, res, next) {
  const teamId = req.params.teamId || req.query.teamId;

  if (!teamId) {
    // No team context — let the route handler decide
    return next();
  }

  try {
    const team = await Team.findById(teamId)
      .select('metadata.actualSize orgId analyticsEnabled')
      .lean();

    if (!team) {
      return res.status(404).json({ error: true, message: 'Team not found', code: 'TEAM_NOT_FOUND' });
    }

    const minSize = await resolveMinSize(team.orgId);
    const actualSize = team.metadata?.actualSize ?? 0;

    if (actualSize < minSize) {
      // Log the suppression event (fire-and-forget)
      TeamSizeGate.create({
        teamId,
        orgId: team.orgId,
        endpoint: `${req.method} ${req.originalUrl}`,
        reportedSize: actualSize,
        minRequired: minSize,
      }).catch(() => {});

      // Ensure analyticsEnabled flag is accurate
      Team.findByIdAndUpdate(teamId, {
        analyticsEnabled: false,
        privacyGateFiredAt: new Date(),
      }).catch(() => {});

      return res.status(204).json({
        suppressed: true,
        reason: 'insufficient_sample',
        minRequired: minSize,
        message: `Analytics require a minimum team size of ${minSize}. This team has ${actualSize} member(s).`,
      });
    }

    // Team passes — attach for downstream use
    req.team = team;
    req.privacyMinSize = minSize;
    return next();
  } catch (err) {
    console.error('[privacyGate] Error:', err.message);
    return next(); // Fail open — let route handle it, do not block on gate error
  }
}

/**
 * Org-level privacy gate.
 * Does NOT block the request — instead attaches a `suppressedTeamIds` Set to req
 * so route handlers can filter out suppressed teams from org-level responses.
 *
 * Usage:
 *   router.get('/:orgId/summary', privacyGateOrg, handler);
 *   // In handler: filter teams using req.suppressedTeamIds.has(teamId.toString())
 */
export async function privacyGateOrg(req, res, next) {
  const orgId = req.params.orgId || req.query.orgId;
  req.suppressedTeamIds = new Set();

  if (!orgId) return next();

  try {
    const [teams, minSize] = await Promise.all([
      Team.find({ orgId }).select('_id metadata.actualSize').lean(),
      resolveMinSize(orgId),
    ]);

    for (const team of teams) {
      const actualSize = team.metadata?.actualSize ?? 0;
      if (actualSize < minSize) {
        req.suppressedTeamIds.add(team._id.toString());
      }
    }

    req.privacyMinSize = minSize;
    return next();
  } catch (err) {
    console.error('[privacyGateOrg] Error:', err.message);
    return next();
  }
}

/**
 * Convenience helper for service-layer callers (not Express middleware).
 * Returns { passed: boolean, reason?, actualSize, minRequired }.
 */
export async function checkPrivacyGate(teamId) {
  try {
    const team = await Team.findById(teamId)
      .select('metadata.actualSize orgId')
      .lean();

    if (!team) return { passed: false, reason: 'team_not_found', actualSize: 0, minRequired: DEFAULT_MIN_SIZE };

    const minSize = await resolveMinSize(team.orgId);
    const actualSize = team.metadata?.actualSize ?? 0;

    if (actualSize < minSize) {
      TeamSizeGate.create({
        teamId,
        orgId: team.orgId,
        endpoint: 'service_layer',
        reportedSize: actualSize,
        minRequired: minSize,
      }).catch(() => {});

      return { passed: false, reason: 'insufficient_sample', actualSize, minRequired: minSize };
    }

    return { passed: true, actualSize, minRequired: minSize };
  } catch (err) {
    console.error('[checkPrivacyGate] Error:', err.message);
    return { passed: true, actualSize: 0, minRequired: DEFAULT_MIN_SIZE }; // Fail open
  }
}
