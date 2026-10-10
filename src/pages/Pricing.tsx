import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { Link } from 'react-router-dom';

const freePreview = [
  'Two-minute control-effectiveness diagnostic',
  'A practical preview using one real risk and one control',
  'A sample evidence view and next-step recommendation',
  'No employee data, integrations, payment or commitment',
];

const paidWorkspace = [
  'Automatic work-pattern monitoring over time',
  'Evidence timelines for control reviews and decisions',
  'HR-only briefs with privacy-safe aggregation',
  'Connectors, recurring reviews and team workflows',
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="SignalTrue · Free psychosocial control preview"
        description="See a useful SignalTrue preview for free, then choose a paid workspace when you are ready for ongoing monitoring and evidence."
        path="/pricing"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto max-w-5xl px-6 text-center">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">Start free</p>
            <h1 className="mx-auto mt-4 max-w-4xl text-display font-bold text-[#0F172A]">
              See useful value before you pay.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lead leading-8 text-[#475569]">
              Start with a free, no-obligation preview of how SignalTrue helps you investigate one
              psychosocial risk, test one control and see what evidence is missing. Pay only when
              you are ready to keep using it.
            </p>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  Free SignalTrue preview
                </p>
                <h2 className="mt-3 text-section font-bold text-[#0F172A]">$0 to start</h2>
                <p className="mt-4 leading-7 text-[#475569]">
                  Start with a risk your organisation has already identified and one control you
                  need to review. SignalTrue structures a useful first look around the question that
                  matters: did the conditions of work actually change?
                </p>
                <div className="mt-6 rounded-container border border-[#BFDBFE] bg-[#EFF6FF] p-5">
                  <p className="text-caption font-bold text-[#1E3A8A]">Useful before you buy.</p>
                  <p className="mt-2 text-caption leading-6 text-[#1E40AF]">
                    Bring one real risk and one real control. We will help you see the next evidence
                    step.
                  </p>
                </div>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/contact?intent=free-preview"
                    className="inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-6 py-3 font-bold text-white hover:bg-brand-hover"
                  >
                    Get the free preview <ArrowRight className="ml-2 h-4 w-4" />
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
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  Included for free
                </p>
                <div className="mt-5 space-y-3">
                  {freePreview.map((item) => (
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
                  When you are ready
                </p>
                <h2 className="mt-3 text-section font-bold text-[#0F172A]">
                  Keep the value with a paid workspace.
                </h2>
                <p className="mt-4 leading-7 text-[#475569]">
                  After the free preview, paid SignalTrue usage adds ongoing monitoring, evidence
                  timelines and privacy-safe workflows so your team can keep improving controls over
                  time.
                </p>
                <Link
                  to="/contact?intent=free-preview"
                  className="mt-5 inline-flex items-center font-bold text-brand hover:underline"
                >
                  Get the free preview <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
              <div className="rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-6">
                <ShieldCheck className="h-7 w-7 text-brand" />
                <h3 className="mt-4 text-lead font-bold text-[#0F172A]">
                  Paid when it earns its place
                </h3>
                <div className="mt-3 space-y-2">
                  {paidWorkspace.map((item) => (
                    <div key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <p className="text-caption leading-6 text-[#475569]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
