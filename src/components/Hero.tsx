import { ArrowRight, Shield, Lock, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import DriftAlertCard from './DriftAlertCard';
import { trackEvent } from '../lib/analytics';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 *
 * Behavioral Drift Intelligence detects early systemic strain in organizations
 * by analyzing behavioral metadata from work systems, revealing overload,
 * fragmentation, and execution risk before burnout, disengagement, or attrition occur.
 *
 * Enemy: Lagging people analytics (surveys, reviews, exit interviews, wellbeing scores)
 * Promised Land: Leaders see early truth, act structurally, preserve execution capacity
 */

const Hero = () => {
  const handleRequestDemo = () => {
    trackEvent('demo_cta_click', {
      event_category: 'lead_funnel',
      event_label: 'homepage_hero',
      cta: 'homepage_hero',
    });
  };

  const handleHowItWorks = () => {
    trackEvent('sample_report_click', {
      event_category: 'lead_funnel',
      event_label: 'homepage_hero',
      cta: 'homepage_hero',
    });
  };

  return (
    <section className="relative min-h-screen bg-hero-gradient overflow-hidden">
      {/* Subtle blue tint accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#DBEAFE] opacity-20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#EFF6FF] opacity-30 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left content */}
          <div className="animate-slide-up">
            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 mb-8">
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
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6 text-[#0F172A]">
              Detect work-related stress risks before they become harm or disruption.
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-[#334155] max-w-lg mb-4 leading-relaxed">
              SignalTrue gives health &amp; safety managers early, team-level evidence of workload,
              recovery, meeting and manager-capacity risks in hybrid work.
            </p>

            <p className="text-base text-[#334155] max-w-lg mb-4 leading-relaxed">
              Use it to verify concerns with workers, prioritise preventive controls and review
              whether conditions improve.
            </p>

            {/* Trust line */}
            <p className="text-sm text-[#475569] mb-8">
              Metadata only. Team-level only. No message content. No individual productivity scores.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link to="/contact?intent=demo&cta=homepage_hero" onClick={handleRequestDemo}>
                <span className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-[#1E40AF] sm:w-auto">
                  Book a workplace risk review <ArrowRight className="h-5 w-5" />
                </span>
              </Link>
              <Link to="/sample-report" onClick={handleHowItWorks}>
                <span className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-6 py-3 text-base font-bold text-[#0F172A] hover:border-[#1D4ED8] sm:w-auto">
                  View sample report
                </span>
              </Link>
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
