import React, { useState } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Mail,
  ArrowRight,
  Info,
  BarChart3,
  Clock,
  Users,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { AssessmentResult, AssessmentInputs, RiskLevel } from './types';
import { formatCurrency, formatCostRange } from './costCalculator';

interface AssessmentResultsProps {
  result: AssessmentResult;
  inputs: AssessmentInputs;
  onSubmitEmail: (email: string, consent: boolean) => Promise<void>;
  onReset: () => void;
  onTrackEvent?: (event: string, data?: Record<string, unknown>) => void;
}

const RISK_STYLES: Record<RiskLevel, { bg: string; text: string; icon: React.ElementType; label: string }> = {
  low: {
    bg: 'bg-success/10',
    text: 'text-success',
    icon: CheckCircle,
    label: 'Low Risk',
  },
  emerging: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    icon: TrendingUp,
    label: 'Emerging Risk',
  },
  high: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    icon: AlertTriangle,
    label: 'High Risk',
  },
};

export const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  result,
  inputs,
  onSubmitEmail,
  onReset,
  onTrackEvent,
}) => {
  const [showFullBreakdown, setShowFullBreakdown] = useState(false);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const riskStyle = RISK_STYLES[result.riskScore.level];
  const RiskIcon = riskStyle.icon;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !consent) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmitEmail(email, consent);
      setEmailSubmitted(true);
      setShowFullBreakdown(true);
      onTrackEvent?.('email_submitted', { riskLevel: result.riskScore.level });
      onTrackEvent?.('cost_viewed', { 
        costRange: formatCostRange(result.costBreakdown.totalCostLow, result.costBreakdown.totalCostHigh),
        riskLevel: result.riskScore.level,
      });
    } catch (err) {
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Step 1: Immediate Summary (Always visible) */}
      <div className="bg-card rounded-2xl border border-border/50 p-8">
        {/* Risk Level Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-full ${riskStyle.bg}`}>
            <RiskIcon className={`w-5 h-5 ${riskStyle.text}`} />
            <span className={`font-semibold ${riskStyle.text}`}>{riskStyle.label}</span>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Workload Risk Index</p>
            <p className="text-2xl font-display font-bold text-foreground">{result.riskScore.total}/100</p>
          </div>
        </div>

        {/* Cost Headline */}
        <div className="text-center py-6 border-y border-border/50 mb-6">
          <h3 className="text-xl font-display font-semibold text-foreground mb-2">
            Your collaboration patterns may be costing more than expected
          </h3>
          <p className="text-muted-foreground mb-2">Estimated annual cost exposure (range)</p>
          <p className="text-3xl sm:text-4xl font-display font-bold text-foreground">
            {formatCostRange(result.costBreakdown.totalCostLow, result.costBreakdown.totalCostHigh)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">per year</p>
        </div>

        {/* Top 3 Insights */}
        <div className="space-y-3 mb-6">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Key Insights
          </h4>
          <ul className="space-y-2">
            {result.insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                  {index + 1}
                </span>
                {insight}
              </li>
            ))}
          </ul>
        </div>

        {/* Risk Factor Breakdown (mini) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-secondary/30">
          <div className="text-center">
            <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Meeting Load</p>
            <p className="font-semibold text-foreground">{result.riskScore.factors.meetingLoad}/25</p>
          </div>
          <div className="text-center">
            <RefreshCw className="w-5 h-5 text-accent mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Fragmentation</p>
            <p className="font-semibold text-foreground">{result.riskScore.factors.fragmentation}/25</p>
          </div>
          <div className="text-center">
            <TrendingUp className="w-5 h-5 text-warning mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">After-Hours</p>
            <p className="font-semibold text-foreground">{result.riskScore.factors.afterHoursWork}/25</p>
          </div>
          <div className="text-center">
            <BarChart3 className="w-5 h-5 text-destructive mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Focus Loss</p>
            <p className="font-semibold text-foreground">{result.riskScore.factors.focusTimeLoss}/25</p>
          </div>
        </div>
      </div>

      {/* Step 2: Email Gate */}
      {!showFullBreakdown && (
        <div className="bg-card rounded-2xl border border-primary/30 p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-display font-bold text-foreground mb-2">
              Get full report by email
            </h3>
            <p className="text-muted-foreground">
              Enter your work email to receive a detailed breakdown with cost calculations, assumptions, and how SignalTrue replaces estimates with real signals.
            </p>
          </div>

          <form onSubmit={handleEmailSubmit} className="max-w-md mx-auto space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Work email to receive your full report
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@company.com"
                required
                className="w-full"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary rounded"
                required
              />
              <span className="text-sm text-muted-foreground">
                I agree to receive my results and occasional updates from SignalTrue. 
                You can unsubscribe anytime.
              </span>
            </label>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={isSubmitting || !email.trim() || !consent}
            >
              {isSubmitting ? 'Sending...' : 'Send my report'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}

      {/* Full Breakdown (After Email) */}
      {showFullBreakdown && (
        <>
          <div className="bg-card rounded-2xl border border-border/50 p-8">
            <h3 className="text-xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Detailed Cost Breakdown
            </h3>

            <div className="space-y-6">
              {/* Meeting Costs */}
              <div className="p-4 rounded-xl bg-secondary/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">Annual Meeting Cost</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(result.costBreakdown.annualMeetingCost)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {inputs.workload.meetingHoursPerWeek}h/week × {inputs.company.teamSize} people × €{result.costBreakdown.loadedHourlyRate.toFixed(2)}/hr × 52 weeks
                </p>
              </div>

              {/* Meeting Waste */}
              <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">Estimated Meeting Waste</span>
                  <span className="font-semibold text-warning">
                    {formatCurrency(result.costBreakdown.meetingWasteCost)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {(result.assumptions.meetingWastePercent * 100).toFixed(0)}% of meeting time assumed unproductive
                </p>
              </div>

              {/* Turnover Exposure */}
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">Turnover Exposure (Range)</span>
                  <span className="font-semibold text-destructive">
                    {formatCostRange(result.costBreakdown.turnoverExposureLow, result.costBreakdown.turnoverExposureHigh)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {inputs.retention.attritionPercent}% attrition × {inputs.company.teamSize} people × €{inputs.company.averageSalary.toLocaleString()} × {(result.assumptions.replacementMultiplier * 100).toFixed(0)}% replacement cost
                </p>
              </div>

              {/* Total */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">Total Collaboration Drag (Annual)</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCostRange(result.costBreakdown.totalCostLow, result.costBreakdown.totalCostHigh)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Meeting waste + Turnover exposure
                </p>
              </div>
            </div>
          </div>

          {/* Transparency Block */}
          <div className="bg-secondary/20 rounded-2xl border border-border/50 p-6">
            <div className="flex items-start gap-3 mb-4">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">Assumptions Used</h4>
                <p className="text-sm text-muted-foreground">
                  These estimates are based on your inputs and commonly used HR cost models.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-background">
                <p className="text-muted-foreground">Salary Assumption</p>
                <p className="font-medium text-foreground">€{result.assumptions.salary.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-muted-foreground">Overhead Multiplier</p>
                <p className="font-medium text-foreground">{result.assumptions.overheadMultiplier}x</p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-muted-foreground">Meeting Waste %</p>
                <p className="font-medium text-foreground">{(result.assumptions.meetingWastePercent * 100).toFixed(0)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-muted-foreground">Attrition %</p>
                <p className="font-medium text-foreground">{result.assumptions.attritionPercent}%</p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-muted-foreground">Replacement Multiplier</p>
                <p className="font-medium text-foreground">{(result.assumptions.replacementMultiplier * 100).toFixed(0)}%</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <strong>SignalTrue replaces these assumptions with real workload signals</strong> once connected to your collaboration tools.
            </p>
          </div>

          {/* CTA Section */}
          <div className="bg-hero-gradient rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-glow opacity-20" />
            <div className="relative">
              <h3 className="text-2xl font-display font-bold text-foreground mb-4">
                See how SignalTrue replaces estimates with real signals
              </h3>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Connect your tools and get team-level insights based on actual collaboration patterns, not assumptions.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  variant="hero"
                  size="xl"
                  onClick={() => onTrackEvent?.('cta_clicked', { type: 'demo' })}
                  asChild
                >
                  <a href="/register">
                    Get a Demo
                    <ArrowRight className="w-5 h-5" />
                  </a>
                </Button>
                <Button
                  variant="hero-outline"
                  size="lg"
                  onClick={onReset}
                >
                  <RefreshCw className="w-4 h-4" />
                  Recalculate
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Start Over Button (if not showing full breakdown) */}
      {!showFullBreakdown && (
        <div className="text-center">
          <button
            onClick={onReset}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Start over with different inputs
          </button>
        </div>
      )}
    </div>
  );
};

export default AssessmentResults;
