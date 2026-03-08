import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface TrendPoint {
  label: string;
  score: number;
}

interface DriftFamilyCardProps {
  familyName: string;
  score: number;
  description: string;
  trend: TrendPoint[];
  confidenceLabel?: string;
  actionPrompt?: string;
  topSignalTitle?: string;
  gapLabel?: string;
}

/* ── severity mapping ─────────────────────────────── */
function scoreSeverity(score: number) {
  if (score >= 70)
    return {
      label: 'Critical',
      ring: 'border-red-500',
      text: 'text-red-400',
      bg: 'bg-red-500/15',
      bar: 'bg-red-500',
      hex: '#ef4444',
    };
  if (score >= 50)
    return {
      label: 'Elevated',
      ring: 'border-orange-400',
      text: 'text-orange-400',
      bg: 'bg-orange-400/15',
      bar: 'bg-orange-400',
      hex: '#fb923c',
    };
  if (score >= 30)
    return {
      label: 'Moderate',
      ring: 'border-amber-300',
      text: 'text-amber-300',
      bg: 'bg-amber-300/15',
      bar: 'bg-amber-400',
      hex: '#fbbf24',
    };
  return {
    label: 'Low',
    ring: 'border-emerald-400',
    text: 'text-emerald-400',
    bg: 'bg-emerald-400/15',
    bar: 'bg-emerald-500',
    hex: '#34d399',
  };
}

/* ── sparkline with start / end labels ────────────── */
function Sparkline({ trend, hex }: { trend: TrendPoint[]; hex: string }) {
  const values = trend.map((p) => p.score);
  if (values.length < 2) return null;
  const width = 120;
  const height = 30;
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width;
      const y = height - ((v - min) / Math.max(max - min, 1)) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground w-5 text-right">{values[0]}</span>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
        <polyline
          fill="none"
          stroke={hex}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pts}
        />
      </svg>
      <span className="text-[11px] font-semibold w-5">{values[values.length - 1]}</span>
    </div>
  );
}

/* ── card ──────────────────────────────────────────── */
export default function DriftFamilyCard({
  familyName,
  score,
  description,
  trend,
  confidenceLabel,
  actionPrompt,
  topSignalTitle,
  gapLabel,
}: DriftFamilyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const sev = scoreSeverity(score);
  const first = trend[0]?.score ?? score;
  const last = trend[trend.length - 1]?.score ?? score;
  const delta = last - first;
  const absDelta = Math.abs(delta);
  const direction = delta > 3 ? '↑ Rising' : delta < -3 ? '↓ Easing' : '→ Stable';
  const deltaLabel = absDelta > 0 ? `${delta > 0 ? '+' : ''}${delta} pts` : '';

  const handleClick = (e: React.MouseEvent) => {
    if (expanded) {
      setExpanded(false);
    } else {
      setExpanded(true);
    }
  };

  const handleViewSignals = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/app/signals?family=${encodeURIComponent(familyName)}`);
  };

  return (
    <div
      className={`relative p-5 rounded-2xl border-2 ${sev.ring} ${sev.bg} cursor-pointer transition-all hover:shadow-lg`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
    >
      {/* row 1: name + severity pill */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{familyName}</h3>
        <span className={`text-[11px] font-bold uppercase tracking-wider ${sev.text}`}>
          {sev.label}
        </span>
      </div>

      {/* row 2: big score + scale bar */}
      <div className="flex items-end gap-3 mb-3">
        <span className={`text-4xl font-extrabold leading-none ${sev.text}`}>{score}</span>
        <div className="flex-1 pb-1.5">
          <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
            <div
              className={`h-full rounded-full ${sev.bar} transition-all`}
              style={{ width: `${Math.min(score, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[9px] text-muted-foreground">0</span>
            <span className="text-[9px] text-muted-foreground">100</span>
          </div>
        </div>
      </div>

      {/* row 3: trend sparkline + direction + week-over-week delta */}
      <div className="flex items-center justify-between mb-2">
        <Sparkline trend={trend} hex={sev.hex} />
        <div className="flex flex-col items-end ml-2">
          <span className={`text-xs font-medium ${sev.text} whitespace-nowrap`}>{direction}</span>
          {deltaLabel && (
            <span
              className={`text-[11px] font-semibold whitespace-nowrap ${delta > 0 ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {deltaLabel}
            </span>
          )}
        </div>
      </div>

      {/* row 4: one-line description */}
      <p className="text-xs text-muted-foreground leading-snug">{description}</p>

      {/* gap badge (always visible when present) */}
      {gapLabel && (
        <div className="mt-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-[11px] text-indigo-200">
          {gapLabel}
        </div>
      )}

      {/* expandable details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/40 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {topSignalTitle && (
            <div className="text-xs">
              <span className="font-medium">Top pattern:</span> {topSignalTitle}
            </div>
          )}
          {actionPrompt && (
            <div className="text-xs rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-100">
              <span className="font-semibold">Recommended:</span> {actionPrompt}
            </div>
          )}
          {confidenceLabel && (
            <div className="text-[11px] text-muted-foreground">{confidenceLabel} confidence</div>
          )}
          <button
            onClick={handleViewSignals}
            className={`w-full mt-1 text-xs font-medium py-1.5 rounded-lg border border-current/20 ${sev.text} hover:bg-white/10 transition-colors`}
          >
            View {familyName} signals →
          </button>
        </div>
      )}

      {/* expand hint */}
      <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/60">
        {expanded ? 'click to collapse' : 'click for details'}
      </div>
    </div>
  );
}
