import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';
import { CheckCircle, ArrowRight, Shield } from 'lucide-react';
import { PrimaryCommercialCTA } from '../components/CommercialCTA';
import { trackFunnelEvent } from '../lib/analytics';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 *
 * Pricing Page (per spec):
 * Purpose: Anchor price to risk avoided, not features.
 *
 * Pricing Philosophy: Pricing reflects the cost of delayed visibility.
 * One missed signal often costs more than a year of prevention.
 *
 * Tiers (outcome-first, not feature-first):
 * - Visibility: Early system signals
 * - Prevention: Trend tracking + alerts
 * - Resilience: Executive summaries + intervention guidance
 */

// Pricing tiers per spec
const tiers = [
  {
    name: 'Team Signals',
    planKey: 'visibility',
    outcome: 'Start with a structured workload scan, then continue with weekly team visibility.',
    description: 'Best for Health & Safety teams running ongoing team-level risk reviews.',
    price: '€299',
    period: '/month',
    priceNote:
      'Per organization workspace, per month, excluding VAT. Team scope is confirmed before activation.',
    highlight: false,
    features: [
      'First-month onboarding scan',
      '3–4 week baseline period',
      'Team-level work-pattern analysis',
      'Weekly team reports',
      'Management Capacity Signal',
      'Meeting Overload Signal',
      'Focus Fragmentation Signal',
      'Responsiveness Pressure Signal',
      'Recovery Risk Signal',
      'Intervention notes',
      'Email alerts',
      'Metadata-only reporting',
      'Team-level privacy rules',
    ],
    cta: 'Discuss Team Signals',
  },
  {
    name: 'Leadership Signals',
    planKey: 'interpretation',
    outcome: 'Organizational visibility across multiple teams.',
    description: 'Best for executives and leadership teams who need cross-team insight.',
    price: '€499',
    period: '/month',
    priceNote:
      'Per organization workspace, per month, excluding VAT. Includes the executive decision brief.',
    highlight: true,
    features: [
      'Everything in Team Signals, plus:',
      'Monthly leadership report',
      'Organizational risk summary',
      'Cross-team comparison',
      'Manager capacity view',
      'Execution Drag Signal',
      'Priority action list',
      'Before-and-after intervention tracking',
      'Leadership review notes',
      'Board-ready summary',
    ],
    cta: 'Discuss Leadership Signals',
  },
  {
    name: 'Enterprise',
    planKey: null,
    outcome: 'Custom security, compliance, integration, and reporting.',
    description: 'Best for larger organizations with advanced requirements.',
    price: 'Custom',
    period: '',
    priceNote: 'Quoted for security, integration and reporting requirements.',
    highlight: false,
    features: [
      'Everything in Leadership Signals, plus:',
      'Custom integrations',
      'Custom thresholds',
      'SSO, if required',
      'Advanced access controls',
      'Dedicated onboarding',
      'Custom reporting structure',
      'Data retention controls',
      'Security review support',
      'Quarterly leadership review',
    ],
    cta: 'Contact sales',
  },
];

