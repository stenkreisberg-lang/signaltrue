import { AlertTriangle, TrendingUp, Clock, Activity } from 'lucide-react';

const DriftAlertCard = () => {
  return (
    <div className="relative bg-card-gradient rounded-2xl border border-border/50 p-6 shadow-card animate-float">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-warning animate-pulse-slow" />
            <span className="text-xs font-medium text-warning">Early workload risk signal</span>
          </div>
          <h3 className="text-xl font-display font-bold text-foreground">
            Team: Product &amp; Engineering
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Risk level: Rising • Team-level signals only
          </p>
        </div>
        <div className="p-2 rounded-lg bg-warning/10">
          <AlertTriangle className="w-5 h-5 text-warning" />
        </div>
      </div>

      {/* Signals detected */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <div className="p-2 rounded-lg bg-warning/10">
            <Activity className="w-4 h-4 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Meeting load increasing</p>
          </div>
          <span className="text-sm font-semibold text-warning">Rising</span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <div className="p-2 rounded-lg bg-warning/10">
            <Clock className="w-4 h-4 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Focus time decreasing</p>
          </div>
          <span className="text-sm font-semibold text-warning">-28%</span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <div className="p-2 rounded-lg bg-destructive/10">
            <TrendingUp className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">After-hours work rising</p>
          </div>
          <span className="text-sm font-semibold text-destructive">+35%</span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Activity className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Manager calendar overload</p>
          </div>
          <span className="text-sm font-semibold text-destructive">Critical</span>
        </div>
      </div>

      {/* Recommended action */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <p className="text-sm font-medium text-foreground mb-1">Recommended action</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Review recurring meetings, protect focus blocks, and check whether managers have become
          decision bottlenecks.
        </p>
      </div>
    </div>
  );
};

export default DriftAlertCard;
