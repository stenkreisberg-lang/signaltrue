import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';
import { PrimaryCommercialCTA, SampleReportCTA } from './CommercialCTA';

/*
 * Final CTA: move from a concrete workplace-risk concern to a visibility review.
 * The product promise is control-review evidence, not a survey or diagnosis.
 */

const CTASection = () => {
  return (
    <section className="py-20 lg:py-24 bg-[#0F172A]">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-section sm:text-display lg:text-display font-display font-bold mb-6 text-white">
            Bring one control you need to review.
          </h2>
          <p className="text-body text-[#CBD5E1] mb-10 max-w-xl mx-auto">
            See how SignalTrue can connect one implemented control to a qualified baseline, before-and-after work-pattern evidence, possible demand migration, worker validation and a documented review decision.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild variant="hero" size="xl">
              <PrimaryCommercialCTA ctaLocation="homepage_final">
                Review one control <ArrowRight className="h-5 w-5" />
              </PrimaryCommercialCTA>
            </Button>
            <Button asChild variant="hero-outline" size="xl">
              <SampleReportCTA ctaLocation="homepage_final">
                View the fictional sample
              </SampleReportCTA>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
