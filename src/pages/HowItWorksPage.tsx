import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { WorkloadAssessment } from "../components/WorkloadAssessment";
import { 
  Activity, 
  BarChart2, 
  AlertCircle, 
  TrendingUp, 
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
  BarChart3,
  Calculator,
  Target,
  Eye,
  XCircle,
  Layers
} from "lucide-react";

/*
 * CATEGORY KING POSITIONING:
 * Detect → Explain → Act → Learn
 * Every section must answer: What decision does this enable?
 */

// API base URL for tracking
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://signaltrue-backend.onrender.com' 
  : '';

// Analytics tracking function
const trackEvent = (eventName: string, data?: Record<string, unknown>) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${eventName}`, data);
  }
  
  // Send to backend for internal tracking
  try {
    fetch(`${API_BASE}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, data, timestamp: new Date().toISOString() }),
    }).catch(() => {}); // Silent fail for tracking
  } catch {
    // Silent fail for tracking
  }
};

// Why assumptions fail - per spec
const assumptions = [
  {
    assumption: "Engagement surveys tell us how people feel",
    rebuttal: "Surveys measure self-reported opinion at a point in time. They miss behavioral patterns that predict problems months earlier.",
  },
  {
    assumption: "Managers know when their teams are struggling",
    rebuttal: "Managers often lack visibility into coordination load, response pressure, and after-hours patterns across their team.",
  },
  {
    assumption: "Output metrics show team health",
    rebuttal: "Output stays stable while teams compensate with unsustainable effort. By the time delivery drops, damage is done.",
  },
];

// Renamed steps per spec: Detect → Explain → Act → Learn
const steps = [
  {
    number: "01",
    icon: Activity,
    title: "Detect drift",
    description: "We establish adaptive baselines for individuals and teams and detect statistically significant drift from normal patterns.",
    details: [
      "Adaptive baselines per entity",
      "Seasonality-aware calibration",
      "Sustained deviation detection",
    ],
  },
  {
    number: "02",
    icon: BarChart2,
    title: "Explain the cause",
    description: "We identify likely drivers behind the drift using causal modeling—not guesswork or simple correlation.",
    details: [
      "Driver attribution for each drift",
      "Ranked contributing factors",
      "Confidence scoring on explanations",
    ],
  },
  {
    number: "03",
    icon: AlertCircle,
    title: "Recommend intervention",
    description: "We recommend interventions ranked by expected impact and feasibility. Clear actions, not vague advice.",
    details: [
      "Specific action recommendations",
      "Expected effect per intervention",
      "Manager-ready language",
    ],
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Measure and learn",
    description: "We measure outcomes and continuously improve recommendations. Decisions get better over time.",
    details: [
      "Before/after outcome tracking",
      "Effect size measurement",
      "Continuous learning from results",
    ],
  },
];

// Tool ecosystem per spec
const integrations = [
  { name: "Slack", description: "Team-level coordination patterns", status: "current" },
  { name: "Google Calendar", description: "Meeting load and focus-time signals", status: "current" },
  { name: "Gmail", description: "Email volume and response patterns", status: "current" },
  { name: "Google Meet", description: "Meeting frequency and attendance", status: "current" },
  { name: "Jira", description: "Sprint velocity and execution friction", status: "current" },
  { name: "Asana", description: "Task flow and workload patterns", status: "current" },
  { name: "Notion", description: "Documentation and collaboration activity", status: "current" },
  { name: "HubSpot", description: "CRM activity and deal velocity", status: "current" },
  { name: "Pipedrive", description: "Sales pipeline and activity patterns", status: "current" },
  { name: "Microsoft Teams", description: "Coordination patterns", status: "planned" },
  { name: "Outlook Calendar", description: "Meeting load signals", status: "planned" },
];

