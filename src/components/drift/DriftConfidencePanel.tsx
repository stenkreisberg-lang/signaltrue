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
  title = 'Confidence & coverage',
  headline,
  items,
}: DriftConfidencePanelProps) {
  return (
    <details className="rounded-2xl bg-secondary/10 border border-border/30 group">
      <summary className="px-6 py-4 cursor-pointer select-none list-none flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-muted-foreground">{title}</span>
          {headline && (
            <span className="hidden md:inline text-xs text-muted-foreground/70">— {headline}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground/60 group-open:hidden">Show details ▸</span>
        <span className="text-xs text-muted-foreground/60 hidden group-open:inline">Hide ▾</span>
      </summary>
      <div className="px-6 pb-6">
        {headline && <p className="text-sm text-muted-foreground mb-4 md:hidden">{headline}</p>}
        <div className="grid md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-xl bg-background/40 border border-border/50"
            >
              <div className="text-sm text-muted-foreground mb-1">{item.label}</div>
              <div className="font-semibold mb-2">{item.value}</div>
              <div className="text-sm text-muted-foreground">{item.note}</div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
