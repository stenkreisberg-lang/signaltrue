/**
 * useManagerOverload hooks
 *
 * Data-fetching hooks for the manager-overload / span pivot. Mirrors
 * useEngagementStrain conventions (shared axios instance, 403 = privacy gate).
 * See docs/PIVOT_REPORT_SPEC.md §4.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const API_BASE = '/manager-overload';

// ── Types ───────────────────────────────────────────────────────────────────────

export type RiskState = 'healthy' | 'watch' | 'strain' | 'critical' | 'unknown';

export interface ManagerRow {
  role: string;
  span: number;
  spanDelta: number | null;
  coordinationLoadHours: number | null;
  oneOnOneMinutesPerReport: number | null;
  spanOverloadIndex: number;
  riskState: RiskState;
  trend: 'improving' | 'stable' | 'worsening' | 'accelerating';
  confidence: 'high' | 'medium' | 'low';
}

export interface Flattening {
  reportsPerManager: number | null;
  baselineReportsPerManager: number | null;
  flatteningDelta: number | null;
  managersAboveThreshold: number;
  healthySpanThreshold: number;
  managersInStrain: number;
  totalScoredManagers: number;
  orgSpanOverloadIndex: number | null;
}

export interface CostBand {
  low: number;
  high: number;
  estCostLow?: number;
  estCostHigh?: number;
  label: string;
}

export interface CommPattern {
  patternType: string;
  title: string;
  plainEnglish: string;
  hypothesis?: string;
  recommendedAction?: string;
  evidence: string[];
  severity: 'low' | 'medium' | 'high';
  scope: Record<string, unknown>;
  source?: 'ai' | 'fallback';
}

export interface StructuralAction {
  title: string;
  intendedMovement: string;
  reversible: boolean;
  effort: 'low' | 'medium';
  basis: string;
}

export interface ManagerOverloadBrief {
  orgId: string;
  weekStart: string;
  scoringVersion: string;
  headline: {
    sentence: string;
    source: 'ai' | 'fallback';
    costExposureBand: CostBand;
    status: RiskState;
    confidence: 'high' | 'medium' | 'low';
  };
  structurePanel: Flattening & {
    managers: ManagerRow[];
    roleBrokerage: Record<string, number>;
  };
  patterns: CommPattern[];
  actions: StructuralAction[];
  discussionPrompts: string[];
  dataReadiness: {
    scoredManagers: number;
    suppressedManagers: number;
    graphNodes: number;
    note: string;
  };
  whyItMatters: string;
}

// ── Hook: org summary (flattening + managers) ────────────────────────────────────

export function useManagerOverloadSummary(orgId: string | null, weekStart?: string) {
  const [data, setData] = useState<{ flattening: Flattening; managers: ManagerRow[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`${API_BASE}/summary/${orgId}`, {
        params: weekStart ? { weekStart } : {},
      });
      setData({ flattening: res.data.flattening, managers: res.data.managers ?? [] });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(
        status === 403
          ? 'Manager overload is unavailable until reporting structure and coverage meet privacy thresholds.'
          : 'Manager overload data is temporarily unavailable.'
      );
    } finally {
      setLoading(false);
    }
  }, [orgId, weekStart]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ── Hook: full assembled brief ───────────────────────────────────────────────────

export function useManagerOverloadBrief(orgId: string | null, weekStart?: string) {
  const [brief, setBrief] = useState<ManagerOverloadBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ManagerOverloadBrief>(`${API_BASE}/brief/${orgId}`, {
        params: weekStart ? { weekStart } : {},
      });
      setBrief(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load manager overload brief';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [orgId, weekStart]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { brief, loading, error, refetch: fetch };
}
