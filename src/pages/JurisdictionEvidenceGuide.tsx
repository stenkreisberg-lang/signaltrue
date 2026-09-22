import { ArrowRight, CheckCircle2, ExternalLink, Globe2, ShieldCheck } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { JURISDICTION_GUIDES, findJurisdiction } from '../content/jurisdictionGuides';

export default function JurisdictionEvidenceGuide() {
  const { jurisdictionSlug } = useParams();
  const guide = findJurisdiction(jurisdictionSlug);

  if (!guide) return <Navigate to="/jurisdictions/australia" replace />;

  const title = `${guide.name} Psychosocial Control Review Guide | SignalTrue`;
  const description = `${guide.regulator} context for reviewing psychosocial controls: what should be evidenced, when controls should be reviewed, and how SignalTrue can support before-and-after verification.`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PageMeta
        title={title}
        description={description}
        path={`/jurisdictions/${guide.slug}`}
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white">
          <div className="container mx-auto px-6 py-16 lg:py-20">
            <div className="mx-auto max-w-5xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-soft bg-brand-softer px-3 py-1.5 text-caption font-bold text-brand">
                <Globe2 className="h-4 w-4" />
                {guide.name} evidence guide
              </div>
              <h1 className="max-w-4xl text-section font-bold sm:text-display">{guide.headline}</h1>
              <p className="mt-5 max-w-3xl text-body leading-8 text-[#475569]">{guide.summary}</p>

              <div className="mt-7 flex flex-wrap gap-2">
                {JURISDICTION_GUIDES.map((item) => (
                  <Link
                    key={item.slug}
                    to={`/jurisdictions/${item.slug}`}
                    className={`rounded-control border px-4 py-2 text-caption font-bold transition ${
                      item.slug === guide.slug
                        ? 'border-brand bg-brand text-white'
                        : 'border-[#CBD5E1] bg-white text-[#475569] hover:border-brand'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-12 lg:py-16">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-container border border-[#E2E8F0] bg-white p-7 shadow-sm sm:p-9">
              <p className="text-caption font-bold uppercase tracking-wider text-brand">
                What the review needs to answer
              </p>
              <h2 className="mt-2 text-section font-bold">{guide.reviewExpectation}</h2>
              <div className="mt-7 space-y-3">
                {guide.practicalImplications.map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-control border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                  >
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                    <p className="text-caption leading-6 text-[#475569]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-container border border-brand-soft bg-brand-softer p-7 sm:p-9">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-brand" />
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  Where SignalTrue fits
                </p>
              </div>
              <p className="mt-4 text-body leading-8 text-[#334155]">{guide.evidenceSignal}</p>
              <div className="mt-6 rounded-control border border-white/80 bg-white p-5">
                <p className="text-caption font-bold text-[#334155]">Important boundary</p>
                <p className="mt-2 text-caption leading-6 text-[#64748B]">
                  SignalTrue provides an evidence layer for review. It does not determine legal
                  compliance, diagnose workers, or replace consultation and professional judgement.
                </p>
              </div>
              <Link
                to={`/did-the-control-work?jurisdiction=${guide.slug}`}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-brand px-5 py-3 text-caption font-bold text-white hover:bg-brand-hover"
              >
                Review one control in {guide.name}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </aside>
          </div>

          <div className="mx-auto mt-7 max-w-6xl rounded-container border border-[#E2E8F0] bg-white p-7 sm:p-9">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">
              Primary sources
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <a
                href={guide.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="group rounded-control border border-[#E2E8F0] p-5 hover:border-brand-soft"
              >
                <p className="font-bold text-[#0F172A]">{guide.sourceLabel}</p>
                <span className="mt-2 inline-flex items-center gap-2 text-caption font-bold text-brand">
                  Open source <ExternalLink className="h-4 w-4" />
                </span>
              </a>
              {guide.secondarySourceUrl ? (
                <a
                  href={guide.secondarySourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-control border border-[#E2E8F0] p-5 hover:border-brand-soft"
                >
                  <p className="font-bold text-[#0F172A]">{guide.secondarySourceLabel}</p>
                  <span className="mt-2 inline-flex items-center gap-2 text-caption font-bold text-brand">
                    Open source <ExternalLink className="h-4 w-4" />
                  </span>
                </a>
              ) : null}
            </div>
          </div>

          <div className="mx-auto mt-7 max-w-6xl rounded-container border border-[#E2E8F0] bg-white p-7 sm:p-9">
            <h2 className="text-section font-bold">
              A useful control record should survive a simple question.
            </h2>
            <p className="mt-3 max-w-4xl text-body leading-8 text-[#475569]">
              What changed after the intervention, what evidence supports that conclusion, what did
              workers say, did the effect last, and did pressure move somewhere else?
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/controls"
                className="inline-flex min-h-12 items-center justify-center rounded-control border border-brand bg-white px-5 py-3 text-caption font-bold text-brand hover:bg-brand-softer"
              >
                Browse control guides
              </Link>
              <Link
                to="/ask"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-5 py-3 text-caption font-bold text-white hover:bg-brand-hover"
              >
                Ask SignalTrue a question <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
