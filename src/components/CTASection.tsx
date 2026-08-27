import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';
import { PrimaryCommercialCTA, SampleReportCTA } from './CommercialCTA';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 *
 * Final CTA Section (per spec):
 * Title: You Don't Need Another Survey. You Need Earlier Truth.
 * Button: Request Early Signal Preview
 */

const CTASection = () => {
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
              <PrimaryCommercialCTA ctaLocation="homepage_final">
                Request a 20-minute psychosocial risk visibility review{' '}
                <ArrowRight className="h-5 w-5" />
              </PrimaryCommercialCTA>
            </Button>
            <Button asChild variant="hero-outline" size="xl">
              <SampleReportCTA ctaLocation="homepage_final" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
