import { Button } from '../components/ui/button';
import { ArrowRight, Shield, Lock, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import DriftAlertCard from './DriftAlertCard';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 *
 * Behavioral Drift Intelligence detects early systemic strain in organizations
 * by analyzing behavioral metadata from work systems, revealing overload,
 * fragmentation, and execution risk before burnout, disengagement, or attrition occur.
 *
 * Enemy: Lagging people analytics (surveys, reviews, exit interviews, wellbeing scores)
 * Promised Land: Leaders see early truth, act structurally, preserve execution capacity
 */

// Analytics tracking for conviction depth
const trackEvent = (eventName: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName);
  }
  // Also track internally
  try {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    fetch(`${apiUrl}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, timestamp: new Date().toISOString() }),
    }).catch(() => {});
  } catch {
    /* analytics tracking is optional */
  }
};

const Hero = () => {
  const handleRequestPreview = () => {
    trackEvent('early_signal_preview_requested');
  };

  const handleHowItWorks = () => {
    trackEvent('how_it_works_viewed');
  };

  return (
    <section className="relative min-h-screen bg-hero-gradient overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-glow opacity-50" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-glow opacity-30" />

      <div className="container mx-auto px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left content */}
          <div className="animate-slide-up">
            {/* Trust badges - Privacy positioning */}
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">
                  Behavioral Early-Warning System
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Lock className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-medium text-muted-foreground">
                  No content. No individuals.
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Shield className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-medium text-muted-foreground">
                  System-level patterns only
                </span>
              </div>
            </div>

            {/* Main headline - Category King copy */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
              Burnout Doesn't Start With Complaints.
              <br />
              <span className="text-gradient">It Starts With Invisible Drift.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
              SignalTrue is the first{' '}
              <strong className="text-foreground">Behavioral Early-Warning System</strong> that
              detects organizational overload and execution drift weeks before surveys, performance
              drops, or resignations appear.
            </p>

            {/* CTA buttons - Updated per spec */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link to="/contact" onClick={handleRequestPreview}>
                <Button variant="hero" size="xl">
                  Request Early Signal Preview
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/how-it-works" onClick={handleHowItWorks}>
                <Button variant="hero-outline" size="xl">
                  See How It Works
                </Button>
              </Link>
            </div>
          </div>

          {/* Right content - Alert card */}
          <div className="relative animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl blur-2xl" />
            <DriftAlertCard />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
