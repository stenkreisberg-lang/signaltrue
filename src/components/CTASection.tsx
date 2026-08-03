import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackEvent } from '../lib/analytics';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 *
 * Final CTA Section (per spec):
 * Title: You Don't Need Another Survey. You Need Earlier Truth.
 * Button: Request Early Signal Preview
 */

const CTASection = () => {
  const handleRequestDemo = () => {
    trackEvent('demo_cta_click', {
      event_category: 'lead_funnel',
      event_label: 'homepage_final',
      cta: 'homepage_final',
    });
  };

  return (
    <section className="py-20 lg:py-24 bg-[#0F172A]">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6 text-white">
            See where manager overload is building.
          </h2>
          <p className="text-lg text-[#CBD5E1] mb-10 max-w-xl mx-auto">
            Bring one workload concern. In 20 minutes, see how SignalTrue turns meetings, focus
            time, response pressure, after-hours work, and manager load into an early warning view.
          </p>

          {/* Single CTA per spec */}
          <Link to="/contact?intent=demo&cta=homepage_final" onClick={handleRequestDemo}>
            <Button variant="hero" size="xl">
              Book a 20-minute review
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
