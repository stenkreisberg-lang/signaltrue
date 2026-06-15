/**
 * Communication Graph (ONA) Service.
 *
 * Builds a weekly interaction graph from WorkEvent metadata and computes
 * deterministic network metrics (degree, Brandes betweenness, reciprocity,
 * articulation points) plus role-aware bottleneck rollups and named
 * communication patterns.
 *
 * Detection is fully deterministic and auditable — AI is layered on top
 * separately (see aiInsightService). Identity never leaves this module as a raw
 * id: the graph is built on raw userIds server-side (to join OrgUnit), but the
 * returned structures are keyed by managerHash / role only.
 *
 * See docs/PIVOT_REPORT_SPEC.md §5.
 */

import WorkEvent from '../models/workEvent.js';
import OrgUnit from '../models/orgUnit.js';
import { hashPerson } from '../utils/identity.js';
import { MIN_METRIC_CONTRIBUTORS } from '../utils/privacyGate.js';

// Skip meetings larger than this for co-attendance edges (all-hands create
// spurious hub structure). Tunable.
const MAX_MEETING_SIZE = 12;
// Pattern thresholds (percentiles / ratios) — TUNE on real data.
const BETWEENNESS_PCTL = 90;
const INDEGREE_PCTL = 75;
const LOW_CROSSTEAM_RATIO = 0.1;
const LOW_RECIPROCITY = 0.3;
const HIGH_AFTERHOURS_RATIO = 0.35;
const ROLE_BROKERAGE_FLAG = 0.5;

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * @param {string|ObjectId} orgId
 * @param {string} weekStartStr — Monday YYYY-MM-DD
 * @returns {Object} graph result (see file header)
 */
