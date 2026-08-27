import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gauge,
  Moon,
  Network,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';
import { PrimaryCommercialCTA, SampleReportCTA } from '../components/CommercialCTA';

const indicators = [
  [
    'Manager capacity',
    'Coordination and decision demand compared with usable management capacity.',
    Users,
  ],
  [
    'Meeting demand',
    'Recurring and dense meeting patterns that reduce time available for planned work.',
    Clock3,
  ],
  [
    'Work fragmentation',
    'Shrinking uninterrupted work windows and increasing task switching.',
    Network,
  ],
  [
    'Response pressure',
    'Changing response intervals and urgent communication patterns at team level.',
    Gauge,
  ],
  [
    'Recovery opportunity',
    'Repeated work outside normal hours and high-demand periods without recovery.',
    Moon,
  ],
  [
    'Combined exposure',
    'Several qualified work-design indicators changing together over time.',
    ShieldCheck,
  ],
] as const;

const decisionViews = [
  {
    audience: 'Health & Safety',
    question: 'Where should we investigate first?',
    value: 'Qualified evidence, worker consultation prompts and a controlled evidence register.',
  },
  {
    audience: 'Operational owner',
    question: 'What work condition can we change?',
    value: 'A proportionate action, named owner, expected effect and review date.',
  },
  {
    audience: 'CEO and executive team',
    question: 'What decision or barrier needs leadership?',
    value: 'Exposure direction, evidence confidence, controls due and measured effectiveness.',
  },
];

export default function Product() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="SignalTrue Product | Psychosocial Risk Evidence and Action Reviews"
        description="See how SignalTrue helps Health & Safety teams qualify work-design evidence, consult workers, assign preventive controls and review effectiveness."
        path="/product"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-4xl text-center">
              <p className="mb-4 text-sm font-bold uppercase tracking-wider text-[#1D4ED8]">
                Product
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] sm:text-5xl lg:text-6xl">
                Qualify changing work-design risks. Act with workers. Review what improved.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-xl leading-8 text-[#475569]">
                SignalTrue turns privacy-safe team metadata into an evidence-led psychosocial risk
                workflow—from baseline and confidence through consultation, control ownership and
                effectiveness review.
              </p>
              <p className="mt-4 text-sm font-semibold text-[#475569]">
                Team-level only · No message content · No individual productivity scores · No
                diagnosis
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <PrimaryCommercialCTA
                  ctaLocation="product_hero"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1D4ED8] px-6 py-3 text-center font-bold text-white hover:bg-[#1E40AF]"
                >
                  Request a 20-minute psychosocial risk visibility review{' '}
                  <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                </PrimaryCommercialCTA>
                <SampleReportCTA
                  ctaLocation="product_hero"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-6 py-3 font-bold text-[#0F172A] hover:border-[#1D4ED8]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-10 max-w-3xl">
                <p className="mb-3 text-sm font-bold uppercase tracking-wider text-[#1D4ED8]">
                  Evidence for investigation
                </p>
                <h2 className="text-3xl font-bold text-[#0F172A]">
                  Six team-level indicator families
                </h2>
                <p className="mt-3 text-[#475569]">
                  Each indicator is compared with the team’s own qualified baseline. A change starts
                  a review; it does not establish cause or worker health.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {indicators.map(([title, copy, Icon]) => (
                  <article key={title} className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
                    <Icon className="h-6 w-6 text-[#1D4ED8]" aria-hidden="true" />
                    <h3 className="mt-4 text-lg font-bold text-[#0F172A]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#475569]">{copy}</p>
                  </article>
                ))}
              </div>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <PrimaryCommercialCTA
                  ctaLocation="product_problem"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1D4ED8] px-6 py-3 text-center font-bold text-white hover:bg-[#1E40AF]"
                />
                <SampleReportCTA
                  ctaLocation="product_problem"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-6 py-3 font-bold text-[#0F172A] hover:border-[#1D4ED8]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-10 text-center">
                <p className="mb-3 text-sm font-bold uppercase tracking-wider text-[#1D4ED8]">
                  One evidence base, three decisions
                </p>
                <h2 className="text-3xl font-bold text-[#0F172A]">
                  Useful at every level without becoming an employee score
                </h2>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {decisionViews.map((view) => (
                  <article key={view.audience} className="rounded-2xl border border-[#E2E8F0] p-6">
                    <p className="text-sm font-bold text-[#1D4ED8]">{view.audience}</p>
                    <h3 className="mt-3 text-xl font-bold text-[#0F172A]">{view.question}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#475569]">{view.value}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#0F172A] py-16 text-white lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-[#93C5FD]">
                  Complete sample report
                </p>
                <h2 className="mt-3 text-3xl font-bold">
                  Inspect the complete evidence-to-action record.
                </h2>
                <p className="mt-4 max-w-2xl leading-7 text-[#CBD5E1]">
                  See current values, baseline, change, confidence, consultation questions, control
                  ownership, review timing and privacy boundaries in one fictional example.
                </p>
                <Button asChild className="mt-7 bg-white text-[#0F172A] hover:bg-[#E2E8F0]">
                  <SampleReportCTA ctaLocation="product_sample">
                    Open the sample report <ArrowRight className="ml-2 h-4 w-4" />
                  </SampleReportCTA>
                </Button>
              </div>
              <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6">
                {[
                  'Measured evidence stays separate from interpretation.',
                  'Worker consultation is recorded before a control decision.',
                  'Every control has an owner and review date.',
                  'Executives see decisions and barriers—not individual data.',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 border-b border-[#334155] py-3 last:border-0"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-[#34D399]"
                      aria-hidden="true"
                    />
                    <span className="text-sm leading-6 text-[#E2E8F0]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 text-center">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-[#0F172A]">
              See whether continuous visibility fits your risk process.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[#475569]">
              Bring one current gap. We will review the evidence boundaries and whether a controlled
              pilot is justified.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <PrimaryCommercialCTA
                ctaLocation="product_final"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1D4ED8] px-6 py-3 text-center font-bold text-white hover:bg-[#1E40AF]"
              />
              <SampleReportCTA
                ctaLocation="product_final"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-6 py-3 font-bold text-[#0F172A] hover:border-[#1D4ED8]"
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
