import { ArrowRight, Eye, Lock, Shield } from 'lucide-react';
import DriftAlertCard from './DriftAlertCard';
import { PrimaryCommercialCTA, SampleReportCTA } from './CommercialCTA';

const Hero = () => {
  return (
    <section className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-hero-gradient">
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-soft opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-brand-softer opacity-40 blur-3xl" />

      <div className="container mx-auto px-6 pb-12 pt-24 lg:pt-24">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
          <div className="animate-slide-up">
            <div className="mb-4 flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 shadow-sm">
                <Eye className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                <span className="text-caption font-medium text-[#334155]">Control evidence</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 shadow-sm">
                <Lock className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                <span className="text-caption font-medium text-[#334155]">No message content</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 shadow-sm">
                <Shield className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                <span className="text-caption font-medium text-[#334155]">Team-level only</span>
              </div>
            </div>

            <h1 className="mb-5 text-section font-bold text-[#0F172A] sm:text-display">
              You removed the meetings. Did the workload actually go away?
            </h1>

            <p className="mb-4 max-w-xl text-body text-[#334155]">
              SignalTrue compares how work happened before and after a change, checks whether the
              improvement was sustained, and flags possible migration when the demand simply moved
              to another channel, another time, or another team.
            </p>

            <p className="mb-5 text-caption text-[#475569]">
              Metadata only. Team-level only. Human decisions stay with your organisation.
            </p>

            <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <PrimaryCommercialCTA
                ctaLocation="homepage_hero"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-brand px-6 py-3 text-center text-body font-bold text-white shadow-sm hover:bg-brand-hover sm:w-auto"
              >
                Book a 20-minute visibility review <ArrowRight className="h-5 w-5 shrink-0" />
              </PrimaryCommercialCTA>
              <SampleReportCTA
                ctaLocation="homepage_hero"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-control border border-[#CBD5E1] bg-white px-6 py-3 text-caption font-bold text-[#0F172A] hover:border-brand sm:w-auto"
              >
                View the fictional sample review
              </SampleReportCTA>
            </div>
          </div>

          <div className="relative animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
            <div className="pointer-events-none absolute -inset-4 rounded-container bg-brand-soft opacity-20 blur-2xl" />
            <DriftAlertCard />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
