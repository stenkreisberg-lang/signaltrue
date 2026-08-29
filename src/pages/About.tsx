import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity, Shield, Eye } from 'lucide-react';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 *
 * About Page (per spec):
 * Purpose: Credibility + philosophical alignment.
 *
 * Opening: Why SignalTrue Exists
 * Copy: Burnout is not a motivation problem. It's a system problem that goes unseen for too long.
 *
 * Belief System:
 * - Signals beat surveys
 * - Systems shape behavior
 * - Early truth enables better leadership
 *
 * Founding Insight: Explain why existing tools fail leaders.
 * No bios first. Belief first.
 */

// Analytics tracking
const trackEvent = (eventName: string) => {
  if (
    typeof window !== 'undefined' &&
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  ) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', eventName);
  }
};

// Belief system per spec - 5 beliefs
const beliefs = [
  {
    icon: Activity,
    title: 'Work design changes before harm becomes visible.',
    description:
      'Before absence, ill health or disruption, demands rise, control reduces and recovery opportunities can shrink.',
  },
  {
    icon: Eye,
    title: 'Managers need protection too.',
    description:
      'Managers often absorb competing demands, unclear decisions and worker concerns. Their capacity is a work-design issue, not a personal weakness.',
  },
  {
    icon: Shield,
    title: 'Consultation needs timely evidence.',
    description:
      'Surveys and conversations remain essential. SignalTrue helps health & safety leaders decide where and when to investigate.',
  },
  {
    icon: Shield,
    title: 'Privacy must be designed, not promised.',
    description:
      'A company should not need to trust managers not to misuse data. The product should prevent misuse by design.',
  },
  {
    icon: Activity,
    title: 'Prevention means changing the work.',
    description:
      'A signal should lead to questions about demands, control, support, relationships, role and change—not questions about individual productivity.',
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-white">
      <PageMeta
        title="About SignalTrue | Prevention, Not Surveillance"
        description="SignalTrue helps leaders see system pressure early with team-level metadata signals, not surveys, message reading, or individual productivity scoring."
        path="/about"
      />
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-white border-b border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
              <div>
                <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-4">
                  Why SignalTrue Exists
                </p>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6 text-[#0F172A]">
                  Safer work starts before harm becomes visible.{' '}
                  <span className="text-brand">
                    It starts with better evidence about how work is designed.
                  </span>
                </h1>
                <p className="text-lg text-[#334155] max-w-xl mx-auto">
                  SignalTrue helps workplace health &amp; safety leaders observe changing
                  psychosocial risk conditions, consult workers and review preventive controls
                  earlier.
                </p>
              </div>
              <img
                src="/images/hero-team.jpg"
                alt="Colleagues discussing work design and workplace risk controls"
                className="h-full max-h-[430px] w-full rounded-3xl object-cover shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
              />
            </div>
          </div>
        </section>

        {/* Founding Insight Section */}
        <section className="py-20 lg:py-24 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-4">
                Product rationale
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-8 text-[#0F172A]">
                Lagging outcomes are not enough for prevention.
              </h2>
              <div className="space-y-6 text-lg text-[#334155]">
                <p>Worker surveys and consultation explain lived experience.</p>
                <p>Absence, incidents and turnover show outcomes that require investigation.</p>
                <p>Operational dashboards show whether delivery has already been affected.</p>
                <p>
                  All are useful. SignalTrue adds earlier, continuous evidence about changing work
                  conditions.
                </p>
                <p className="text-[#0F172A] font-medium border-l-4 border-brand pl-6 bg-[#EFF6FF] py-4 pr-4 rounded-r-xl">
                  The purpose is to target consultation and preventive action—not infer health
                  status or replace a formal risk assessment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Belief System Section */}
        <section className="py-20 lg:py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-4">
                Design principles
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#0F172A]">
                What we believe
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {beliefs.map((belief, index) => (
                <div
                  key={index}
                  className="p-8 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] mb-6 flex items-center justify-center">
                    <belief.icon className="w-7 h-7 text-brand" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-[#0F172A] mb-4">
                    {belief.title}
                  </h3>
                  <p className="text-[#475569]">{belief.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#E2E8F0] bg-[#F8FAFC] py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-10 max-w-3xl">
                <p className="mb-3 text-sm font-bold uppercase tracking-wider text-brand">
                  Evidence before claims
                </p>
                <h2 className="text-3xl font-bold text-[#0F172A]">
                  What a buyer can verify before deciding
                </h2>
                <p className="mt-3 text-[#475569]">
                  Credibility should come from inspectable method, boundaries and delivery
                  commitments—not invented social proof.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                {[
                  [
                    'Complete sample',
                    'Inspect the evidence, confidence, consultation and control record before a demo.',
                    '/sample-report',
                  ],
                  [
                    'Responsible-use method',
                    'Review the privacy floor, limitations and governance record.',
                    '/trust',
                  ],
                  [
                    'Client success process',
                    'See owners, phases, deliverables and pilot success measures.',
                    '/client-success',
                  ],
                  [
                    'Commercial scope',
                    'Compare the billing unit, baseline period and activation conditions.',
                    '/pricing',
                  ],
                ].map(([title, copy, href]) => (
                  <Link
                    key={title}
                    to={href}
                    className="rounded-2xl border border-[#E2E8F0] bg-white p-5 hover:border-brand"
                  >
                    <h3 className="font-bold text-[#0F172A]">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#475569]">{copy}</p>
                    <span className="mt-4 inline-flex text-sm font-bold text-brand">Review →</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Ethics / Dark Island Section */}
        <section className="py-20 lg:py-24 bg-[#0F172A]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6 text-white">
                Designed for responsible workplace risk management.
              </h2>
              <p className="text-[#CBD5E1] text-lg mb-6">
                Use team-level evidence to investigate demands, control and recovery conditions.
                Never use a score as proof of cause or as an individual performance measure.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 mt-8">
                {['No individual scoring', 'No employee ranking', 'System-level signals only'].map(
                  (item) => (
                    <div
                      key={item}
                      className="px-4 py-3 rounded-xl bg-[#1E293B] border border-[#334155]"
                    >
                      <span className="text-[#CBD5E1] text-sm font-medium">{item}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-[#F8FAFC]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6 text-[#0F172A]">
                See the complete evidence-to-action process.
              </h2>
              <p className="text-lg text-[#334155] mb-8 max-w-xl mx-auto">
                Explore a fictional report showing the baseline, confidence, consultation prompts,
                corrective action owner and 14-day review.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild variant="hero-outline" size="xl">
                  <Link to="/sample-report">View sample report</Link>
                </Button>
                <Button asChild variant="hero" size="xl">
                  <Link to="/contact" onClick={() => trackEvent('demo_cta_click')}>
                    Request a risk review
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