export async function buildCommunicationGraph(orgId, weekStartStr) {
  const start = new Date(`${weekStartStr}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [events, units] = await Promise.all([
    WorkEvent.find({ orgId, timestamp: { $gte: start, $lt: end } })
      .select('eventType actorUserId targetUserId metadata.meetingIdHash metadata.durationMinutes metadata.replyLatencySeconds metadata.isAfterHours metadata.meetingType')
      .lean(),
    OrgUnit.find({ orgId, effectiveTo: null }).select('userId teamId role isManager').lean(),
  ]);

  const unitByUser = new Map();
  for (const u of units) if (u.userId) unitByUser.set(String(u.userId), u);

  // ── Build edges ────────────────────────────────────────────────────────────
  const undirected = new Map(); // "a|b" (a<b) -> weight
  const directed = new Map(); // "a->b" -> count
  const nodes = new Set();
  let afterHoursEvents = 0;
  let totalEventsForRatio = 0;

  const meetingGroups = new Map(); // meetingIdHash -> Set(userId)

  for (const e of events) {
    const a = e.actorUserId ? String(e.actorUserId) : null;
    if (e.metadata?.isAfterHours) afterHoursEvents++;
    totalEventsForRatio++;

    if (e.eventType === 'meeting') {
      const mid = e.metadata?.meetingIdHash;
      if (mid && a) {
        if (!meetingGroups.has(mid)) meetingGroups.set(mid, { users: new Set(), dur: e.metadata?.durationMinutes || 0 });
        meetingGroups.get(mid).users.add(a);
      }
      if (a) nodes.add(a);
      continue;
    }

    // Directed interaction (message/email/task) when both ends are known
    const b = e.targetUserId ? String(e.targetUserId) : null;
    if (a && b && a !== b) {
      nodes.add(a);
      nodes.add(b);
      directed.set(`${a}->${b}`, (directed.get(`${a}->${b}`) || 0) + 1);
      addUndirected(undirected, a, b, 1);
    } else if (a) {
      nodes.add(a);
    }
  }

  // Meeting co-attendance → pairwise undirected edges (skip all-hands)
  for (const { users, dur } of meetingGroups.values()) {
    const arr = [...users];
    if (arr.length < 2 || arr.length > MAX_MEETING_SIZE) continue;
    const w = Math.max(1, Math.round(dur || 30));
    for (let i = 0; i < arr.length; i++) {
      nodes.add(arr[i]);
      for (let j = i + 1; j < arr.length; j++) addUndirected(undirected, arr[i], arr[j], w);
    }
  }

  const nodeList = [...nodes];
  const adj = buildAdjacency(nodeList, undirected);

  // ── Metrics ──────────────────────────────────────────────────────────────────
  const betweenness = brandesBetweenness(nodeList, adj);
  const maxBetween = Math.max(1, ...Object.values(betweenness));
  const degree = computeDegree(nodeList, adj);
  const { inDeg, outDeg, reciprocity } = computeDirected(nodeList, directed);
  const articulation = articulationPoints(nodeList, adj);
  const crossTeam = computeCrossTeamRatio(nodeList, adj, unitByUser);

  const betweennessVals = nodeList.map((n) => betweenness[n] || 0);
  const inDegVals = nodeList.map((n) => inDeg[n] || 0);
  const betweenThreshold = percentileVal(betweennessVals, BETWEENNESS_PCTL);
  const inDegThreshold = percentileVal(inDegVals, INDEGREE_PCTL);

  // ── Per-manager outputs (keyed by managerHash) ───────────────────────────────
  const brokerageByManager = {};
  const decisionConcentrationByManager = {};
  const teamBetweennessTotal = new Map();
  for (const n of nodeList) {
    const u = unitByUser.get(n);
    if (!u?.teamId) continue;
    const t = String(u.teamId);
    teamBetweennessTotal.set(t, (teamBetweennessTotal.get(t) || 0) + (betweenness[n] || 0));
  }
  for (const n of nodeList) {
    const u = unitByUser.get(n);
    if (!u?.isManager) continue;
    const mh = u.personHash || hashPerson(orgId, u.userId);
    brokerageByManager[mh] = round2((betweenness[n] || 0) / maxBetween);
    const teamTotal = u.teamId ? teamBetweennessTotal.get(String(u.teamId)) || 0 : 0;
    decisionConcentrationByManager[mh] = teamTotal > 0 ? round2((betweenness[n] || 0) / teamTotal) : null;
  }

  // ── Role brokerage rollup ────────────────────────────────────────────────────
  const totalBetween = betweennessVals.reduce((s, v) => s + v, 0) || 1;
  const roleBetween = {};
  for (const n of nodeList) {
    const role = unitByUser.get(n)?.role || 'unknown';
    roleBetween[role] = (roleBetween[role] || 0) + (betweenness[n] || 0);
  }
  const roleBrokerage = {};
  for (const [role, b] of Object.entries(roleBetween)) roleBrokerage[role] = round2(b / totalBetween);

  // ── Pattern detection (role-labeled, suppression-gated) ──────────────────────
  const teamSizes = countTeamSizes(nodeList, unitByUser);
  const patterns = [];

  for (const n of nodeList) {
    const u = unitByUser.get(n);
    const teamOk = u?.teamId && (teamSizes.get(String(u.teamId)) || 0) >= MIN_METRIC_CONTRIBUTORS;
    if (!teamOk) continue; // never single out a node in a tiny team
    const role = u.role || 'unknown';

    if ((betweenness[n] || 0) >= betweenThreshold && (inDeg[n] || 0) >= inDegThreshold && betweenThreshold > 0) {
      patterns.push({
        patternType: 'coordination_bottleneck',
        title: 'Coordination bottleneck',
        plainEnglish: `A ${role} role is routing a disproportionate share of coordination — work flows through one point.`,
        evidence: [
          `betweenness in top ${100 - BETWEENNESS_PCTL}%`,
          `inbound demand in top ${100 - INDEGREE_PCTL}%`,
        ],
        severity: 'high',
        scope: { role },
      });
    }
    if (articulation.has(n) && (degree[n] || 0) >= percentileVal(nodeList.map((x) => degree[x] || 0), 75)) {
      patterns.push({
        patternType: 'key_person_dependency',
        title: 'Key-person dependency',
        plainEnglish: `Removing one ${role} role would disconnect part of the team — a single point of failure.`,
        evidence: ['articulation point', 'high weighted degree'],
        severity: 'high',
        scope: { role },
      });
    }
  }

  // Org-level patterns
  const meanCrossTeam = mean(Object.values(crossTeam));
  if (nodeList.length >= MIN_METRIC_CONTRIBUTORS && meanCrossTeam < LOW_CROSSTEAM_RATIO) {
    patterns.push({
      patternType: 'siloing',
      title: 'Siloing',
      plainEnglish: 'Cross-team interaction is low — teams are operating in isolation.',
      evidence: [`mean cross-team ratio ${round2(meanCrossTeam)}`],
      severity: 'medium',
      scope: { org: true },
    });
  }
  const meanRecip = mean(Object.values(reciprocity));
  if (nodeList.length >= MIN_METRIC_CONTRIBUTORS && meanRecip > 0 && meanRecip < LOW_RECIPROCITY) {
    patterns.push({
      patternType: 'reciprocity_collapse',
      title: 'Reciprocity collapse',
      plainEnglish: 'Communication is increasingly one-directional — a possible voice/withdrawal signal.',
      evidence: [`mean reciprocity ${round2(meanRecip)}`],
      severity: 'medium',
      scope: { org: true },
    });
  }
  const afterHoursRatio = totalEventsForRatio ? afterHoursEvents / totalEventsForRatio : 0;
  if (afterHoursRatio >= HIGH_AFTERHOURS_RATIO) {
    patterns.push({
      patternType: 'after_hours_cascade',
      title: 'After-hours cascade',
      plainEnglish: 'A high share of interaction happens outside working hours — boundary drift at the structural level.',
      evidence: [`after-hours interaction ratio ${round2(afterHoursRatio)}`],
      severity: 'medium',
      scope: { org: true },
    });
  }

  // Manager isolation: flagged roles where the role layer absorbs most brokerage
  for (const [role, frac] of Object.entries(roleBrokerage)) {
    if (frac >= ROLE_BROKERAGE_FLAG) {
      patterns.push({
        patternType: 'role_brokerage_concentration',
        title: 'Brokerage concentrated in one layer',
        plainEnglish: `The ${role} layer absorbs ${Math.round(frac * 100)}% of cross-team brokerage.`,
        evidence: [`role brokerage ${Math.round(frac * 100)}%`],
        severity: 'medium',
        scope: { role },
      });
    }
  }

  return {
    orgId: String(orgId),
    weekStart: weekStartStr,
    nodeCount: nodeList.length,
    edgeCount: undirected.size,
    afterHoursRatio: round2(afterHoursRatio),
    brokerageByManager,
    decisionConcentrationByManager,
    roleBrokerage,
    patterns,
  };
}

// ── Graph helpers ──────────────────────────────────────────────────────────────

function addUndirected(map, a, b, w) {
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  map.set(key, (map.get(key) || 0) + w);
}

function buildAdjacency(nodeList, undirected) {
  const adj = new Map();
  for (const n of nodeList) adj.set(n, new Map());
  for (const [key, w] of undirected.entries()) {
    const [a, b] = key.split('|');
    adj.get(a)?.set(b, w);
    adj.get(b)?.set(a, w);
  }
  return adj;
}

function computeDegree(nodeList, adj) {
  const deg = {};
  for (const n of nodeList) {
    let s = 0;
    for (const w of adj.get(n)?.values() || []) s += w;
    deg[n] = s;
  }
  return deg;
}

function computeDirected(nodeList, directed) {
  const inDeg = {};
  const outDeg = {};
  for (const n of nodeList) {
    inDeg[n] = 0;
    outDeg[n] = 0;
  }
  for (const [key, c] of directed.entries()) {
    const [a, b] = key.split('->');
    if (outDeg[a] != null) outDeg[a] += c;
    if (inDeg[b] != null) inDeg[b] += c;
  }
  // reciprocity per node: fraction of out-edges that are reciprocated
  const reciprocity = {};
  const outNeighbors = new Map();
  for (const key of directed.keys()) {
    const [a, b] = key.split('->');
    if (!outNeighbors.has(a)) outNeighbors.set(a, new Set());
    outNeighbors.get(a).add(b);
  }
  for (const n of nodeList) {
    const outs = outNeighbors.get(n);
    if (!outs || outs.size === 0) {
      reciprocity[n] = 0;
      continue;
    }
    let recip = 0;
    for (const b of outs) if (directed.has(`${b}->${n}`)) recip++;
    reciprocity[n] = recip / outs.size;
  }
  return { inDeg, outDeg, reciprocity };
}

/** Brandes betweenness for weighted undirected graphs (Dijkstra variant). */
function brandesBetweenness(nodeList, adj) {
  const CB = {};
  for (const n of nodeList) CB[n] = 0;

  for (const s of nodeList) {
    const S = [];
    const P = new Map();
    const sigma = new Map();
    const dist = new Map();
    for (const t of nodeList) {
      P.set(t, []);
      sigma.set(t, 0);
      dist.set(t, Infinity);
    }
    sigma.set(s, 1);
    dist.set(s, 0);

    // Simple priority queue via array (org-scale graphs are small)
    const pq = [[0, s]];
    while (pq.length) {
      pq.sort((a, b) => a[0] - b[0]);
      const [d, v] = pq.shift();
      if (d > dist.get(v)) continue;
      S.push(v);
      for (const [w, weight] of adj.get(v) || []) {
        const cost = 1 / Math.max(weight, 1e-9); // stronger ties = shorter paths
        const nd = dist.get(v) + cost;
        if (nd < dist.get(w)) {
          dist.set(w, nd);
          pq.push([nd, w]);
          sigma.set(w, sigma.get(v));
          P.set(w, [v]);
        } else if (Math.abs(nd - dist.get(w)) < 1e-12) {
          sigma.set(w, sigma.get(w) + sigma.get(v));
          P.get(w).push(v);
        }
      }
    }

    const delta = new Map();
    for (const t of nodeList) delta.set(t, 0);
    while (S.length) {
      const w = S.pop();
      for (const v of P.get(w)) {
        const c = (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w));
        delta.set(v, delta.get(v) + c);
      }
      if (w !== s) CB[w] += delta.get(w);
    }
  }
  // Undirected: each pair counted twice
  for (const n of nodeList) CB[n] /= 2;
  return CB;
}

function articulationPoints(nodeList, adj) {
  const visited = new Set();
  const disc = new Map();
  const low = new Map();
  const parent = new Map();
  const ap = new Set();
  let timer = 0;

  const dfs = (u) => {
    // iterative DFS to avoid stack overflow on large graphs
    const stack = [[u, false, null]];
    while (stack.length) {
      const [node, processed, par] = stack[stack.length - 1];
      if (!processed) {
        visited.add(node);
        disc.set(node, timer);
        low.set(node, timer);
        timer++;
        parent.set(node, par);
        stack[stack.length - 1][1] = true;
        for (const w of adj.get(node)?.keys() || []) {
          if (!visited.has(w)) stack.push([w, false, node]);
          else if (w !== par) low.set(node, Math.min(low.get(node), disc.get(w)));
        }
      } else {
        stack.pop();
        const p = parent.get(node);
        if (p != null) {
          low.set(p, Math.min(low.get(p), low.get(node)));
          if (parent.get(p) != null && low.get(node) >= disc.get(p)) ap.add(p);
        }
      }
    }
    // root articulation: >1 child in DFS tree
    let rootChildren = 0;
    for (const w of adj.get(u)?.keys() || []) if (parent.get(w) === u) rootChildren++;
    if (rootChildren > 1) ap.add(u);
  };

  for (const n of nodeList) if (!visited.has(n)) dfs(n);
  return ap;
}

function computeCrossTeamRatio(nodeList, adj, unitByUser) {
  const ratio = {};
  for (const n of nodeList) {
    const myTeam = unitByUser.get(n)?.teamId ? String(unitByUser.get(n).teamId) : null;
    const neighbors = [...(adj.get(n)?.keys() || [])];
    if (neighbors.length === 0) {
      ratio[n] = 0;
      continue;
    }
    let cross = 0;
    for (const w of neighbors) {
      const t = unitByUser.get(w)?.teamId ? String(unitByUser.get(w).teamId) : null;
      if (myTeam && t && t !== myTeam) cross++;
    }
    ratio[n] = cross / neighbors.length;
  }
  return ratio;
}

function countTeamSizes(nodeList, unitByUser) {
  const sizes = new Map();
  for (const n of nodeList) {
    const t = unitByUser.get(n)?.teamId ? String(unitByUser.get(n).teamId) : null;
    if (t) sizes.set(t, (sizes.get(t) || 0) + 1);
  }
  return sizes;
}

function percentileVal(values, p) {
  const arr = (values || []).filter((v) => typeof v === 'number').sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  const idx = Math.min(arr.length - 1, Math.max(0, Math.round((p / 100) * (arr.length - 1))));
  return arr[idx];
}

function mean(arr) {
  const a = (arr || []).filter((v) => typeof v === 'number');
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}

function round2(v) {
  return typeof v === 'number' ? Math.round(v * 100) / 100 : v;
}

// Pure graph algorithms exposed for unit testing (no DB dependency).
export const __pure = {
  buildAdjacency,
  brandesBetweenness,
  articulationPoints,
  computeDegree,
  computeDirected,
  percentileVal,
};

export default { buildCommunicationGraph };
