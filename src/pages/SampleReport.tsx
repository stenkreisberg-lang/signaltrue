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
    evidenceQuality: 'Persistent 3 weeks · data quality good',
    interpretation: 'Usable work time has reduced for three consecutive weeks.',
  },
  {
    factor: 'Recovery',
    indicator: 'After-hours activity',
    current: '12.8%',
    baseline: '7.6%',
    change: '+5.2 pts',
    evidenceQuality: 'Persistent 2 weeks · data quality adequate',
    interpretation: 'Work outside normal hours is above the team baseline.',
  },
  {
    factor: 'Control',
    indicator: 'Protected uninterrupted calendar availability',
    current: '6.1h/week',
    baseline: '8.7h/week',
    change: '-30%',
    evidenceQuality: 'Persistent 3 weeks · data quality good',
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
  [
    'Review',
    'Re-measure meeting demand, uninterrupted calendar availability and after-hours activity on 3 June.',
  ],
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
        description="Explore a complete SignalTrue team-level workplace risk report with persistence, data quality, consultation prompts and corrective actions."
        path="/sample-report"
      />
      <Navbar />
      <main className="pt-20">
        <section className="sample-report-no-print border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-5xl">
              <p className="mb-4 text-caption font-bold uppercase tracking-wider text-brand">
                Complete sample report
              </p>
              <h1 className="max-w-4xl text-display font-bold leading-tight text-[#0F172A] sm:text-display lg:text-display">
                From an early indicator to a reviewed preventive action.
              </h1>
              <p className="mt-6 max-w-3xl text-lead leading-8 text-[#475569]">
                This fictional example shows what a health &amp; safety manager receives after team
                coverage and baseline requirements are met. It is evidence for investigation—not a
                diagnosis or a substitute for worker consultation.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PrimaryCommercialCTA
                  ctaLocation="sample_report_hero"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-6 py-3 font-bold text-white hover:bg-brand-hover"
                >
                  Request a 20-minute psychosocial risk visibility review{' '}
                  <ArrowRight className="h-5 w-5" />
                </PrimaryCommercialCTA>
                <a
                  href="#report"
                  className="inline-flex min-h-12 items-center justify-center rounded-control border border-[#CBD5E1] bg-white px-6 py-3 font-bold text-[#0F172A] hover:border-brand"
                >
                  Read the sample
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-[#CBD5E1] bg-white px-6 py-3 font-bold text-[#0F172A] hover:border-brand"
                >
                  <Printer className="h-4 w-4" aria-hidden="true" /> Print or save PDF
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="report" className="py-12 lg:py-16">
          <article className="container mx-auto px-6">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-container border border-[#CBD5E1] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <header className="border-b border-[#E2E8F0] bg-[#0F172A] p-7 text-white lg:p-10">
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                  <div>
                    <p className="text-caption font-bold uppercase tracking-[0.18em] text-[#93C5FD]">
                      Team workplace risk review
                    </p>
                    <h2 className="mt-3 text-section font-bold">Product &amp; Engineering</h2>
                    <p className="mt-2 text-[#CBD5E1]">
                      Review period: 6–19 May · Baseline: previous 6 qualified weeks
                    </p>
                  </div>
                  <div className="rounded-container border border-amber-300/30 bg-amber-300/10 px-5 py-4">
                    <p className="text-caption font-bold uppercase tracking-wide text-amber-200">
                      Review priority
                    </p>
                    <p className="mt-1 text-lead font-bold">Action recommended</p>
                  </div>
                </div>
              </header>

              <div className="space-y-10 p-7 lg:p-10">
                <section>
                  <p className="text-caption font-bold uppercase tracking-[0.16em] text-brand">
                    Executive summary
                  </p>
                  <h2 className="mt-3 text-lead font-bold text-[#0F172A]">
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
                    <Database className="h-6 w-6 text-brand" />
                    <h2 id="signal-table-title" className="text-lead font-bold text-[#0F172A]">
                      Evidence reviewed
                    </h2>
                  </div>
                  <div className="hidden overflow-x-auto rounded-container border border-[#E2E8F0] md:block">
                    <table className="w-full min-w-[860px] border-collapse text-left text-caption">
                      <thead className="bg-[#F1F5F9] text-[#334155]">
                        <tr>
                          {[
                            'Risk factor',
                            'Indicator',
                            'Current',
                            'Baseline',
                            'Change',
                            'Persistence and data quality',
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
                            <td className="px-4 py-4 font-bold text-brand">{signal.factor}</td>
                            <td className="px-4 py-4 font-semibold text-[#0F172A]">
                              {signal.indicator}
                            </td>
                            <td className="px-4 py-4">{signal.current}</td>
                            <td className="px-4 py-4">{signal.baseline}</td>
                            <td className="px-4 py-4 font-bold text-[#B45309]">{signal.change}</td>
                            <td className="px-4 py-4">{signal.evidenceQuality}</td>
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
                        className="rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-caption font-bold uppercase tracking-wide text-brand">
                              {signal.factor}
                            </p>
                            <h3 className="mt-1 font-bold text-[#0F172A]">{signal.indicator}</h3>
                          </div>
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-caption font-bold text-amber-800">
                            {signal.change}
                          </span>
                        </div>
                        <dl className="mt-4 grid grid-cols-3 gap-3 text-caption">
                          <div>
                            <dt className="text-caption text-[#64748B]">Current</dt>
                            <dd className="mt-1 font-bold">{signal.current}</dd>
                          </div>
                          <div>
                            <dt className="text-caption text-[#64748B]">Baseline</dt>
                            <dd className="mt-1 font-bold">{signal.baseline}</dd>
                          </div>
                          <div>
                            <dt className="text-caption text-[#64748B]">Evidence quality</dt>
                            <dd className="mt-1 font-bold">{signal.evidenceQuality}</dd>
                          </div>
                        </dl>
                        <p className="mt-4 text-caption leading-6 text-[#475569]">
                          {signal.interpretation}
                        </p>
                      </article>
                    ))}
                  </div>
                  <p className="mt-3 text-caption leading-5 text-[#64748B]">
                    Data quality reflects coverage and baseline maturity. Persistence shows how many
                    qualified periods the change continued. Neither establishes cause.
                  </p>
                </section>

                <section>
                  <h2 className="text-lead font-bold text-[#0F172A]">Action record and sign-off</h2>
                  <div className="mt-5 grid gap-4 rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:grid-cols-2 lg:grid-cols-4">
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
                        <p className="text-caption font-bold uppercase tracking-wide text-[#64748B]">
                          {label}
                        </p>
                        <p className="mt-2 text-caption font-semibold text-[#0F172A]">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-5 flex items-center gap-3">
                    <ClipboardCheck className="h-6 w-6 text-brand" />
                    <h2 className="text-lead font-bold text-[#0F172A]">Control and review plan</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {steps.map(([title, copy], index) => (
                      <div
                        key={title}
                        className="rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-5"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-caption font-bold text-white">
                            {index + 1}
                          </span>
                          <h3 className="font-bold text-[#0F172A]">{title}</h3>
                        </div>
                        <p className="mt-3 text-caption leading-6 text-[#475569]">{copy}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-container border border-[#BFDBFE] bg-[#EFF6FF] p-6">
                    <h2 className="font-bold text-brand-hover">Worker consultation prompts</h2>
                    <ul className="mt-4 space-y-3 text-caption leading-6 text-[#334155]">
                      {[
                        'What changed in the last three weeks?',
                        'Which meetings or deadlines create avoidable demand?',
                        'Where do people lack control over priorities or response times?',
                        'What is one low-risk change the team wants to test?',
                      ].map((item) => (
                        <li key={item} className="flex gap-2">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-container border border-brand-soft bg-brand-softer p-6">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-brand" />
                      <h2 className="font-bold text-brand-hover">Data and use boundaries</h2>
                    </div>
                    <p className="mt-4 text-caption leading-6 text-[#334155]">
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
