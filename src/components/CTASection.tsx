import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';
import { PrimaryCommercialCTA, SampleReportCTA } from './CommercialCTA';

const CTASection = () => {
  return (
    <section className="py-20 lg:py-24 bg-[#0F172A]">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-section sm:text-display lg:text-display font-display font-bold mb-6 text-white">
            Have one psychosocial control you are not sure worked?
          </h2>
          <p className="text-body text-[#CBD5E1] mb-5 max-w-xl mx-auto">
            We are selecting Australian organisations for a free validation pilot. Bring one real
            control. SignalTrue will structure the baseline, after-period, sustainability,
            migration and worker-evidence review.
          </p>
          <p className="text-caption text-[#94A3B8] mb-10 max-w-xl mx-auto">
            There is no pilot fee. In return, we ask for structured feedback on the method, report
            usefulness and what a WHS team would need before adopting it more broadly.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild variant="hero" size="xl">
              <PrimaryCommercialCTA ctaLocation="homepage_final">
                Apply for a free pilot <ArrowRight className="h-5 w-5" />
              </PrimaryCommercialCTA>
            </Button>
            <Button asChild variant="hero-outline" size="xl">
              <SampleReportCTA ctaLocation="homepage_final">
                See the sample report
              </SampleReportCTA>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