const HowItWorksPage = () => {
  const location = useLocation();

  // Scroll to assessment section if hash is present
  useEffect(() => {
    if (location.hash === '#assessment') {
      setTimeout(() => {
        document.getElementById('assessment')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-20" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                How SignalTrue works
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                <span className="text-gradient">Detect. Explain. Act. Learn.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
                A complete workflow for causal drift management—not just another dashboard.
              </p>
              <Button variant="hero" size="xl" asChild>
                <a href="#assessment">
                  See how drift shows up
                  <ArrowRight className="w-5 h-5" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* NEW: Why Assumptions Fail Section - per spec */}
        <section className="py-16 lg:py-20 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                  The Problem
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  Why assumptions fail in modern work
                </h2>
              </div>

              <div className="space-y-6">
                {assumptions.map((item, index) => (
                  <div 
                    key={index}
                    className="grid md:grid-cols-2 gap-6 p-6 rounded-2xl bg-card border border-border/50"
                  >
                    <div className="flex items-start gap-4">
                      <XCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Common Assumption
                        </h3>
                        <p className="text-foreground font-medium">
                          "{item.assumption}"
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <CheckCircle className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                          Signal-Based Reality
                        </h3>
                        <p className="text-muted-foreground">
                          {item.rebuttal}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What SignalTrue Measures Section */}
        <section className="py-16 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                  What We Measure
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  Behavioral workload patterns, not content
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  SignalTrue analyzes metadata and timing patterns to reveal hidden workload. We never read message content, 
                  emails, or documents.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-card border border-border/50">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 mb-4 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    Meeting Load
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Hours in meetings, back-to-back patterns, and focus time availability per team.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-card border border-border/50">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 mb-4 flex items-center justify-center">
                    <Target className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    Collaboration Patterns
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Message timing, response patterns, and after-hours activity trends.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-card border border-border/50">
                  <div className="w-12 h-12 rounded-xl bg-warning/10 mb-4 flex items-center justify-center">
                    <Eye className="w-6 h-6 text-warning" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    Drift Detection
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Changes from team baselines that often precede overload, disengagement, or coordination issues.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Assessment Section - Main Conversion Engine */}
        <section id="assessment" className="py-20 bg-secondary/20 scroll-mt-20">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-primary" />
                <p className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Workload Assessment & Cost Calculator
                </p>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                Estimate your hidden collaboration costs
              </h2>
              <p className="text-muted-foreground">
                Enter your team's information to see estimated workload risk and cost exposure. 
                All calculations use transparent assumptions you can adjust.
              </p>
            </div>

            <WorkloadAssessment onTrackEvent={trackEvent} />
          </div>
        </section>

        {/* How SignalTrue Replaces Assumptions */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                  Replace Estimates with Real Data
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  How SignalTrue turns assumptions into signals
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  The assessment above uses your estimates. Once connected, SignalTrue measures actual patterns.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="p-6 rounded-2xl bg-secondary/30 border border-border/50">
                  <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm">
                      ?
                    </span>
                    Without SignalTrue
                  </h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      Estimated meeting hours based on surveys or assumptions
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      No visibility into after-hours work patterns
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      Generic industry benchmarks, not team-specific baselines
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      Reactive responses when burnout or attrition appears
                    </li>
                  </ul>
                </div>

                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/30">
                  <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                      ✓
                    </span>
                    With SignalTrue
                  </h3>
                  <ul className="space-y-3 text-sm text-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      Actual meeting hours from calendar data
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      Real after-hours collaboration patterns
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      Team-specific baselines that evolve over time
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      Early warning signals before problems escalate
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline Section */}
        <section className="py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Implementation
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                From setup to signals in 4 steps
              </h2>
            </div>
            <div className="max-w-4xl mx-auto">
              {steps.map((step, index) => (
                <div 
                  key={index}
                  className="relative flex gap-8 pb-16 last:pb-0 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Timeline line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-8 top-20 bottom-0 w-px bg-gradient-to-b from-primary/50 to-border" />
                  )}

                  {/* Step number */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <span className="text-xl font-display font-bold text-primary">{step.number}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-2">
                    <div className="flex items-center gap-3 mb-3">
                      <step.icon className="w-6 h-6 text-primary" />
                      <h3 className="text-2xl font-display font-bold text-foreground">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-lg text-muted-foreground mb-6">
                      {step.description}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {step.details.map((detail, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                          <span className="text-sm text-foreground">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tool Ecosystem Section - per spec */}
        <section className="py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Tool Ecosystem
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                SignalTrue is a signal layer, not a chat plugin
              </h2>
              <p className="text-muted-foreground">
                Silent burnout often hides in task flow, not chat volume.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              {/* Current Integrations */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 text-center">Current</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {integrations.filter(i => i.status === 'current').map((integration, index) => (
                    <div 
                      key={index}
                      className="p-6 rounded-2xl bg-card border border-primary/30 text-center"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                        <Layers className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="font-display font-semibold text-foreground mb-1">
                        {integration.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {integration.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Integrations */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">Coming Next</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {integrations.filter(i => i.status === 'next').map((integration, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-2xl bg-secondary/30 border border-border/50 text-center"
                    >
                      <div className="w-10 h-10 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <h4 className="font-display font-medium text-foreground text-sm mb-1">
                        {integration.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {integration.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Planned Integrations */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">Planned</h3>
                <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto">
                  {integrations.filter(i => i.status === 'planned').map((integration, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-2xl bg-muted/30 border border-border/30 text-center opacity-70"
                    >
                      <h4 className="font-display font-medium text-muted-foreground text-sm">
                        {integration.name}
                      </h4>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                  Built on trust
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  Privacy is non-negotiable
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    Team-level only
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Signals are aggregated at team level with minimum thresholds.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    No message content access
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We analyze patterns and metadata only, never message content.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    Transparent rollout
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We provide employee-facing explanations so HR can launch with clarity and trust.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - Updated with outcome-focused language */}
        <section className="py-20 lg:py-24 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-30" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
                See how drift shows up in your organization
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                We'll walk you through signals, privacy architecture, and the intervention workflow.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/product">
                  <Button 
                    variant="hero" 
                    size="xl"
                    onClick={() => trackEvent('cta_clicked', { type: 'view_signals', location: 'how-it-works-footer' })}
                  >
                    See your organizational signals
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="hero-outline" size="xl">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorksPage;
