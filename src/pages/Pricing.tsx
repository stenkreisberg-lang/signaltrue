import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { Link } from 'react-router-dom';

const includes = [
  'One identified psychosocial risk',
  'One defined work group or team',
  'One control that has been implemented or is about to be implemented',
  'Existing assessment and consultation context where available',
  'Approved calendar or collaboration metadata where technically available',
  'Baseline, after-period and sustainability comparison',
  'Possible workload-migration review',
  'Worker consultation evidence kept beside operational evidence',
  'Final Psychosocial Control Review with explicit limitations and next action',
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="SignalTrue Founding Control Review · AU$99"
        description="Australian founding offer: one psychosocial risk, one control and one evidence-based control review for AU$99."
        path="/pricing"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto max-w-5xl px-6 text-center">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">Australian founding offer</p>
            <h1 className="mx-auto mt-4 max-w-4xl text-display font-bold text-[#0F172A]">
              One psychosocial risk. One control. AU$99.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lead leading-8 text-[#475569]">
              The purpose of the founding review is to prove whether SignalTrue makes control-effectiveness
              review easier and more useful. It is deliberately priced for validation, not margin.
            </p>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-caption font-bold uppercase tracking-wider text-brand">Founding Control Review</p>
                <h2 className="mt-3 text-section font-bold text-[#0F172A]">AU$99</h2>
                <p className="mt-4 leading-7 text-[#475569]">
                  Start with a risk your organisation has already identified and one control you need to review.
                  SignalTrue structures the evidence around the question that matters: did the conditions of work
                  actually change?
                </p>
                <div className="mt-6 rounded-container border border-[#BFDBFE] bg-[#EFF6FF] p-5">
                  <p className="text-caption font-bold text-[#1E3A8A]">Not another generic software trial.</p>
                  <p className="mt-2 text-caption leading-6 text-[#1E40AF]">
                    The review is useful only when there is a real risk, a real control and a real decision to make.
                  </p>
                </div>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/contact?intent=au-founding-review"
                    className="inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-6 py-3 font-bold text-white hover:bg-brand-hover"
                  >
                    Start the AU$99 review <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    to="/did-the-control-work"
                    className="inline-flex min-h-12 items-center justify-center rounded-control border border-[#CBD5E1] bg-white px-6 py-3 font-bold text-[#0F172A]"
                  >
                    Check your gaps first
                  </Link>
                </div>
              </div>

              <div className="rounded-container border border-[#E2E8F0] bg-white p-7">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">What it includes</p>
                <div className="mt-5 space-y-3">
                  {includes.map((item) => (
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
                <p className="text-caption font-bold uppercase tracking-wider text-brand">Before you buy</p>
                <h2 className="mt-3 text-section font-bold text-[#0F172A]">See whether your review process actually has a gap.</h2>
                <p className="mt-4 leading-7 text-[#475569]">
                  Use the two-minute diagnostic first. It identifies missing baseline, outcome, evidence,
                  migration and decision layers without requiring employee data or sign-up.
                </p>
                <Link to="/did-the-control-work" className="mt-5 inline-flex items-center font-bold text-brand hover:underline">
                  Run the diagnostic <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
              <div className="rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-6">
                <ShieldCheck className="h-7 w-7 text-brand" />
                <h3 className="mt-4 text-lead font-bold text-[#0F172A]">The boundary stays clear</h3>
                <p className="mt-3 text-caption leading-6 text-[#475569]">
                  SignalTrue does not replace psychosocial risk assessment, worker consultation or professional
                  judgement. It adds structured operational evidence to the control-review process.
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
