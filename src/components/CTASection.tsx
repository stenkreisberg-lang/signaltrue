import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 *
 * Final CTA Section (per spec):
 * Title: You Don't Need Another Survey. You Need Earlier Truth.
 * Button: Request Early Signal Preview
 */

// Analytics tracking
const trackEvent = (eventName: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName);
  }
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

const CTASection = () => {
  const handleRequestPreview = () => {
    trackEvent('early_signal_preview_requested');
  };

  return (
    <section className="py-20 lg:py-24 bg-hero-gradient relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-glow opacity-30" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto px-6 relative">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
            You Don't Need Another Survey.{' '}
            <span className="text-gradient">You Need Earlier Truth.</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            See what behavioral drift looks like in your organization before it becomes visible in
            outcomes, exits, or engagement scores.
          </p>

          {/* Single CTA per spec */}
          <Link to="/contact" onClick={handleRequestPreview}>
            <Button variant="hero" size="xl">
              Request Early Signal Preview
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