const Pricing = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="SignalTrue Pricing | Workload Scan and Team Signals"
        description="Compare SignalTrue workload scan, team and leadership plans for team-level psychosocial risk evidence, action reviews and executive decisions."
        path="/pricing"
      />
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-white border-b border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-caption font-semibold text-brand uppercase tracking-wider mb-4">
                Pricing
              </p>
              <h1 className="text-display sm:text-display lg:text-display font-display font-bold mb-6 text-[#0F172A]">
                Start with the level of workplace risk evidence{' '}
                <span className="text-brand">you need.</span>
              </h1>
              <p className="text-lead text-[#334155] max-w-2xl mx-auto mb-6">
                Team Signals begins with a structured onboarding scan, then continues as weekly
                team-level evidence. Leadership Signals adds a view across teams.
              </p>
              <p className="text-caption text-[#475569]">
                All plans use metadata only. No message content. No individual productivity scores.
              </p>
            </div>
          </div>
        </section>

        {/* Buyer Fit */}
        <section className="py-14 bg-white border-b border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.85fr_1.15fr] gap-8 items-start">
              <div>
                <p className="text-caption font-semibold text-brand uppercase tracking-wider mb-3">
                  Who this is for
                </p>
                <h2 className="text-section font-display font-bold text-[#0F172A] mb-4">
                  Best when health &amp; safety leaders have a concern that needs timely, objective
                  investigation.
                </h2>
                <p className="text-[#475569]">
                  SignalTrue is strongest for teams where meetings, management capacity, response
                  pressure and recovery conditions are changing before they show up in surveys or
                  turnover.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Health & Safety',
                    text: 'Prioritise psychosocial risk reviews and document preventive actions.',
                  },
                  {
                    title: 'Operational leaders',
                    text: 'See where work-design conditions may be creating sustained exposure.',
                  },
                  {
                    title: 'Managers and workers',
                    text: 'Use team-level evidence to discuss causes and agree practical controls.',
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-container border border-[#E2E8F0] p-5">
                    <h3 className="font-display font-bold text-[#0F172A] mb-2">{item.title}</h3>
                    <p className="text-caption text-[#475569]">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* First Month */}
        <section className="py-14 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <p className="text-caption font-semibold text-brand uppercase tracking-wider mb-3">
                  First 30 days
                </p>
                <h2 className="text-section font-display font-bold text-[#0F172A]">
                  What you get before deciding to scale.
                </h2>
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  'Connect metadata sources and define privacy boundaries.',
                  'Build team baselines for meetings, focus, response pressure, and recovery.',
                  'Review the first qualified risk evidence with workers and managers.',
                  'Assign one proportionate control and schedule its effectiveness review.',
                ].map((step, index) => (
                  <div
                    key={step}
                    className="rounded-container bg-white border border-[#E2E8F0] p-5"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-caption font-bold mb-4">
                      {index + 1}
                    </div>
                    <p className="text-caption text-[#334155]">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] bg-white py-10">
          <div className="container mx-auto px-6">
            <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-4">
              {[
                ['Billing unit', 'One organization workspace'],
                ['Subscription', 'Monthly; VAT excluded'],
                ['Baseline', 'Normally 3–4 qualified weeks'],
                ['Activation', 'Team scope and sources confirmed first'],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-container border border-[#E2E8F0] p-4">
                  <p className="text-caption font-bold uppercase tracking-wide text-[#64748B]">
                    {title}
                  </p>
                  <p className="mt-2 text-caption font-semibold text-[#0F172A]">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-20 lg:py-24 bg-[#F8FAFC]">
          <div className="container mx-auto px-6">
            <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
              {tiers.map((tier, index) => {
                const plan = tier.planKey || 'enterprise';
                const ctaLocation = `pricing_${plan}`;
                return (
                  <div
                    key={index}
                    className={`relative rounded-container p-8 animate-slide-up bg-white ${
                      tier.highlight
                        ? 'border-2 border-brand shadow-[0_20px_40px_rgba(15,23,42,0.08)]'
                        : 'border border-[#E2E8F0] shadow-[0_8px_24px_rgba(15,23,42,0.04)]'
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {tier.highlight && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="px-4 py-1.5 rounded-full bg-brand text-white text-caption font-medium">
                          Best starting point
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-lead font-display font-bold text-[#0F172A] mb-2">
                        {tier.name}
                      </h3>
                      <p className="text-body text-brand font-medium mb-2">{tier.outcome}</p>
                      <p className="text-caption text-[#475569]">{tier.description}</p>
                    </div>

                    <div className="mb-6">
                      <span className="text-display font-display font-bold text-[#0F172A]">
                        {tier.price}
                      </span>
                      <span className="text-[#475569]">{tier.period}</span>
                      <p className="mt-2 text-caption leading-5 text-[#64748B]">{tier.priceNote}</p>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-brand flex-shrink-0" />
                          <span className="text-caption text-[#334155]">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      asChild
                      variant={tier.highlight ? 'cta' : 'outline'}
                      className="w-full"
                      size="lg"
                    >
                      <PrimaryCommercialCTA
                        ctaLocation={ctaLocation}
                        queryParams={{ plan, intent: 'pricing' }}
                        onClick={() =>
                          trackFunnelEvent('pricing_plan_click', {
                            cta_location: ctaLocation,
                            plan,
                          })
                        }
                      >
                        {tier.cta}
                        {tier.highlight && <ArrowRight className="w-4 h-4 ml-2" />}
                      </PrimaryCommercialCTA>
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Free Diagnostic nudge */}
        <section className="py-10 bg-white border-t border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-6 p-6 rounded-container bg-brand-softer border border-brand-soft">
              <div className="flex-1 text-center sm:text-left">
                <p className="text-caption font-semibold text-brand uppercase tracking-wide mb-1">
                  Not sure yet?
                </p>
                <p className="text-[#0F172A] font-medium">Take the free diagnostic first.</p>
                <p className="text-caption text-[#334155] mt-1">
                  8 questions. 7 minutes. Get your organization's early pressure result before
                  choosing a plan.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-brand text-brand hover:bg-brand-soft whitespace-nowrap"
              >
                <Link to="/drift-diagnostic" className="flex-shrink-0">
                  Free diagnostic →
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Trust Strip */}
        <section className="py-16 bg-white border-y border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-soft border border-brand-soft mb-6">
                <Shield className="w-4 h-4 text-brand" />
                <span className="text-caption font-medium text-brand">
                  All plans are team-level by architecture
                </span>
              </div>
              <p className="text-[#475569]">
                No message content access. No individual scoring. Aggregated reports only. Your
                privacy rules apply.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing FAQ */}
        <section className="py-16 bg-white border-t border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <p className="text-caption font-semibold text-brand uppercase tracking-wider mb-3">
                  FAQ
                </p>
                <h2 className="text-section font-display font-bold text-[#0F172A]">
                  Common buying questions.
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {[
                  {
                    q: 'Do we need a long implementation?',
                    a: 'A scoped pilot normally needs 3–4 qualified weeks to establish a baseline. Setup time depends on source approval and team mapping.',
                  },
                  {
                    q: 'Will managers see individual employee scores?',
                    a: 'No. SignalTrue is built for team-level system pressure, not individual productivity scoring.',
                  },
                  {
                    q: 'Can we start with one team?',
                    a: 'Yes. Many organizations start with a high-pressure function, leadership layer, or pilot group.',
                  },
                  {
                    q: 'What makes this different from surveys?',
                    a: 'Surveys and worker consultation capture lived experience. SignalTrue adds continuous evidence about changing work conditions between reviews.',
                  },
                ].map((item) => (
                  <div key={item.q} className="rounded-container border border-[#E2E8F0] p-6">
                    <h3 className="font-display font-bold text-[#0F172A] mb-2">{item.q}</h3>
                    <p className="text-caption text-[#475569]">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-[#F8FAFC]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-section sm:text-display font-display font-bold mb-6 text-[#0F172A]">
                Not sure which plan fits?
              </h2>
              <p className="text-body text-[#334155] mb-8 max-w-xl mx-auto">
                Start with a workload scan. See where pressure is building, then decide whether
                SignalTrue should stay on continuously.
              </p>
              <Button asChild variant="hero" size="xl">
                <PrimaryCommercialCTA ctaLocation="pricing_final">
                  Book a 20-minute visibility review
                  <ArrowRight className="w-5 h-5" />
                </PrimaryCommercialCTA>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
