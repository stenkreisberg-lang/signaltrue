/**
 * useEngagementStrain hooks
 *
 * Data-fetching hooks for the Engagement Strain Risk system.
 * All calls go through the shared axios instance (auto-injects auth token).
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const API_BASE = '/engagement-strain';

// ── Types ───────────────────────────────────────────────────────────────────────

export interface Subscores {
  recoveryDebt: number;
  focusErosion: number;
  coordinationFriction: number;
  responsivenessPressure: number;
  collaborationWithdrawal: number;
  managerSupportGap: number;
  workloadVolatility: number;
}

export interface TopDriver {
  driver: string;
  score: number;
  changeVsBaseline: number;
  explanation: string;
}

export interface Pattern {
  patternType: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  evidence: string[];
  interpretation: string;
}

export interface RecommendedAction {
  actionId: string;
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium';
  category: string;
  trigger: string;
}

export interface Alert {
  alertType: string;
  title: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  context: Record<string, unknown>;
  createdAt: string;
}

export interface TeamStrainSummary {
  teamId: string;
  teamName: string | null;
  weekStart: string;
  engagementStrainRisk: number;
  engagementConditionsScore: number;
  riskState: 'healthy' | 'watch' | 'strain' | 'critical';
  trend: 'rising' | 'stable' | 'improving';
  confidenceScore: number;
  confidenceLabel: 'low' | 'moderate' | 'high';
  activePeopleCount: number;
  topDrivers: TopDriver[];
}

export interface TeamStrainDetail extends TeamStrainSummary {
  subscores: Subscores;
  patterns: Pattern[];
  recommendedActions: RecommendedAction[];
  alerts: Alert[];
}

export interface HistoryWeek {
  weekStart: string;
  engagementStrainRisk: number;
  engagementConditionsScore: number;
  riskState: 'healthy' | 'watch' | 'strain' | 'critical';
  trend: 'rising' | 'stable' | 'improving';
  confidenceScore: number;
  confidenceLabel: 'low' | 'moderate' | 'high';
  subscores: Subscores;
  activePeopleCount: number;
}

// ── Hook: org-level summary ─────────────────────────────────────────────────────

export function useEngagementStrainSummary(orgId: string | null) {
  const [teams, setTeams] = useState<TeamStrainSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ orgId: string; teams: TeamStrainSummary[] }>(
        `${API_BASE}/summary/${orgId}`
      );
      setTeams(res.data.teams ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load engagement strain summary';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { teams, loading, error, refetch: fetch };
}

// ── Hook: single team detail ────────────────────────────────────────────────────

export function useEngagementStrainTeamDetail(teamId: string | null) {
  const [detail, setDetail] = useState<TeamStrainDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<TeamStrainDetail>(`${API_BASE}/team/${teamId}`);
      setDetail(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load team engagement strain data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { detail, loading, error, refetch: fetch };
}

// ── Hook: team history (up to 26 weeks) ────────────────────────────────────────

export function useEngagementStrainHistory(teamId: string | null, weeks = 12) {
  const [history, setHistory] = useState<HistoryWeek[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ teamId: string; weeks: HistoryWeek[] }>(
        `${API_BASE}/team/${teamId}/history`,
        { params: { weeks } }
      );
      setHistory(res.data.weeks ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load engagement strain history';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [teamId, weeks]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { history, loading, error, refetch: fetch };
}

// ── Hook: drivers + optional LLM explanation ───────────────────────────────────

export function useEngagementStrainDrivers(teamId: string | null, withExplanation = false) {
  const [data, setData] = useState<{
    topDrivers: TopDriver[];
    patterns: Pattern[];
    explanation: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`${API_BASE}/team/${teamId}/drivers`, {
        params: withExplanation ? { explain: 'true' } : {},
      });
      setData(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load drivers';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [teamId, withExplanation]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
