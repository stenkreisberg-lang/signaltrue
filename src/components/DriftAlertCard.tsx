import { AlertTriangle, TrendingUp, Clock, Activity } from "lucide-react";

/*
 * CATEGORY REPOSITIONING NOTE:
 * SignalTrue is a Work Signal Intelligence platform.
 * Avoid "health", "wellbeing", "engagement" as primary terms.
 * Prefer "signals", "drift", "strain", "execution friction", "recovery".
 * Emphasis on patterns over scores. Clear "aggregated, non-individual" label.
 */

const DriftAlertCard = () => {
  return (
    <div className="relative bg-card-gradient rounded-2xl border border-border/50 p-6 shadow-card animate-float">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-warning animate-pulse-slow" />
            <span className="text-xs font-medium text-warning">Drift Signal</span>
          </div>
          <h3 className="text-xl font-display font-bold text-foreground">
            Team "Product-Alpha" Signal
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Detected: Dec 20, 2025 • Aggregated team pattern
          </p>
        </div>
        <div className="p-2 rounded-lg bg-warning/10">
          <AlertTriangle className="w-5 h-5 text-warning" />
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <div className="p-2 rounded-lg bg-warning/10">
            <Activity className="w-4 h-4 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Coordination Strain</p>
            <p className="text-xs text-muted-foreground">Pattern indicates rising coordination overhead</p>
          </div>
          <span className="text-sm font-semibold text-warning">Drifting</span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <div className="p-2 rounded-lg bg-warning/10">
            <Clock className="w-4 h-4 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Recovery Erosion</p>
            <p className="text-xs text-muted-foreground">After-hours activity extending vs baseline</p>
          </div>
          <span className="text-sm font-semibold text-warning">+35%</span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <div className="p-2 rounded-lg bg-destructive/10">
            <TrendingUp className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Meeting Overload</p>
            <p className="text-xs text-muted-foreground">Calendar density exceeds sustainable threshold</p>
          </div>
          <span className="text-sm font-semibold text-destructive">Critical</span>
        </div>
      </div>

      {/* Insight box */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <p className="text-sm font-medium text-foreground mb-1">Signal Interpretation</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This team shows coordination strain and recovery erosion. These patterns 
          often precede execution breakdown. Consider intervention before drift accelerates.
        </p>
      </div>
    </div>
  );
};

export default DriftAlertCard;
