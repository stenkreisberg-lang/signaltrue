import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
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
            Start with a free SignalTrue preview. Bring one real control. SignalTrue will structure
            the baseline, after-period, sustainability, migration and worker-evidence review.
          </p>
          <p className="text-caption text-[#94A3B8] mb-10 max-w-xl mx-auto">
            The pilot is free. Use one team, one risk and one control to review whether the change
            helped and what evidence is still missing.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild variant="hero" size="xl">
              <PrimaryCommercialCTA ctaLocation="homepage_final">
                Get a free preview <ArrowRight className="h-5 w-5" />
              </PrimaryCommercialCTA>
            </Button>
            <Button asChild variant="hero-outline" size="xl">
              <SampleReportCTA ctaLocation="homepage_final">See the sample report</SampleReportCTA>
            </Button>
          </div>
          <p className="mt-6 text-caption text-[#CBD5E1]">
            <Link
              to="/did-the-control-work"
              className="underline underline-offset-4 hover:text-white"
            >
              Check your control-review gaps: 8 questions, no sign-up
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
