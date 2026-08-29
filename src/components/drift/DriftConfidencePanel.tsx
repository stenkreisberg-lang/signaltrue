import React from 'react';

interface ConfidencePanelItem {
  label: string;
  value: string;
  note: string;
}

interface DriftConfidencePanelProps {
  title?: string;
  headline?: string;
  items: ConfidencePanelItem[];
}

export default function DriftConfidencePanel({
  title = 'Rule-based evidence & coverage',
  headline,
  items,
}: DriftConfidencePanelProps) {
  return (
    <details className="rounded-container bg-white border border-slate-200 group">
      <summary className="px-6 py-4 cursor-pointer select-none list-none flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-caption font-semibold text-muted-foreground">{title}</span>
          {headline && (
            <span className="hidden md:inline text-caption text-muted-foreground/70">
              — {headline}
            </span>
          )}
        </div>
        <span className="text-caption text-muted-foreground/60 group-open:hidden">
          Show details ▸
        </span>
        <span className="text-caption text-muted-foreground/60 hidden group-open:inline">
          Hide ▾
        </span>
      </summary>
      <div className="px-6 pb-6">
        {headline && (
          <p className="text-caption text-muted-foreground mb-4 md:hidden">{headline}</p>
        )}
        <div className="grid md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-container bg-slate-50 border border-slate-100"
            >
              <div className="text-caption text-muted-foreground mb-1">{item.label}</div>
              <div className="font-semibold mb-2">{item.value}</div>
              <div className="text-caption text-muted-foreground">{item.note}</div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
