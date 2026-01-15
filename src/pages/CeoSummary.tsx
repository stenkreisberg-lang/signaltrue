import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  X,
  Shield,
  Calendar,
  Clock,
  Building2
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

interface CeoSummaryData {
  organizationName: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  observations: {
    meetingLoadChange: {
      direction: 'increased' | 'decreased' | 'stable';
      percentChange: number;
      summary: string;
    };
    afterHoursWork: {
      direction: 'increased' | 'decreased' | 'stable';
      percentChange: number;
      summary: string;
    };
    coordinationPressure: {
      direction: 'increased' | 'decreased' | 'stable';
      areasAffected: string[];
      summary: string;
    };
    additionalObservations?: string[];
  };
  significance: {
    summary: string;
    riskFactors: Array<{
      type: 'delivery' | 'attrition' | 'coordination' | 'burnout';
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  };
  riskDirection: {
    overall: 'improving' | 'stable' | 'worsening';
    trendConfidence: 'low' | 'medium' | 'high';
    explanation: string;
  };
  privacyStatement: {
    teamLevelOnly: boolean;
    minTeamSize: number;
    noContentAccess: boolean;
    noIndividualMonitoring: boolean;
    notASurvey: boolean;
    notSentimentAnalysis: boolean;
  };
  footer: string;
}

const DIRECTION_ICONS = {
  improving: TrendingDown,
  stable: Minus,
  worsening: TrendingUp,
  increased: TrendingUp,
  decreased: TrendingDown,
};

const DIRECTION_COLORS = {
  improving: 'bg-success/10 text-success border-success/30',
  stable: 'bg-muted/50 text-muted-foreground border-muted-foreground/30',
  worsening: 'bg-warning/10 text-warning border-warning/30',
  increased: 'text-warning',
  decreased: 'text-success',
};

const CeoSummaryPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [summary, setSummary] = useState<CeoSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/trial/ceo-summary/${token}`);

        if (response.ok) {
          const data = await response.json();
          setSummary(data.summary);
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Summary not found');
        }
      } catch (err) {
        setError('Failed to load summary');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSummary();
    }
  }, [token]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">
            Summary Not Available
          </h1>
          <p className="text-muted-foreground">
            {error || 'This executive summary link may have expired or is invalid.'}
          </p>
        </div>
      </div>
    );
  }

  const DirectionIcon = DIRECTION_ICONS[summary.riskDirection.overall] || Minus;
  const directionStyle = DIRECTION_COLORS[summary.riskDirection.overall] || DIRECTION_COLORS.stable;

  return (
    <div className="min-h-screen bg-background">
      {/* Print-friendly styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-break { page-break-after: always; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prepared for</p>
              <p className="font-semibold text-foreground">{summary.organizationName}</p>
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
            Organizational Workload Signals – Executive Summary
          </h1>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatPeriod(summary.periodStart, summary.periodEnd)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Generated {formatDate(summary.generatedAt)}
            </span>
          </div>
        </header>

        {/* Section 1: What we observed this month */}
        <section className="mb-10">
          <h2 className="text-xl font-display font-bold text-foreground mb-4 pb-2 border-b border-border">
            What we observed this month
          </h2>
          
          <ul className="space-y-3">
            {/* Meeting Load */}
            <li className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border/50">
              <div className={DIRECTION_COLORS[summary.observations.meetingLoadChange.direction]}>
                {summary.observations.meetingLoadChange.direction === 'increased' ? (
                  <TrendingUp className="w-5 h-5" />
                ) : summary.observations.meetingLoadChange.direction === 'decreased' ? (
                  <TrendingDown className="w-5 h-5" />
                ) : (
                  <Minus className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">Meeting load</p>
                <p className="text-sm text-muted-foreground">{summary.observations.meetingLoadChange.summary}</p>
              </div>
            </li>

            {/* After-hours work */}
            <li className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border/50">
              <div className={DIRECTION_COLORS[summary.observations.afterHoursWork.direction]}>
                {summary.observations.afterHoursWork.direction === 'increased' ? (
                  <TrendingUp className="w-5 h-5" />
                ) : summary.observations.afterHoursWork.direction === 'decreased' ? (
                  <TrendingDown className="w-5 h-5" />
                ) : (
                  <Minus className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">After-hours work trends</p>
                <p className="text-sm text-muted-foreground">{summary.observations.afterHoursWork.summary}</p>
              </div>
            </li>

            {/* Coordination pressure */}
            <li className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border/50">
              <div className={DIRECTION_COLORS[summary.observations.coordinationPressure.direction]}>
                {summary.observations.coordinationPressure.direction === 'increased' ? (
                  <TrendingUp className="w-5 h-5" />
                ) : summary.observations.coordinationPressure.direction === 'decreased' ? (
                  <TrendingDown className="w-5 h-5" />
                ) : (
                  <Minus className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">Coordination pressure concentration</p>
                <p className="text-sm text-muted-foreground">{summary.observations.coordinationPressure.summary}</p>
              </div>
            </li>
          </ul>
        </section>

        {/* Section 2: Why this matters */}
        <section className="mb-10">
          <h2 className="text-xl font-display font-bold text-foreground mb-4 pb-2 border-b border-border">
            Why this matters
          </h2>
          
          <div className="p-6 rounded-xl bg-secondary/20 border border-border/50">
            <p className="text-foreground leading-relaxed">
              {summary.significance.summary}
            </p>
          </div>
        </section>

        {/* Section 3: Direction of risk */}
        <section className="mb-10">
          <h2 className="text-xl font-display font-bold text-foreground mb-4 pb-2 border-b border-border">
            Direction of risk
          </h2>
          
          <div className="flex items-center gap-6 mb-4">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 ${directionStyle}`}>
              <DirectionIcon className="w-8 h-8" />
              <div>
                <p className="text-xs uppercase tracking-wider opacity-80">Risk Trend</p>
                <p className="text-2xl font-display font-bold capitalize">
                  {summary.riskDirection.overall}
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Confidence: <span className="font-medium capitalize">{summary.riskDirection.trendConfidence}</span></p>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground italic p-4 rounded-lg bg-muted/30">
            {summary.riskDirection.explanation}
          </p>
        </section>

        {/* Section 4: What this is (and is not) */}
        <section className="mb-10">
          <h2 className="text-xl font-display font-bold text-foreground mb-4 pb-2 border-b border-border">
            What this is (and is not)
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {/* What it is */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/20">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                <span className="text-sm text-foreground">
                  Team-level patterns only (min {summary.privacyStatement.minTeamSize} people)
                </span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/20">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                <span className="text-sm text-foreground">
                  No message, email, or chat content read
                </span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/20">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                <span className="text-sm text-foreground">
                  No individual monitoring
                </span>
              </div>
            </div>
            
            {/* What it is not */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                <X className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Not a survey
                </span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                <X className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Not sentiment analysis
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-border">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <p>{summary.footer}</p>
          </div>
          
          {/* SignalTrue branding */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>
              Powered by{' '}
              <a 
                href="https://signaltrue.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                SignalTrue
              </a>
              {' '}— Organizational workload intelligence
            </p>
          </div>
          
          {/* Print button */}
          <div className="mt-8 text-center no-print">
            <button
              onClick={() => window.print()}
              className="px-6 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors text-sm font-medium"
            >
              Print or Save as PDF
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CeoSummaryPage;
