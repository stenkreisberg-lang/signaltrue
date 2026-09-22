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
    value:
      'Qualified work-condition evidence, explicit limitations and a controlled evidence register.',
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
        title="SignalTrue Product | Psychosocial Risk & Control Assurance"
        description="See how SignalTrue continuously observes team-level work conditions and helps Health & Safety teams verify whether organisational controls changed the work."
        path="/product"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-4xl text-center">
              <p className="mb-4 text-caption font-bold uppercase tracking-wider text-brand">
                Product
              </p>
              <h1 className="text-display font-bold tracking-tight text-[#0F172A] sm:text-display lg:text-display">
                Observe changing work patterns. Record the control. Verify what changed.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-lead leading-8 text-[#475569]">
                SignalTrue turns privacy-conscious team metadata into control-review evidence. Start
                with a defined change, compare relevant work patterns before and after it, test
                persistence and possible migration, validate the interpretation with people, then
                record the review decision.
              </p>
              <p className="mt-4 text-caption font-semibold text-[#475569]">
                Team-level only · No message content · No individual productivity scores · No
                surveys required · No diagnosis
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <PrimaryCommercialCTA
                  ctaLocation="product_hero"
                  className="inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-6 py-3 text-center font-bold text-white hover:bg-brand-hover"
                >
                  Review one control <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                </PrimaryCommercialCTA>
                <SampleReportCTA
                  ctaLocation="product_hero"
                  className="inline-flex min-h-12 items-center justify-center rounded-control border border-[#CBD5E1] bg-white px-6 py-3 font-bold text-[#0F172A] hover:border-brand"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-10 max-w-3xl">
                <p className="mb-3 text-caption font-bold uppercase tracking-wider text-brand">
                  The evidence method
                </p>
                <h2 className="text-section font-bold text-[#0F172A]">
                  Observe work conditions without scoring people
                </h2>
                <p className="mt-3 text-[#475569]">
                  Relevant indicators are selected because they connect to the control being
                  reviewed. Each is compared with a qualified team baseline. A change is an
                  observation to investigate, not a diagnosis, causal conclusion or individual
                  score.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {indicators.map(([title, copy, Icon]) => (
                  <article
                    key={title}
                    className="rounded-container border border-[#E2E8F0] bg-white p-6"
                  >
                    <Icon className="h-6 w-6 text-brand" aria-hidden="true" />
                    <h3 className="mt-4 text-body font-bold text-[#0F172A]">{title}</h3>
                    <p className="mt-2 text-caption leading-6 text-[#475569]">{copy}</p>
                  </article>
                ))}
              </div>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <PrimaryCommercialCTA
                  ctaLocation="product_problem"
                  className="inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-6 py-3 text-center font-bold text-white hover:bg-brand-hover"
                />
                <SampleReportCTA
                  ctaLocation="product_problem"
                  className="inline-flex min-h-12 items-center justify-center rounded-control border border-[#CBD5E1] bg-white px-6 py-3 font-bold text-[#0F172A] hover:border-brand"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-10 text-center">
                <p className="mb-3 text-caption font-bold uppercase tracking-wider text-brand">
                  From evidence to accountable decisions
                </p>
                <h2 className="text-section font-bold text-[#0F172A]">
                  Different roles see the decision they need, not an employee score
                </h2>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {decisionViews.map((view) => (
                  <article
                    key={view.audience}
                    className="rounded-container border border-[#E2E8F0] p-6"
                  >
                    <p className="text-caption font-bold text-brand">{view.audience}</p>
                    <h3 className="mt-3 text-lead font-bold text-[#0F172A]">{view.question}</h3>
                    <p className="mt-3 text-caption leading-6 text-[#475569]">{view.value}</p>
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
                <p className="text-caption font-bold uppercase tracking-wider text-[#93C5FD]">
                  Complete sample report
                </p>
                <h2 className="mt-3 text-section font-bold">
                  Inspect the complete evidence-to-action record.
                </h2>
                <p className="mt-4 max-w-2xl leading-7 text-[#CBD5E1]">
                  See current values, baseline, persistence, data quality, control ownership, review
                  timing, sustainability and privacy boundaries in one fictional example.
                </p>
                <Button asChild className="mt-7 bg-white text-[#0F172A] hover:bg-[#E2E8F0]">
                  <SampleReportCTA ctaLocation="product_sample">
                    Open the sample report <ArrowRight className="ml-2 h-4 w-4" />
                  </SampleReportCTA>
                </Button>
              </div>
              <div className="rounded-container border border-[#334155] bg-[#1E293B] p-6">
                {[
                  'Measured evidence stays separate from interpretation.',
                  'The organisation records the control decision; SignalTrue does not require surveys or interviews.',
                  'Every control has an owner and review date.',
                  'Executives see decisions and barriers; not individual data.',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 border-b border-[#334155] py-3 last:border-0"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-[#34D399]"
                      aria-hidden="true"
                    />
                    <span className="text-caption leading-6 text-[#E2E8F0]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 text-center">
          <div className="container mx-auto px-6">
            <h2 className="text-section font-bold text-[#0F172A]">
              See whether the method fits one real control.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[#475569]">
              Bring one control your organisation has implemented. We will map the intended work
              change, the evidence that could test it, the worker-validation step and the decision
              the review needs to support.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <PrimaryCommercialCTA
                ctaLocation="product_final"
                className="inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-6 py-3 text-center font-bold text-white hover:bg-brand-hover"
              />
              <SampleReportCTA
                ctaLocation="product_final"
                className="inline-flex min-h-12 items-center justify-center rounded-control border border-[#CBD5E1] bg-white px-6 py-3 font-bold text-[#0F172A] hover:border-brand"
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
