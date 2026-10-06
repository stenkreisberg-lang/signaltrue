import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { PrimaryCommercialCTA, SampleReportCTA } from '../components/CommercialCTA';

const pilotIncludes = [
  'One real psychosocial or work-design control',
  'One defined team or work group with appropriate privacy safeguards',
  'Existing assessment, consultation or risk context where available',
  'Relevant calendar or collaboration metadata, subject to approval and data quality',
  'Baseline, after-period and sustainability comparison',
  'Possible workload-migration review',
  'Worker consultation evidence recorded beside operational evidence',
  'Final Psychosocial Control Review with explicit limitations and next action',
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="SignalTrue Pilot & Commercial Model | Psychosocial Control Review"
        description="Selected Australian organisations can run one SignalTrue psychosocial control-review pilot at no fee in exchange for structured feedback. Commercial pricing will follow validated use cases."
        path="/pricing"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto max-w-5xl px-6 text-center">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">Current offer</p>
            <h1 className="mx-auto mt-4 max-w-4xl text-display font-bold text-[#0F172A]">
              We are not asking Australian organisations to pay to validate the pilot.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lead leading-8 text-[#475569]">
              SignalTrue is currently validating one specific job: helping WHS teams review whether
              an implemented psychosocial control actually changed the conditions of work.
            </p>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  Australian validation pilot
                </p>
                <h2 className="mt-3 text-section font-bold text-[#0F172A]">Pilot fee: AU$0</h2>
                <p className="mt-4 leading-7 text-[#475569]">
                  For selected organisations, SignalTrue covers the pilot software and review work.
                  In return, the organisation provides one real control to review, an accountable
                  WHS contact, access to approved evidence where feasible, and structured feedback
                  on the final report and method.
                </p>
                <div className="mt-6 rounded-container border border-[#BFDBFE] bg-[#EFF6FF] p-5">
                  <p className="text-caption font-bold text-[#1E3A8A]">
                    This is not a free generic trial.
                  </p>
                  <p className="mt-2 text-caption leading-6 text-[#1E40AF]">
                    We only start when there is a real control, a real review question and enough
                    context to judge whether the method is useful.
                  </p>
                </div>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <PrimaryCommercialCTA
                    ctaLocation="pricing_pilot"
                    className="inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-6 py-3 font-bold text-white hover:bg-brand-hover"
                  >
                    Apply for the free pilot <ArrowRight className="ml-2 h-4 w-4" />
                  </PrimaryCommercialCTA>
                  <SampleReportCTA
                    ctaLocation="pricing_pilot"
                    className="inline-flex min-h-12 items-center justify-center rounded-control border border-[#CBD5E1] bg-white px-6 py-3 font-bold text-[#0F172A]"
                  >
                    See the sample report
                  </SampleReportCTA>
                </div>
              </div>

              <div className="rounded-container border border-[#E2E8F0] bg-white p-7">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  What the pilot includes
                </p>
                <div className="mt-5 space-y-3">
                  {pilotIncludes.map((item) => (
                    <div key={item} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                      <p className="text-caption leading-6 text-[#334155]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto max-w-5xl px-6">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  After validation
                </p>
                <h2 className="mt-3 text-section font-bold text-[#0F172A]">
                  Commercial pricing will follow the job customers actually value.
                </h2>
                <p className="mt-4 leading-7 text-[#475569]">
                  We are testing whether organisations want to buy a completed control review,
                  continuous assurance across several controls, or both. Publishing a polished
                  subscription matrix before that is validated would be false precision.
                </p>
              </div>
              <div className="rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-6">
                <ShieldCheck className="h-7 w-7 text-brand" />
                <h3 className="mt-4 text-lead font-bold text-[#0F172A]">What will not change</h3>
                <p className="mt-3 text-caption leading-6 text-[#475569]">
                  SignalTrue remains team-level, purpose-limited and designed to support human WHS
                  decisions. It does not read message content, rank individual productivity or make
                  psychological diagnoses.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
