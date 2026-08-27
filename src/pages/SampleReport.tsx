import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';
import { PrimaryCommercialCTA } from '../components/CommercialCTA';
import { trackFunnelEvent } from '../lib/analytics';

const signals = [
  {
    factor: 'Demands',
    indicator: 'Meeting demand',
    current: '18.4h/week',
    baseline: '14.9h/week',
    change: '+23%',
    confidence: 'High',
    interpretation: 'Usable work time has reduced for three consecutive weeks.',
  },
  {
    factor: 'Recovery',
    indicator: 'After-hours activity',
    current: '12.8%',
    baseline: '7.6%',
    change: '+5.2 pts',
    confidence: 'Moderate',
    interpretation: 'Work outside normal hours is above the team baseline.',
  },
  {
    factor: 'Control',
    indicator: 'Protected focus time',
    current: '6.1h/week',
    baseline: '8.7h/week',
    change: '-30%',
    confidence: 'High',
    interpretation: 'Fewer uninterrupted windows are available for planned work.',
  },
];

const steps = [
  [
    'Verify',
    'Discuss the pattern with the affected team and check deadline, staffing and meeting context.',
  ],
  [
    'Control',
    'Trial two protected focus blocks and remove one recurring status meeting for 14 days.',
  ],
  ['Own', 'Health & Safety Manager coordinates; Product Director owns implementation.'],
  ['Review', 'Re-measure meeting demand, focus time and after-hours activity on 3 June.'],
];

