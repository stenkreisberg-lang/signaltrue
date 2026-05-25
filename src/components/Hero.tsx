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
  const handleRequestDemo = () => {
    trackEvent('demo_requested');
  };

  const handleHowItWorks = () => {
    trackEvent('how_it_works_viewed');
  };

  return (
    <section className="relative min-h-screen bg-hero-gradient overflow-hidden">
      {/* Subtle blue tint accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#DBEAFE] opacity-20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#EFF6FF] opacity-30 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left content */}
          <div className="animate-slide-up">
            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 mb-8">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] shadow-sm">
                <Eye className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span className="text-xs font-medium text-[#334155]">
                  Work pressure early warning
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] shadow-sm">
                <Lock className="w-3.5 h-3.5 text-[#047857]" />
                <span className="text-xs font-medium text-[#334155]">No message content</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] shadow-sm">
                <Shield className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span className="text-xs font-medium text-[#334155]">Team-level signals only</span>
              </div>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6 text-[#0F172A]">
              Detect manager overload before delivery slows down.
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-[#334155] max-w-lg mb-4 leading-relaxed">
              SignalTrue shows when meetings, after-hours work, lost focus time, and response
              pressure are creating execution drag in hybrid teams.
            </p>

            <p className="text-base text-[#334155] max-w-lg mb-4 leading-relaxed">
              Catch the pattern before it becomes missed delivery, burnout, or resignation risk.
            </p>

            {/* Trust line */}
            <p className="text-sm text-[#475569] mb-8">
              Metadata only. Team-level only. No message content. No individual productivity scores.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link to="/contact" onClick={handleRequestDemo}>
                <Button variant="hero" size="xl">
                  Request demo
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/product#sample-report" onClick={handleHowItWorks}>
                <Button variant="hero-outline" size="xl">
                  See sample report
                </Button>
              </Link>
            </div>
          </div>

          {/* Right content - Alert card */}
          <div className="relative animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
            <div className="absolute -inset-4 bg-[#DBEAFE] opacity-20 rounded-3xl blur-2xl pointer-events-none" />
            <DriftAlertCard />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
