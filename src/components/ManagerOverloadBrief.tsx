/**
 * ManagerOverloadBrief — the pivoted weekly brief (Sections A, B, C, F, H).
 *
 * Presentational component driven by useManagerOverloadBrief. Inline styles keep
 * it self-contained (no design-system coupling) so it renders identically to the
 * before/after mockup. See docs/PIVOT_REPORT_SPEC.md §4.
 */

import React from 'react';
import { useManagerOverloadBrief, RiskState } from '../hooks/useManagerOverload';

const STATE_COLOR: Record<RiskState, { bg: string; fg: string }> = {
  critical: { bg: '#FCEBEB', fg: '#501313' },
  strain: { bg: '#FAECE7', fg: '#4A1B0C' },
  watch: { bg: '#FAEEDA', fg: '#412402' },
  healthy: { bg: '#EAF3DE', fg: '#173404' },
  unknown: { bg: '#F1EFE8', fg: '#444441' },
};

function StateBadge({ state }: { state: RiskState }) {
  const c = STATE_COLOR[state] || STATE_COLOR.unknown;
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 500,
        background: c.bg,
        color: c.fg,
        padding: '2px 8px',
        borderRadius: 6,
      }}
    >
      {state}
    </span>
  );
}

export default function ManagerOverloadBrief({
  orgId,
  weekStart,
}: {
  orgId: string;
  weekStart?: string;
}) {
  const { brief, loading, error } = useManagerOverloadBrief(orgId, weekStart);

  if (loading)
    return <div style={{ padding: 16, color: '#5F5E5A' }}>Loading manager overload brief…</div>;
  if (error) return <div style={{ padding: 16, color: '#A32D2D' }}>{error}</div>;
  if (!brief) return null;

  const { headline, structurePanel, patterns, actions, discussionPrompts, dataReadiness } = brief;

  return (
    <div style={{ fontFamily: 'inherit', color: '#2C2C2A', maxWidth: 760 }}>
      {/* Section A — headline */}
      <div
        style={{
          border: '2px solid #185FA5',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.6 }}>{headline.sentence}</div>
        <div style={{ fontSize: 14, color: '#5F5E5A', marginTop: 6 }}>
          {headline.costExposureBand?.label}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StateBadge state={headline.status} />
          <span
            style={{
              fontSize: 12,
              background: '#F1EFE8',
              color: '#5F5E5A',
              padding: '2px 8px',
              borderRadius: 6,
            }}
          >
            confidence: {headline.confidence}
          </span>
          <span
            style={{
              fontSize: 12,
              background: '#F1EFE8',
              color: '#5F5E5A',
              padding: '2px 8px',
              borderRadius: 6,
            }}
          >
            {headline.source === 'ai' ? 'AI summary' : 'deterministic summary'}
          </span>
        </div>
      </div>

      {/* KPI tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Tile
          label="reports / manager"
          value={fmt(structurePanel.reportsPerManager)}
          sub={deltaStr(structurePanel.flatteningDelta)}
        />
        <Tile
          label="managers in strain"
          value={`${structurePanel.managersInStrain} / ${structurePanel.totalScoredManagers}`}
        />
        <Tile
          label="above healthy span"
          value={`${structurePanel.managersAboveThreshold}`}
          sub={`≥ ${structurePanel.healthySpanThreshold}`}
        />
      </div>

      {/* Section B — structure & span */}
      <Card title="Structure & span">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#5F5E5A', textAlign: 'left' }}>
              <th style={th}>manager (role)</th>
              <th style={th}>span</th>
              <th style={th}>Δ</th>
              <th style={th}>load</th>
              <th style={th}>SOI</th>
              <th style={{ ...th, textAlign: 'right' }}>state</th>
            </tr>
          </thead>
          <tbody>
            {structurePanel.managers.map((m, i) => (
              <tr key={i} style={{ borderTop: '0.5px solid rgba(0,0,0,0.12)' }}>
                <td style={td}>{m.role}</td>
                <td style={td}>{m.span}</td>
                <td style={td}>{m.spanDelta == null ? '—' : deltaStr(m.spanDelta)}</td>
                <td style={td}>
                  {m.coordinationLoadHours == null ? '—' : `${m.coordinationLoadHours}h`}
                </td>
                <td style={{ ...td, fontWeight: 500 }}>{m.spanOverloadIndex}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <StateBadge state={m.riskState} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {structurePanel.managers.length === 0 && (
          <div style={{ fontSize: 13, color: '#5F5E5A' }}>
            No managers cleared the privacy threshold this week.
          </div>
        )}
      </Card>

      {/* Section C — communication patterns */}
      {patterns.length > 0 && (
        <Card title="Communication patterns & bottlenecks">
          {patterns.map((p, i) => (
            <div
              key={i}
              style={{
                borderLeft: '3px solid #534AB7',
                padding: '2px 0 2px 12px',
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500 }}>{p.title}</div>
              <div style={{ fontSize: 13, color: '#444441' }}>{p.plainEnglish}</div>
              {p.hypothesis && (
                <div style={{ fontSize: 12, color: '#5F5E5A' }}>Likely cause: {p.hypothesis}</div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Section F — structural actions */}
      {actions.length > 0 && (
        <Card title="Recommended structural actions">
          {actions.map((a, i) => (
            <div
              key={i}
              style={{
                borderLeft: '3px solid #185FA5',
                padding: '2px 0 2px 12px',
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 14 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: '#5F5E5A' }}>
                intended: {a.intendedMovement} · {a.reversible ? 'reversible' : 'not reversible'} ·
                effort {a.effort}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Section H — discussion prompts */}
      {discussionPrompts?.length > 0 && (
        <Card title="Manager discussion prompts">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#444441' }}>
            {discussionPrompts.map((q, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {q}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Section I — data readiness footer (demoted) */}
      <div style={{ fontSize: 12, color: '#888780', marginTop: 8 }}>
        {dataReadiness.scoredManagers} managers scored · {dataReadiness.suppressedManagers}{' '}
        suppressed · {dataReadiness.graphNodes} graph nodes. {dataReadiness.note}
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: '#F7F6F2', borderRadius: 8, padding: '12px 16px' }}>
      <div style={{ fontSize: 13, color: '#5F5E5A' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500 }}>
        {value} {sub && <span style={{ fontSize: 13, color: '#5F5E5A' }}>{sub}</span>}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '0.5px solid rgba(0,0,0,0.12)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

const th: React.CSSProperties = { fontWeight: 400, padding: '4px 6px 4px 0' };
const td: React.CSSProperties = { padding: '7px 6px 7px 0' };

function fmt(v: number | null): string {
  return v == null ? '—' : String(v);
}
function deltaStr(v: number | null): string {
  if (v == null) return '—';
  if (v > 0) return `↑ ${v}`;
  if (v < 0) return `↓ ${Math.abs(v)}`;
  return '0';
}
