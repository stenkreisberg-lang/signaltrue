import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Share2, 
  AlertTriangle,
  CheckCircle,
  Lock,
  ArrowRight,
  Calendar,
  Users,
  Clock
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { TrialBanner } from '../components/TrialBanner';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

interface MonthlyReportData {
  id: string;
  periodStart: string;
  periodEnd: string;
  summary: {
    title: string;
    subtitle: string;
    generatedAt: string;
  };
  patterns: {
    avgBDI: number;
    bdiTrend: 'improving' | 'stable' | 'deteriorating';
    teamsAtRisk: number;
  };
  trend: {
    direction: string;
    label: string;
  };
  concernAreas: Array<{
    type: string;
    affectedTeams: number;
    severity: string;
  }>;
  lockedContent: {
    message: string;
    note: string;
    ctaText: string;
    ctaLink: string;
  };
}

const TREND_ICONS = {
  improving: TrendingDown,
  stable: Minus,
  deteriorating: TrendingUp,
};

const TREND_COLORS = {
  improving: 'text-success',
  stable: 'text-muted-foreground',
  deteriorating: 'text-warning',
};

const MonthlyReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [ceoSummaryUrl, setCeoSummaryUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/trial/monthly-report`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setReport(data.report);
          
          // Mark as viewed
          await fetch(`${API_BASE_URL}/api/trial/mark-milestone`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ milestone: 'monthlyReportViewed' }),
          });
        } else {
          setError('Failed to load report');
        }
      } catch (err) {
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [navigate]);

  const handleGenerateCeoSummary = async () => {
    setGeneratingSummary(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/trial/generate-ceo-summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCeoSummaryUrl(data.summary.shareUrl);
      }
    } catch (err) {
      console.error('Failed to generate CEO summary:', err);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 pb-20">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 pb-20">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center py-20">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
              <h1 className="text-3xl font-display font-bold mb-4">
                Your report is being prepared
              </h1>
              <p className="text-muted-foreground mb-8">
                Your first monthly report will be available on day 30 of your trial. 
                Continue using SignalTrue to build accurate baselines.
              </p>
              <Button variant="hero" onClick={() => navigate('/app')}>
                Back to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const TrendIcon = TREND_ICONS[report.patterns.bdiTrend] || Minus;
  const trendColor = TREND_COLORS[report.patterns.bdiTrend] || TREND_COLORS.stable;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container mx-auto px-6">
          {/* Trial Banner */}
          <TrialBanner className="mb-8" />

          {/* Report Header */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-2xl border border-border/50 p-8 mb-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                      Free Report
                    </span>
                    <span className="text-sm text-muted-foreground">
                      First month included
                    </span>
                  </div>
                  <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                    {report.summary.title}
                  </h1>
                  <p className="text-muted-foreground">
                    {report.summary.subtitle}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Period</p>
                  <p className="font-medium">
                    {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
                  </p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid md:grid-cols-3 gap-6 p-6 rounded-xl bg-secondary/30 mb-6">
                <div className="text-center">
                  <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Workload Index</p>
                  <p className="text-2xl font-bold text-foreground">{report.patterns.avgBDI}</p>
                </div>
                <div className="text-center">
                  <div className={`mx-auto mb-2 ${trendColor}`}>
                    <TrendIcon className="w-6 h-6 mx-auto" />
                  </div>
                  <p className="text-sm text-muted-foreground">Trend Direction</p>
                  <p className={`text-2xl font-bold ${trendColor}`}>{report.trend.label}</p>
                </div>
                <div className="text-center">
                  <Users className="w-6 h-6 text-warning mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Teams at Risk</p>
                  <p className="text-2xl font-bold text-foreground">{report.patterns.teamsAtRisk}</p>
                </div>
              </div>

              {/* Concern Areas */}
              {report.concernAreas.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Areas of Concentrated Coordination Pressure
                  </h3>
                  <div className="space-y-3">
                    {report.concernAreas.map((area, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                        <div>
                          <span className="font-medium text-foreground capitalize">{area.type}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {area.affectedTeams} team{area.affectedTeams !== 1 ? 's' : ''} affected
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          area.severity === 'structural' 
                            ? 'bg-destructive/10 text-destructive' 
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {area.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CEO Summary CTA */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Share2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      Share leadership summary
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate a CEO-ready one-pager summarizing organizational workload signals. 
                      Designed for HR leaders to forward to executives.
                    </p>
                    {ceoSummaryUrl ? (
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="text-sm text-foreground">Summary ready!</span>
                        <a 
                          href={ceoSummaryUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          Open summary →
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(ceoSummaryUrl);
                          }}
                        >
                          Copy Link
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="hero"
                        onClick={handleGenerateCeoSummary}
                        disabled={generatingSummary}
                      >
                        {generatingSummary ? 'Generating...' : 'Share leadership summary'}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Locked Content Section */}
            <div className="bg-card rounded-2xl border border-border/50 p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 pointer-events-none z-10" />
              <div className="relative z-20">
                <div className="flex items-center gap-3 mb-6">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold text-muted-foreground">
                    {report.lockedContent.message}
                  </h3>
                </div>
                
                {/* Placeholder for locked recommendations */}
                <div className="space-y-4 opacity-50 blur-sm pointer-events-none">
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted-foreground/10 rounded w-1/2"></div>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <div className="h-4 bg-muted-foreground/20 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-muted-foreground/10 rounded w-3/5"></div>
                  </div>
                </div>

                {/* Upgrade CTA */}
                <div className="text-center mt-8 pt-8 border-t border-border/50">
                  <h4 className="text-xl font-display font-bold text-foreground mb-2">
                    Continue receiving early signals and recommendations
                  </h4>
                  <p className="text-muted-foreground mb-6">
                    {report.lockedContent.note}
                  </p>
                  <Button 
                    variant="hero" 
                    size="xl"
                    onClick={() => navigate(report.lockedContent.ctaLink)}
                  >
                    {report.lockedContent.ctaText}
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MonthlyReportPage;
