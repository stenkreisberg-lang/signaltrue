import { ArrowRight, Shield, Lock, Eye } from 'lucide-react';
import DriftAlertCard from './DriftAlertCard';
import { PrimaryCommercialCTA, SampleReportCTA } from './CommercialCTA';

/*
 * CATEGORY: WORK-PATTERN EARLY WARNING
 *
 * SignalTrue analyses work-pattern metadata from work systems to show persistent
 * team-level change in meeting load, focus availability, after-hours activity and
 * coordination demand.
 *
 * These are changes in the system of work that may warrant investigation. They do
 * not establish that a psychosocial hazard exists, and they are not a prediction of
 * burnout, disengagement or attrition — copy on this page must not imply otherwise.
 *
 * Complements: worker consultation and psychosocial risk assessment, which provide
 * the context that metadata cannot.
 */

const Hero = () => {
  return (
    <section className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-hero-gradient">
      {/* Subtle blue tint accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#DBEAFE] opacity-20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#EFF6FF] opacity-30 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 pb-14 pt-28 lg:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left content */}
          <div className="animate-slide-up">
            {/* Trust badges */}
            <div className="mb-5 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] shadow-sm">
                <Eye className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span className="text-xs font-medium text-[#334155]">
                  Psychosocial risk early evidence
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
            <h1 className="mb-5 text-4xl font-bold leading-[1.08] text-[#0F172A] sm:text-5xl lg:text-[3.35rem]">
              See when work starts changing between psychosocial risk assessments.
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-[#334155] max-w-lg mb-4 leading-relaxed">
              SignalTrue gives health &amp; safety and operational leaders continuous, team-level
              visibility into changing work patterns such as meeting load, focus time, after-hours
              activity and coordination.
            </p>

            <p className="text-base text-[#334155] max-w-lg mb-4 leading-relaxed">
              It does not read message bodies, diagnose workers or score individual productivity.
            </p>

            {/* Trust line */}
            <p className="mb-5 text-sm text-[#475569]">
              Metadata only. Team-level only. No message content. No individual productivity scores.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <PrimaryCommercialCTA
                ctaLocation="homepage_hero"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-6 py-3 text-center text-base font-bold text-white shadow-sm hover:bg-[#1E40AF] sm:w-auto"
              >
                Request a 20-minute psychosocial risk visibility review{' '}
                <ArrowRight className="h-5 w-5 shrink-0" />
              </PrimaryCommercialCTA>
              <SampleReportCTA
                ctaLocation="homepage_hero"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-6 py-3 text-base font-bold text-[#0F172A] hover:border-[#1D4ED8] sm:w-auto"
              />
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
