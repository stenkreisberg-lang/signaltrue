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
            Bring one workplace risk concern.
          </h2>
          <p className="text-lg text-[#CBD5E1] mb-10 max-w-xl mx-auto">
            In 20 minutes, see how SignalTrue can support your psychosocial risk process with
            baseline-aware evidence, worker consultation prompts and measurable corrective actions.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild variant="hero" size="xl">
              <Link to="/contact?intent=demo&cta=homepage_final" onClick={handleRequestDemo}>
                Request a workplace risk review <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="hero-outline" size="xl">
              <Link to="/sample-report">View sample report</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
