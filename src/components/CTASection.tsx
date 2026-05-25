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
  const handleRequestDemo = () => {
    trackEvent('demo_requested');
  };

  return (
    <section className="py-20 lg:py-24 bg-[#0F172A]">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6 text-white">
            See where manager overload is building.
          </h2>
          <p className="text-lg text-[#CBD5E1] mb-10 max-w-xl mx-auto">
            Request a demo and see how SignalTrue turns meetings, focus time, response pressure,
            after-hours work, and manager load into a weekly early warning report.
          </p>

          {/* Single CTA per spec */}
          <Link to="/contact" onClick={handleRequestDemo}>
            <Button variant="hero" size="xl">
              Request demo
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
