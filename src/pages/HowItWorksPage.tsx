import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import {
  Eye,
  BarChart2,
  AlertTriangle,
  Users,
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
  Activity,
} from 'lucide-react';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 * 
 * How It Works Page (per spec):
 * Purpose: Remove skepticism without technical overload.
 * 
 * Steps:
 * 1. Observe - We Observe Patterns, Not People
 * 2. Learn Baseline - Every Organization Has a Rhythm
 * 3. Detect Drift - Drift Is the First Warning Signal
 * 4. Signal - Leaders See Risk Early
 */

// Analytics tracking
const trackEvent = (eventName: string) => {
  if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', eventName);
  }
  try {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    fetch(`${apiUrl}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, timestamp: new Date().toISOString() }),
    }).catch(() => { /* Silently fail for analytics */ });
  } catch { /* Silently fail for analytics */ }
};

// 4 Steps per spec
const steps = [
  {
    number: '01',
    icon: Eye,
    title: 'We Observe Patterns, Not People',
    subtitle: 'Observe',
    description: 'Behavioral metadata only. No content. No surveillance.',
    details: [
      'Calendar patterns and meeting density',
      'Collaboration timing and response patterns',
      'Focus time availability',
      'After-hours work signals',
    ],
  },
  {
    number: '02',
    icon: BarChart2,
    title: 'Every Organization Has a Rhythm',
    subtitle: 'Learn Baseline',
    description: 'SignalTrue learns what "normal" looks like before detecting drift.',
    details: [
      'Adaptive baselines per team',
      'Seasonality-aware calibration',
      'Role-specific pattern recognition',
      'Continuous learning from actual work',
    ],
  },
  {
    number: '03',
    icon: AlertTriangle,
    title: 'Drift Is the First Warning Signal',
    subtitle: 'Detect Drift',
    description: 'Early signals that predict problems weeks before they become visible.',
    examples: [
      'Focus time collapses',
      'Meeting density rises',
      'After-hours work creeps in',
      'Execution slows despite effort',
    ],
  },
  {
    number: '04',
    icon: Users,
    title: 'Leaders See Risk Early',
    subtitle: 'Signal',
    description: 'Clear system-level insights. No individual blame.',
    details: [
      'Team-level pattern visibility',
      'Structural recommendations',
      'Risk prioritization',
      'Early intervention guidance',
    ],
  },
];

const HowItWorksPage = () => {
  const location = useLocation();

  useEffect(() => {
    trackEvent('how_it_works_viewed');
  }, []);

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const element = document.getElementById(location.hash.slice(1));
        element?.scrollIntoView({ behavior: 'smooth' });
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
                How SignalTrue Works
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                From Invisible Patterns to{' '}
                <span className="text-gradient">Early Warning</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
                Four steps from behavioral metadata to actionable leadership insight. No surveillance. No content access.
              </p>
              <Link to="/contact" onClick={() => trackEvent('early_signal_preview_requested')}>
                <Button variant="hero" size="xl">
                  Request Early Signal Preview
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 4-Step Process Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="relative flex gap-8 pb-20 last:pb-0 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {index < steps.length - 1 && (
                    <div className="absolute left-8 top-20 bottom-0 w-px bg-gradient-to-b from-primary/50 to-border" />
                  )}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <span className="text-xl font-display font-bold text-primary">
                        {step.number}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 pt-2">
                    <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                      {step.subtitle}
                    </p>
                    <div className="flex items-center gap-3 mb-3">
                      <step.icon className="w-6 h-6 text-primary" />
                      <h3 className="text-2xl font-display font-bold text-foreground">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-lg text-muted-foreground mb-6">{step.description}</p>
                    <div className="p-6 rounded-2xl bg-secondary/30 border border-border/50">
                      {step.details && (
                        <div className="grid sm:grid-cols-2 gap-3">
                          {step.details.map((detail, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                              <span className="text-sm text-foreground">{detail}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {step.examples && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-muted-foreground mb-3">Examples of drift signals:</p>
                          <div className="grid sm:grid-cols-2 gap-3">
                            {step.examples.map((example, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                                <span className="text-sm text-foreground">{example}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy Reinforcement */}
        <section className="py-20 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 mb-6">
                  <Shield className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-success">Privacy by architecture</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  What We Never Do
                </h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-card border border-border/50 text-center">
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-destructive" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">No Message Reading</h3>
                  <p className="text-sm text-muted-foreground">We never access email content, chat messages, or document text.</p>
                </div>
                <div className="p-6 rounded-2xl bg-card border border-border/50 text-center">
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-6 h-6 text-destructive" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">No Individual Scoring</h3>
                  <p className="text-sm text-muted-foreground">No performance ratings, productivity scores, or individual profiles.</p>
                </div>
                <div className="p-6 rounded-2xl bg-card border border-border/50 text-center">
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-destructive" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">No Time Tracking</h3>
                  <p className="text-sm text-muted-foreground">We don't track individual time or monitor specific activities.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-30" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
                See Early Signals in Your Organization
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Request a preview to see what behavioral drift looks like in your context.
              </p>
              <Link to="/contact" onClick={() => trackEvent('early_signal_preview_requested')}>
                <Button variant="hero" size="xl">
                  Request Early Signal Preview
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorksPage;
