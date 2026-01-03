import React from 'react';
import { AlertTriangle, TrendingUp, Clock, MessageSquare } from "lucide-react";

const DriftAlertCard = () => {
  return (
    <div className="relative bg-card-gradient rounded-2xl border border-border/50 p-6 shadow-card animate-float">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-warning animate-pulse-slow" />
            <span className="text-xs font-medium text-warning">Early Warning</span>
          </div>
          <h3 className="text-xl font-display font-bold text-foreground">
            Team "Product-Alpha" Alert
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Detected: Dec 20, 2025 • Confidence: High
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
            <MessageSquare className="w-4 h-4 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Communication Fragmentation</p>
            <p className="text-xs text-muted-foreground">Message patterns indicate coordination stress</p>
          </div>
          <span className="text-sm font-semibold text-warning">Rising</span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <div className="p-2 rounded-lg bg-warning/10">
            <Clock className="w-4 h-4 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">After-Hours Load</p>
            <p className="text-xs text-muted-foreground">Working hours extending beyond baseline</p>
          </div>
          <span className="text-sm font-semibold text-warning">+35%</span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <div className="p-2 rounded-lg bg-destructive/10">
            <TrendingUp className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Meeting Overload</p>
            <p className="text-xs text-muted-foreground">Calendar density exceeds healthy threshold</p>
          </div>
          <span className="text-sm font-semibold text-destructive">Critical</span>
        </div>
      </div>

      {/* Insight box */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <p className="text-sm font-medium text-foreground mb-1">What HR Should Know</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This team is showing classic pre-burnout patterns. Consider scheduling 1:1s
          and reviewing workload distribution before performance declines.
        </p>
      </div>
    </div>
  );
};

export default DriftAlertCard;
