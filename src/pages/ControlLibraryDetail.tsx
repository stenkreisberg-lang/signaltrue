import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  MessageSquareText,
  SearchCheck,
  TriangleAlert,
} from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { findControlEntry } from '../content/controlLibrary';

export default function ControlLibraryDetail() {
  const { hazardSlug, controlSlug } = useParams();
  const entry = findControlEntry(hazardSlug, controlSlug);

  if (!entry) return <Navigate to="/controls" replace />;

  const title = `${entry.control} for ${entry.hazard} | Psychosocial Control Review | SignalTrue`;
  const description = `How to review whether “${entry.control}” actually changed ${entry.hazard.toLowerCase()}: expected effect, evidence, migration risks, timing, and worker consultation questions.`;
  const path = `/controls/${entry.hazardSlug}/${entry.controlSlug}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${entry.control}: how to review whether the control worked`,
    description,
    mainEntityOfPage: `https://www.signaltrue.ai${path}`,
    publisher: {
      '@type': 'Organization',
      name: 'SignalTrue',
      url: 'https://www.signaltrue.ai',
    },
    about: [entry.hazard, entry.control, 'psychosocial risk control review'],
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PageMeta title={title} description={description} path={path} type="article" />
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white">
          <div className="container mx-auto px-6 py-14 lg:py-18">
            <div className="mx-auto max-w-5xl">
              <div className="text-caption font-bold text-brand">
                <Link to="/controls" className="hover:text-brand-hover">
                  Psychosocial Control Library
                </Link>
                <span className="mx-2 text-[#CBD5E1]">/</span>
                {entry.hazard}
              </div>

              <h1 className="mt-5 max-w-4xl text-section font-bold sm:text-display">
                {entry.control}: how do you know it actually worked?
              </h1>
              <p className="mt-5 max-w-3xl text-body leading-8 text-[#475569]">{entry.intent}</p>

              <div className="mt-7 rounded-container border border-brand-soft bg-brand-softer p-6">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  Expected effect
                </p>
                <p className="mt-2 text-body leading-7 text-[#334155]">{entry.expectedEffect}</p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={`/did-the-control-work?hazard=${entry.hazardSlug}&control=${entry.controlSlug}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-5 py-3 text-caption font-bold text-white hover:bg-brand-hover"
                >
                  Check this control now <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/control-evidence-assessment"
                  className="inline-flex min-h-12 items-center justify-center rounded-control border border-brand bg-white px-5 py-3 text-caption font-bold text-brand hover:bg-brand-softer"
                >
                  Assess the overall evidence process
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-12 lg:py-16">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
            <article className="rounded-container border border-[#E2E8F0] bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <SearchCheck className="h-5 w-5 text-brand" />
                <h2 className="text-subsection font-bold">What evidence should you review?</h2>
              </div>
              <ul className="mt-5 space-y-3 text-caption leading-6 text-[#475569]">
                {entry.evidenceNeeded.map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-container border border-[#E2E8F0] bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-brand" />
                <h2 className="text-subsection font-bold">What work patterns can help?</h2>
              </div>
              <ul className="mt-5 space-y-3 text-caption leading-6 text-[#475569]">
                {entry.indicators.map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-control border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-caption leading-6 text-[#64748B]">
                These indicators are observations about the work system. They are not individual
                health, sentiment, or productivity scores.
              </div>
            </article>

            <article className="rounded-container border border-amber-200 bg-amber-50 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <TriangleAlert className="h-5 w-5 text-amber-700" />
                <h2 className="text-subsection font-bold text-amber-950">
                  Where can the demand migrate?
                </h2>
              </div>
              <ul className="mt-5 space-y-3 text-caption leading-6 text-amber-950">
                {entry.migrationRisks.map((item) => (
                  <li key={item} className="flex gap-3">
                    <TriangleAlert className="mt-1 h-4 w-4 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-container border border-[#E2E8F0] bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <MessageSquareText className="h-5 w-5 text-brand" />
                <h2 className="text-subsection font-bold">What should you ask workers?</h2>
              </div>
              <ul className="mt-5 space-y-3">
                {entry.consultationQuestions.map((item) => (
                  <li
                    key={item}
                    className="rounded-control border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-caption leading-6 text-[#475569]"
                  >
                    “{item}”
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="mx-auto mt-6 max-w-6xl rounded-container border border-[#E2E8F0] bg-white p-6 sm:p-8">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">Review timing</p>
            <p className="mt-2 text-body font-bold">{entry.reviewTiming}</p>
            <p className="mt-3 max-w-4xl text-caption leading-6 text-[#64748B]">
              Timing depends on the nature of the hazard, the control, local duties, and how quickly
              a meaningful effect could reasonably appear. A short-term improvement should not be
              treated as proof that the control is sustained.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-6xl rounded-container border border-brand-soft bg-brand-softer p-7 sm:p-9">
            <h2 className="text-section font-bold">The decision is not “pass or fail”.</h2>
            <p className="mt-3 max-w-4xl text-body leading-8 text-[#475569]">
              The useful question is whether the evidence is strong enough to support a documented
              review: what changed, what did not, what workers say, whether improvement lasted, and
              whether new pressure appeared somewhere else.
            </p>
            <Link
              to={`/did-the-control-work?hazard=${entry.hazardSlug}&control=${entry.controlSlug}`}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-5 py-3 text-caption font-bold text-white hover:bg-brand-hover"
            >
              Generate the review plan <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="mx-auto mt-8 max-w-6xl text-caption leading-6 text-[#64748B]">
            SignalTrue provides an evidence and review method. This guide does not determine legal
            compliance, diagnose workers, or replace consultation and professional judgement.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
