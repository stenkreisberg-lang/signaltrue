import { ArrowRight, CheckCircle2, Printer } from 'lucide-react';
import { useEffect, useRef } from 'react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';
import { PrimaryCommercialCTA } from '../components/CommercialCTA';
import { trackFunnelEvent } from '../lib/analytics';

const evidenceRows = [
  ['Meeting hours / week', '13.2 h', '9.4 h', '9.8 h', '-26% sustained'],
  ['Protected focus availability', '8.1 h', '10.7 h', '10.4 h', '+28% sustained'],
  ['After-hours activity', '18%', '13%', '17%', 'Initial improvement faded'],
  ['Chat coordination volume', 'Baseline', '+24%', '+31%', 'Possible demand migration'],
];

const consultation = [
  'Workers reported fewer recurring interruptions after meeting changes.',
  'Most workers did not report a meaningful reduction in total workload.',
  'Late customer handovers were still identified as a source of after-hours work.',
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
        }
      `}</style>
      <PageMeta
        title="Sample Psychosocial Control Review | SignalTrue"
        description="A clearly labelled fictional example of the report a WHS team can receive after reviewing one psychosocial control with baseline, post-control, sustainability, worker evidence and a decision."
        path="/sample-report"
      />
      <Navbar />
      <main className="pt-20">
        <section className="sample-report-no-print border-b border-[#E2E8F0] bg-white py-14 lg:py-16">
          <div className="container mx-auto max-w-5xl px-6">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">
              Fictional example
            </p>
            <h1 className="mt-4 max-w-4xl text-display font-bold text-[#0F172A]">
              This is the control-review report SignalTrue is designed to produce.
            </h1>
            <p className="mt-5 max-w-3xl text-lead leading-8 text-[#475569]">
              The organisation, team, intervention and numbers below are fictional. The structure
              shows how one psychosocial control can be reviewed from intended outcome through
              baseline, after-period, sustainability, possible workload migration, worker evidence
              and a human decision.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <PrimaryCommercialCTA
                ctaLocation="sample_report_hero"
                className="inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-6 py-3 font-bold text-white hover:bg-brand-hover"
              >
                Start the AU$99 founding review <ArrowRight className="ml-2 h-4 w-4" />
              </PrimaryCommercialCTA>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-12 items-center justify-center rounded-control border border-[#CBD5E1] bg-white px-6 py-3 font-bold text-[#0F172A]"
              >
                Print sample <Printer className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section id="report" className="py-12 lg:py-16">
          <div className="container mx-auto max-w-5xl px-6">
            <article className="overflow-hidden rounded-container border border-[#CBD5E1] bg-white shadow-sm">
              <div className="border-b border-[#E2E8F0] bg-[#0F172A] p-7 text-white">
                <p className="text-caption font-bold uppercase tracking-wider text-[#93C5FD]">
                  Psychosocial Control Review
                </p>
                <div className="mt-4 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <h2 className="text-section font-bold">Customer Operations</h2>
                    <p className="mt-2 text-[#CBD5E1]">
                      Hazard context: high job demands and insufficient recovery opportunity
                    </p>
                  </div>
                  <div className="rounded-control bg-[#FEF3C7] px-4 py-3 text-[#92400E]">
                    <p className="text-caption font-bold uppercase tracking-wide">Review finding</p>
                    <p className="mt-1 font-bold">PARTIALLY EFFECTIVE</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-0 border-b border-[#E2E8F0] md:grid-cols-3">
                {[
                  ['Control', 'Remove three recurring status meetings and protect two weekly focus blocks.'],
                  ['Implemented', '12 August 2026'],
                  ['Intended outcome', 'Reduce coordination burden and after-hours catch-up work.'],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-[#E2E8F0] p-6 last:border-0 md:border-b-0 md:border-r md:last:border-r-0">
                    <p className="text-caption font-bold uppercase tracking-wide text-[#64748B]">{label}</p>
                    <p className="mt-2 text-caption leading-6 text-[#0F172A]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="p-7">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  1. Executive decision
                </p>
                <h3 className="mt-3 text-lead font-bold text-[#0F172A]">
                  Do not close the control yet.
                </h3>
                <p className="mt-3 max-w-3xl leading-7 text-[#475569]">
                  Meeting burden fell and focus availability improved, but the reduction in
                  after-hours activity was not sustained. Coordination demand also increased in chat.
                  The available evidence supports keeping the control in place while investigating
                  workload allocation and late customer handovers.
                </p>
              </div>

              <div className="border-y border-[#E2E8F0] bg-[#F8FAFC] p-7">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  2. Before, after and sustainability
                </p>
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-caption">
                    <thead>
                      <tr className="border-b border-[#CBD5E1] text-[#64748B]">
                        {['Indicator', 'Baseline', 'After', 'Sustainability', 'Finding'].map((h) => (
                          <th key={h} className="px-3 py-3 font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {evidenceRows.map((row) => (
                        <tr key={row[0]} className="border-b border-[#E2E8F0] last:border-0">
                          {row.map((cell, i) => (
                            <td key={i} className={"px-3 py-3 " + (i === 0 ? 'font-semibold text-[#0F172A]' : 'text-[#475569]')}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-7">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  3. Possible workload migration
                </p>
                <h3 className="mt-3 text-lead font-bold text-[#0F172A]">
                  Less meeting time did not automatically mean less coordination demand.
                </h3>
                <p className="mt-3 leading-7 text-[#475569]">
                  Chat coordination rose after the meeting changes and remained elevated during the
                  sustainability period. This does not prove that meetings caused the increase. It
                  identifies a question that should be tested with workers and operational context.
                </p>
              </div>

              <div className="border-y border-[#E2E8F0] bg-[#F8FAFC] p-7">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  4. Worker evidence
                </p>
                <div className="mt-4 space-y-3">
                  {consultation.map((item) => (
                    <div key={item} className="flex gap-3">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                      <p className="text-caption leading-6 text-[#334155]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-7">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  5. Review decision
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-container border border-[#E2E8F0] p-5">
                    <p className="text-caption font-bold text-[#0F172A]">Decision</p>
                    <p className="mt-2 text-caption leading-6 text-[#475569]">
                      Maintain the meeting changes. Do not treat the control as complete.
                    </p>
                  </div>
                  <div className="rounded-container border border-[#E2E8F0] p-5">
                    <p className="text-caption font-bold text-[#0F172A]">Next action</p>
                    <p className="mt-2 text-caption leading-6 text-[#475569]">
                      Investigate workload allocation and late customer handovers. Review again in 6 weeks.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#E2E8F0] bg-[#FFF7ED] p-6">
                <p className="text-caption leading-6 text-[#7C2D12]">
                  <strong>Limits:</strong> SignalTrue does not diagnose psychological injury, declare
                  that a psychosocial hazard legally exists, replace worker consultation or establish
                  legal compliance. Work-pattern evidence supports the organisation's investigation
                  and review decision.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="sample-report-no-print bg-[#0F172A] py-16 text-white">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-section font-bold">Have one real control you need to review?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#CBD5E1]">
              The Australian founding review is free for selected organisations in exchange for
              structured feedback on the method and report.
            </p>
            <PrimaryCommercialCTA
              ctaLocation="sample_report_final"
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-control bg-white px-6 py-3 font-bold text-[#0F172A] hover:bg-[#E2E8F0]"
            >
              Start the AU$99 founding review <ArrowRight className="ml-2 h-4 w-4" />
            </PrimaryCommercialCTA>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
