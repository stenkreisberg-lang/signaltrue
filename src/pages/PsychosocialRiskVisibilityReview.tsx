import { CheckCircle2, Eye, FileText, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';
import { PrimaryCommercialCTA, SampleReportCTA } from '../components/CommercialCTA';

const reviewItems = [
  'A 20-minute conversation about your organisation’s current psychosocial-risk process.',
  'An example of the conditions SignalTrue can identify.',
  'A review of possible gaps between formal assessments.',
  'A recommendation on whether a controlled pilot is justified.',
];

const privacyBoundaries = [
  'Team-level analysis',
  'No individual risk scoring',
  'Metadata-focused analysis',
  'Minimum group-size protections',
  'No medical diagnosis',
  'Worker consultation and governance remain the employer’s responsibility',
];

export default function PsychosocialRiskVisibilityReview() {
  const location = useLocation();
  const formCtaLocation =
    new URLSearchParams(location.search).get('cta') || 'visibility_review_direct';

  useEffect(() => {
    if (location.hash !== '#request-review') return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('request-review')?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="What happens between psychosocial risk assessments? | SignalTrue"
        description="See how SignalTrue helps WHS leaders identify changing team-level workload and coordination conditions between formal psychosocial risk assessments."
        path="/psychosocial-risk-visibility-review"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-24">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-5xl text-center">
              <p className="text-caption font-bold uppercase tracking-wider text-brand">
                What happens between psychosocial risk assessments?
              </p>
              <h1 className="mt-5 text-display font-bold leading-tight text-[#0F172A] sm:text-display lg:text-display">
                Psychosocial risk does not wait for the next assessment.
              </h1>
              <p className="mx-auto mt-6 max-w-4xl text-lead leading-8 text-[#475569]">
                SignalTrue helps WHS leaders identify changing workload and coordination conditions
                between formal assessments, using privacy-preserving patterns from everyday digital
                work.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <PrimaryCommercialCTA
                  ctaLocation="visibility_review_hero"
                  className="inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-6 py-3 font-bold text-white hover:bg-brand-hover"
                />
                <SampleReportCTA
                  ctaLocation="visibility_review_hero"
                  className="inline-flex min-h-12 items-center justify-center rounded-control border border-[#CBD5E1] bg-white px-6 py-3 font-bold text-[#0F172A] hover:border-brand"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-2">
            <article className="rounded-container border border-[#E2E8F0] bg-white p-8">
              <Eye className="h-7 w-7 text-brand" aria-hidden="true" />
              <h2 className="mt-5 text-section font-bold text-[#0F172A]">The visibility gap</h2>
              <p className="mt-4 leading-7 text-[#475569]">
                Formal assessments provide a point-in-time view. In digital and hybrid
                organisations, meeting pressure, after-hours work, fragmented focus and coordination
                problems can change much faster.
              </p>
            </article>
            <article className="rounded-container border border-[#E2E8F0] bg-white p-8">
              <FileText className="h-7 w-7 text-brand" aria-hidden="true" />
              <h2 className="mt-5 text-section font-bold text-[#0F172A]">What SignalTrue adds</h2>
              <p className="mt-4 leading-7 text-[#475569]">
                SignalTrue identifies changes in team-level working patterns between formal
                assessments. The evidence helps an employer decide where to investigate and consult
                workers; it does not diagnose individuals or prove that someone is burned out.
              </p>
            </article>
          </div>
        </section>

        <section className="border-y border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-center text-section font-bold text-[#0F172A]">
                What the review includes
              </h2>
              <div className="mt-9 grid gap-4 md:grid-cols-2">
                {reviewItems.map((item) => (
                  <div key={item} className="flex gap-3 rounded-container bg-[#F8FAFC] p-5">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <p className="leading-6 text-[#334155]">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <PrimaryCommercialCTA
                  ctaLocation="visibility_review_includes"
                  className="inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-6 py-3 text-center font-bold text-white hover:bg-brand-hover"
                />
                <SampleReportCTA
                  ctaLocation="visibility_review_includes"
                  className="inline-flex min-h-12 items-center justify-center rounded-control border border-[#CBD5E1] px-6 py-3 font-bold text-[#0F172A] hover:border-brand"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#0F172A] py-16 text-white lg:py-20">
          <div className="container mx-auto grid max-w-6xl items-start gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <ShieldCheck className="h-8 w-8 text-[#93C5FD]" aria-hidden="true" />
              <h2 className="mt-5 text-section font-bold">Privacy boundaries</h2>
              <p className="mt-4 leading-7 text-[#CBD5E1]">
                These boundaries reflect the current product controls: reporting is aggregated at
                team level, groups below the configured minimum are suppressed, and the evidence
                process remains subordinate to consultation and employer governance.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {privacyBoundaries.map((boundary) => (
                <div key={boundary} className="flex gap-3 rounded-container bg-white/5 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#34D399]" />
                  <span className="text-caption leading-6 text-[#E2E8F0]">{boundary}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2">
              <div>
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  Sample output
                </p>
                <h2 className="mt-3 text-section font-bold text-[#0F172A]">
                  Inspect the evidence-to-action record.
                </h2>
                <p className="mt-4 leading-7 text-[#475569]">
                  The available sample is explicitly fictional. It demonstrates evidence,
                  confidence, consultation prompts, control ownership and review timing; it is not
                  presented as a customer result.
                </p>
                <SampleReportCTA
                  ctaLocation="visibility_review_sample"
                  className="mt-6 inline-flex min-h-12 items-center justify-center rounded-control border border-brand bg-white px-6 py-3 font-bold text-brand"
                />
              </div>
              <article className="rounded-container border border-[#CBD5E1] bg-white p-7 shadow-sm">
                <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-caption font-bold uppercase tracking-wide text-amber-900">
                  Synthetic example — not customer results
                </p>
                <h3 className="mt-5 text-lead font-bold text-[#0F172A]">
                  Team-level meeting demand moved above its qualified baseline
                </h3>
                <dl className="mt-5 grid grid-cols-3 gap-3 text-caption">
                  <div>
                    <dt className="text-[#64748B]">Evidence</dt>
                    <dd className="mt-1 font-bold">3 periods</dd>
                  </div>
                  <div>
                    <dt className="text-[#64748B]">Confidence</dt>
                    <dd className="mt-1 font-bold">High</dd>
                  </div>
                  <div>
                    <dt className="text-[#64748B]">Next step</dt>
                    <dd className="mt-1 font-bold">Consult</dd>
                  </div>
                </dl>
                <p className="mt-5 text-caption leading-6 text-[#475569]">
                  This pattern would prompt a conversation about workload, staffing, deadlines and
                  meeting design. It would not establish harm or diagnose a worker.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="request-review" className="border-t border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-3xl rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-7 md:p-10">
              <LeadForm ctaLocation={formCtaLocation} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
