import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Activity, ArrowRight, Shield, Lock, AlertTriangle, CheckCircle, TrendingUp, Clock, Users, Zap, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// API base URL
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://signaltrue-backend.onrender.com' 
  : '';

interface DriftScore {
  totalScore: number;
  category: 'Stable' | 'Early Drift' | 'Active Drift' | 'Critical Drift';
  subScores: {
    meeting_pressure: number;
    response_pressure: number;
    focus_fragmentation: number;
    recovery_deficit: number;
    urgency_culture: number;
  };
  findings: string[];
}

interface DriftReport {
  sessionId: string;
  score: DriftScore;
  answers: Record<string, string>;
  createdAt: string;
  unlockedAt: string;
}

// Analytics tracking
const trackEvent = (eventName: string, data?: Record<string, unknown>) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DriftReport Analytics] ${eventName}`, data);
  }
  try {
    fetch(`${API_BASE}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, data, timestamp: new Date().toISOString() }),
    }).catch(() => {});
  } catch {
    // Silent fail
  }
};

// Get category styling
function getCategoryStyle(category: string): { color: string; bgColor: string; icon: React.ReactNode } {
  switch (category) {
    case 'Critical Drift':
      return { color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30', icon: <AlertTriangle className="w-5 h-5" /> };
    case 'Active Drift':
      return { color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/30', icon: <TrendingUp className="w-5 h-5" /> };
    case 'Early Drift':
      return { color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30', icon: <Clock className="w-5 h-5" /> };
    case 'Stable':
      return { color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/30', icon: <CheckCircle className="w-5 h-5" /> };
    default:
      return { color: 'text-muted-foreground', bgColor: 'bg-secondary/30 border-border/50', icon: <Activity className="w-5 h-5" /> };
  }
}

// Get subscore label
function getSubScoreLabel(key: string): { label: string; icon: React.ReactNode } {
  const labels: Record<string, { label: string; icon: React.ReactNode }> = {
    meeting_pressure: { label: 'Meeting Pressure', icon: <Calendar className="w-4 h-4" /> },
    response_pressure: { label: 'Response Pressure', icon: <Clock className="w-4 h-4" /> },
    focus_fragmentation: { label: 'Focus Fragmentation', icon: <Zap className="w-4 h-4" /> },
    recovery_deficit: { label: 'Recovery Deficit', icon: <Activity className="w-4 h-4" /> },
    urgency_culture: { label: 'Urgency Culture', icon: <AlertTriangle className="w-4 h-4" /> },
  };
  return labels[key] || { label: key, icon: <Activity className="w-4 h-4" /> };
}

// Get subscore color
function getSubScoreColor(value: number): string {
  if (value >= 75) return 'bg-red-500';
  if (value >= 50) return 'bg-orange-500';
  if (value >= 25) return 'bg-yellow-500';
  return 'bg-green-500';
}

const DriftReportPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<DriftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresUnlock, setRequiresUnlock] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/drift/report/${sessionId}`);
        const data = await response.json();

        if (!response.ok) {
          if (data.requiresUnlock) {
            setRequiresUnlock(true);
          } else {
            setError(data.message || 'Failed to load report');
          }
          setLoading(false);
          return;
        }

        setReport(data.report);
        trackEvent('drift_report_view', { 
          sessionId, 
          score: data.report.score.totalScore,
          category: data.report.score.category 
        });
      } catch (err) {
        setError('Failed to load report. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [sessionId]);

  // Handle baseline calibration CTA click
  const handleBaselineCTA = () => {
    trackEvent('drift_cta_baseline_calibration', { sessionId });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your report...</p>
        </div>
      </div>
    );
  }

  if (requiresUnlock) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 pt-32 pb-20">
          <div className="max-w-lg mx-auto text-center">
            <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
            <h1 className="text-3xl font-display font-bold mb-4">Report Not Unlocked</h1>
            <p className="text-muted-foreground mb-8">
              This report requires email verification. Please complete the diagnostic and enter your email to unlock your results.
            </p>
            <a href="/drift/run.html">
              <Button variant="hero" size="lg">
                Start Diagnostic
                <ArrowRight className="w-5 h-5" />
              </Button>
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 pt-32 pb-20">
          <div className="max-w-lg mx-auto text-center">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-6" />
            <h1 className="text-3xl font-display font-bold mb-4">Error Loading Report</h1>
            <p className="text-muted-foreground mb-8">{error || 'Report not found'}</p>
            <a href="/drift/run.html">
              <Button variant="hero" size="lg">
                Start New Diagnostic
                <ArrowRight className="w-5 h-5" />
              </Button>
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const { score } = report;
  const categoryStyle = getCategoryStyle(score.category);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-12 border-b border-border/50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Behavioral Drift Report</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4">
              Your Drift Profile
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
              This is a directional risk profile based on your answers. It flags system-level coordination strain patterns 
              that often show up before surveys and exit interviews.
            </p>
            
            {/* Main Score Cards */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-secondary/30 border border-border/50">
                <div className="text-5xl font-bold mb-2">{score.totalScore}</div>
                <div className="text-muted-foreground">Drift Score (0-100)</div>
              </div>
              
              <div className={`p-6 rounded-2xl border ${categoryStyle.bgColor}`}>
                <div className={`flex items-center gap-3 mb-2 ${categoryStyle.color}`}>
                  {categoryStyle.icon}
                  <span className="text-3xl font-bold">{score.category}</span>
                </div>
                <div className="text-muted-foreground">Risk Category</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Key Findings Section */}
      <section className="py-12 border-b border-border/50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-6">Key Findings</h2>
            
            <div className="space-y-4">
              {score.findings.map((finding, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-xl bg-secondary/20 border border-border/50"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary text-sm font-bold">{index + 1}</span>
                  </div>
                  <p className="text-foreground">{finding}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Sub-Scores Section */}
      <section className="py-12 border-b border-border/50 bg-secondary/5">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-6">Detailed Breakdown</h2>
            
            <div className="space-y-4">
              {Object.entries(score.subScores).map(([key, value]) => {
                const { label, icon } = getSubScoreLabel(key);
                return (
                  <div key={key} className="p-4 rounded-xl bg-secondary/20 border border-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{icon}</span>
                        <span className="font-medium">{label}</span>
                      </div>
                      <span className="font-bold">{value}%</span>
                    </div>
                    <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getSubScoreColor(value)} transition-all duration-500`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      
      {/* What This Means Section */}
      <section className="py-12 border-b border-border/50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-6">What This Means</h2>
            
            <div className="p-6 rounded-2xl bg-secondary/20 border border-border/50 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  This is a <strong className="text-foreground">system-level risk profile</strong>, not a judgment of people.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  It reflects patterns that often show up <strong className="text-foreground">before engagement surveys or exit interviews</strong>.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  The goal is prevention. You want to intervene <strong className="text-foreground">while the system is still recoverable</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Recommended Next Steps Section */}
      <section className="py-12 border-b border-border/50 bg-secondary/5">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-6">Recommended Next Steps</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
                <Users className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Validate with Real Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Run a 30-day baseline calibration with SignalTrue to see these patterns in your actual team behavior—metadata only, no surveillance.
                </p>
                <Link to="/product" onClick={handleBaselineCTA}>
                  <Button variant="outline" size="sm">
                    Start Baseline Calibration
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              
              <div className="p-6 rounded-2xl bg-secondary/30 border border-border/50">
                <Calendar className="w-8 h-8 text-accent mb-4" />
                <h3 className="font-semibold mb-2">Get Expert Guidance</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Book a 15-minute walkthrough of your report and what actions typically work at this stage.
                </p>
                <a href="https://calendly.com/signaltrue/drift-review" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    Book a Call
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Final CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-display font-bold mb-4">
              Ready to see this with real behavioral signals?
            </h2>
            <p className="text-muted-foreground mb-8">
              SignalTrue can run a 30-day baseline calibration. Team-level patterns, metadata only, no surveillance. 
              See drift signals with confidence scores and trend direction.
            </p>
            
            <Link to="/product" onClick={handleBaselineCTA}>
              <Button variant="hero" size="xl">
                Start Baseline Calibration
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            
            {/* Privacy reminder */}
            <div className="flex items-center justify-center gap-4 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>No message content</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Team-level only</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Minimum group sizes</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default DriftReportPage;