export default function SampleReport() {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackFunnelEvent('sample_report_view', { cta_location: 'sample_report_page' });
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <style>{`
        @media print {
          nav, footer, .sample-report-no-print { display: none !important; }
          main { padding-top: 0 !important; }
          #report { padding: 0 !important; }
          #report article { padding: 0 !important; }
          #report article > div { border: 0 !important; box-shadow: none !important; }
        }
      `}</style>
      <PageMeta
        title="Sample Psychosocial Risk Review | SignalTrue"
        description="Explore a complete SignalTrue team-level workplace risk report with evidence, confidence, consultation prompts and corrective actions."
        path="/sample-report"
      />
      <Navbar />
      <main className="pt-20">
        <section className="sample-report-no-print border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-5xl">
              <p className="mb-4 text-sm font-bold uppercase tracking-wider text-[#1D4ED8]">
                Complete sample report
              </p>
              <h1 className="max-w-4xl text-4xl font-bold leading-tight text-[#0F172A] sm:text-5xl lg:text-6xl">
                From an early indicator to a reviewed preventive action.
              </h1>
              <p className="mt-6 max-w-3xl text-xl leading-8 text-[#475569]">
                This fictional example shows what a health &amp; safety manager receives after team
                coverage and baseline requirements are met. It is evidence for investigation—not a
                diagnosis or a substitute for worker consultation.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PrimaryCommercialCTA
                  ctaLocation="sample_report_hero"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-6 py-3 font-bold text-white hover:bg-[#1E40AF]"
                >
                  Request a 20-minute psychosocial risk visibility review{' '}
                  <ArrowRight className="h-5 w-5" />
                </PrimaryCommercialCTA>
                <a
                  href="#report"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-6 py-3 font-bold text-[#0F172A] hover:border-[#1D4ED8]"
                >
                  Read the sample
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-6 py-3 font-bold text-[#0F172A] hover:border-[#1D4ED8]"
                >
                  <Printer className="h-4 w-4" aria-hidden="true" /> Print or save PDF
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="report" className="py-12 lg:py-16">
          <article className="container mx-auto px-6">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-[#CBD5E1] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <header className="border-b border-[#E2E8F0] bg-[#0F172A] p-7 text-white lg:p-10">
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#93C5FD]">
                      Team workplace risk review
                    </p>
                    <h2 className="mt-3 text-3xl font-bold">Product &amp; Engineering</h2>
                    <p className="mt-2 text-[#CBD5E1]">
                      Review period: 6–19 May · Baseline: previous 6 qualified weeks
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-200">
                      Review priority
                    </p>
                    <p className="mt-1 text-xl font-bold">Action recommended</p>
                  </div>
                </div>
              </header>

              <div className="space-y-10 p-7 lg:p-10">
                <section>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">
                    Executive summary
                  </p>
                  <h2 className="mt-3 text-2xl font-bold text-[#0F172A]">
                    Demand is rising while control and recovery opportunities are reducing.
                  </h2>
                  <p className="mt-4 max-w-4xl leading-7 text-[#475569]">
                    Three independent team-level indicators have moved away from the team baseline
                    for at least two qualified periods. The pattern is sufficient to prioritise a
                    conversation about workload, deadlines, meeting design and staffing. It does not
                    establish that any worker is experiencing ill health.
                  </p>
                </section>

                <section aria-labelledby="signal-table-title">
                  <div className="mb-5 flex items-center gap-3">
                    <Database className="h-6 w-6 text-[#1D4ED8]" />
                    <h2 id="signal-table-title" className="text-2xl font-bold text-[#0F172A]">
                      Evidence reviewed
                    </h2>
                  </div>
                  <div className="hidden overflow-x-auto rounded-2xl border border-[#E2E8F0] md:block">
                    <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                      <thead className="bg-[#F1F5F9] text-[#334155]">
                        <tr>
                          {[
                            'Risk factor',
                            'Indicator',
                            'Current',
                            'Baseline',
                            'Change',
                            'Confidence',
                            'What it may mean',
                          ].map((heading) => (
                            <th key={heading} className="px-4 py-3 font-bold">
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {signals.map((signal) => (
                          <tr
                            key={signal.indicator}
                            className="border-t border-[#E2E8F0] align-top"
                          >
                            <td className="px-4 py-4 font-bold text-[#1D4ED8]">{signal.factor}</td>
                            <td className="px-4 py-4 font-semibold text-[#0F172A]">
                              {signal.indicator}
                            </td>
                            <td className="px-4 py-4">{signal.current}</td>
                            <td className="px-4 py-4">{signal.baseline}</td>
                            <td className="px-4 py-4 font-bold text-[#B45309]">{signal.change}</td>
                            <td className="px-4 py-4">{signal.confidence}</td>
                            <td className="max-w-xs px-4 py-4 text-[#475569]">
                              {signal.interpretation}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="grid gap-4 md:hidden">
                    {signals.map((signal) => (
                      <article
                        key={signal.indicator}
                        className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-[#1D4ED8]">
                              {signal.factor}
                            </p>
                            <h3 className="mt-1 font-bold text-[#0F172A]">{signal.indicator}</h3>
                          </div>
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                            {signal.change}
                          </span>
                        </div>
                        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <dt className="text-xs text-[#64748B]">Current</dt>
                            <dd className="mt-1 font-bold">{signal.current}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-[#64748B]">Baseline</dt>
                            <dd className="mt-1 font-bold">{signal.baseline}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-[#64748B]">Confidence</dt>
                            <dd className="mt-1 font-bold">{signal.confidence}</dd>
                          </div>
                        </dl>
                        <p className="mt-4 text-sm leading-6 text-[#475569]">
                          {signal.interpretation}
                        </p>
                      </article>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#64748B]">
                    Confidence reflects coverage, baseline maturity and consistency across qualified
                    periods. It does not express certainty about cause.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-[#0F172A]">Action record and sign-off</h2>
                  <div className="mt-5 grid gap-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ['Risk process owner', 'Health & Safety Manager'],
                      ['Operational owner', 'Product Director'],
                      ['Consultation', 'Completed 21 May'],
                      ['Control status', 'Active · review due 3 June'],
                      ['Worker feedback', 'Review scheduled'],
                      ['Executive barrier', 'No additional budget required'],
                      ['Effectiveness decision', 'Pending review evidence'],
                      ['Sign-off', 'H&S and operational owner'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                          {label}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#0F172A]">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-5 flex items-center gap-3">
                    <ClipboardCheck className="h-6 w-6 text-[#047857]" />
                    <h2 className="text-2xl font-bold text-[#0F172A]">Control and review plan</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {steps.map(([title, copy], index) => (
                      <div
                        key={title}
                        className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D4ED8] text-sm font-bold text-white">
                            {index + 1}
                          </span>
                          <h3 className="font-bold text-[#0F172A]">{title}</h3>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[#475569]">{copy}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-6">
                    <h2 className="font-bold text-[#1E3A8A]">Worker consultation prompts</h2>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-[#334155]">
                      {[
                        'What changed in the last three weeks?',
                        'Which meetings or deadlines create avoidable demand?',
                        'Where do people lack control over priorities or response times?',
                        'What is one low-risk change the team wants to test?',
                      ].map((item) => (
                        <li key={item} className="flex gap-2">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#1D4ED8]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] p-6">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-[#047857]" />
                      <h2 className="font-bold text-[#064E3B]">Data and use boundaries</h2>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-[#334155]">
                      Timing, duration, counts and mapped team membership contribute to this view.
                      Message text, email bodies, recordings and individual productivity scores do
                      not. Results below the minimum group threshold are suppressed.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </article>
        </section>
      </main>
      <Footer />
    </div>
  );
}
