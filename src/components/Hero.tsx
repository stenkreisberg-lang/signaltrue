import { ArrowRight, Eye, Lock, Shield, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import DriftAlertCard from './DriftAlertCard';
import { SampleReportCTA } from './CommercialCTA';

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
                <span className="text-caption font-medium text-[#334155]">
                  No recurring survey required for work-pattern evidence
                </span>
              </div>
            </div>

            <h1 className="mb-5 text-section font-bold text-[#0F172A] sm:text-display">
              You changed the work. Can you show whether the control actually changed the work?
            </h1>

            <p className="mb-4 max-w-xl text-body text-[#334155]">
              SignalTrue gives Health & Safety and organisational-risk teams an evidence layer for
              control review: compare relevant work patterns before and after a change, check
              whether the change lasted, and see whether demand may simply have moved elsewhere.
            </p>

            <p className="mb-5 text-caption text-[#475569]">
              Built around a standards-informed method: observation → interpretation → worker
              validation → action. Team-level evidence only. No message content. No individual risk
              or productivity scores.
            </p>

            <div className="mb-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                to="/did-the-control-work"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-brand px-6 py-3 text-center text-body font-bold text-white shadow-sm hover:bg-brand-hover sm:w-auto"
              >
                Check one control for free <ArrowRight className="h-5 w-5 shrink-0" />
              </Link>
              <Link
                to="/controls"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control border border-brand bg-white px-6 py-3 text-caption font-bold text-brand hover:bg-brand-softer sm:w-auto"
              >
                Browse the Control Library
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
            <SampleReportCTA
              ctaLocation="homepage_hero"
              className="inline-flex text-caption font-semibold text-[#475569] underline decoration-[#CBD5E1] underline-offset-4 hover:text-brand"
            >
              View the fictional sample review
            </SampleReportCTA>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-caption text-[#475569]">
              {[
                'ISO 45003-informed',
                'ISO 45001 OH&S context',
                'Jurisdiction-aware deployment',
                'Privacy by design',
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden="true" /> {item}
                </span>
              ))}
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
