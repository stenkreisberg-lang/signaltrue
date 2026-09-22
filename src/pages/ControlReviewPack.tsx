import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  ExternalLink,
  Printer,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';
import { findControlEntry } from '../content/controlLibrary';
import { findJurisdiction } from '../content/jurisdictionGuides';
import { trackEvent } from '../lib/analytics';

type EvidenceKey = 'baseline' | 'postChange' | 'sustained' | 'migration' | 'workerValidation';

const EVIDENCE_LABELS: Record<EvidenceKey, string> = {
  baseline: 'Pre-change baseline',
  postChange: 'Post-change evidence',
  sustained: 'Sustainability check',
  migration: 'Workload migration check',
  workerValidation: 'Worker validation',
};

function parseBoolean(value: string | null) {
  return value === '1' || value === 'true';
}

function addDays(value: string, days: number) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function readinessLabel(score: number) {
  if (score >= 100) return 'Strong basis for a control review';
  if (score >= 80) return 'Reviewable, with one evidence gap';
  if (score >= 60) return 'Partial evidence. Do not close the review yet';
  if (score >= 40) return 'Too many gaps to judge the control reliably';
  return 'Too early to say the control worked';
}

export default function ControlReviewPack() {
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const entry = findControlEntry(
    searchParams.get('hazard') || '',
    searchParams.get('control') || ''
  );
  const jurisdiction = findJurisdiction(searchParams.get('jurisdiction'));
  const implementedOn = searchParams.get('date') || '';

  const evidence = useMemo(
    () => ({
      baseline: parseBoolean(searchParams.get('baseline')),
      postChange: parseBoolean(searchParams.get('post')),
      sustained: parseBoolean(searchParams.get('sustained')),
      migration: parseBoolean(searchParams.get('migration')),
      workerValidation: parseBoolean(searchParams.get('workers')),
    }),
    [searchParams]
  );

  if (!entry) return <Navigate to="/did-the-control-work" replace />;

  const evidenceEntries = Object.entries(evidence) as Array<[EvidenceKey, boolean]>;
  const presentCount = evidenceEntries.filter(([, value]) => value).length;
  const score = presentCount * 20;
  const missing = evidenceEntries.filter(([, value]) => !value).map(([key]) => key);

  const dates = implementedOn
    ? {
        baselineStart: addDays(implementedOn, -28),
        baselineEnd: addDays(implementedOn, -1),
        initialStart: addDays(implementedOn, 14),
        initialEnd: addDays(implementedOn, 42),
        sustainedStart: addDays(implementedOn, 43),
        sustainedEnd: addDays(implementedOn, 84),
      }
    : null;

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    trackEvent('control_review_pack_shared', {
      hazard_slug: entry.hazardSlug,
      control_slug: entry.controlSlug,
      jurisdiction: jurisdiction?.slug || 'global',
    });
  };

  const printPack = () => {
    trackEvent('control_review_pack_printed', {
      hazard_slug: entry.hazardSlug,
      control_slug: entry.controlSlug,
      jurisdiction: jurisdiction?.slug || 'global',
    });
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PageMeta
        title={`${entry.control} Control Review Pack | SignalTrue`}
        description={`Shareable control review pack for ${entry.hazard}: expected effect, evidence gaps, indicators, migration risks, worker questions, and review timing.`}
        path="/control-review-pack"
      />
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="pt-20 print:pt-0">
        <section className="border-b border-[#E2E8F0] bg-white print:border-0">
          <div className="container mx-auto px-6 py-12 print:px-0 print:py-6">
            <div className="mx-auto max-w-5xl">
              <div className="print:hidden">
                <Link
                  to="/did-the-control-work"
                  className="inline-flex items-center gap-2 text-caption font-bold text-[#64748B] hover:text-brand"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to the review tool
                </Link>
              </div>

              <div className="mt-6 flex flex-col justify-between gap-6 md:flex-row md:items-start print:mt-0">
                <div>
                  <p className="text-caption font-bold uppercase tracking-wider text-brand">
                    SignalTrue Control Review Pack
                  </p>
                  <h1 className="mt-2 max-w-4xl text-section font-bold sm:text-display">
                    {entry.control}
                  </h1>
                  <p className="mt-3 text-body text-[#475569]">
                    Hazard: <strong className="text-[#0F172A]">{entry.hazard}</strong>
                    {jurisdiction ? (
                      <>
                        {' '}
                        · Jurisdiction:{' '}
                        <strong className="text-[#0F172A]">{jurisdiction.name}</strong>
                      </>
                    ) : null}
                  </p>
                </div>

                <div className="flex gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => void copyShareLink()}
                    className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[#CBD5E1] bg-white px-4 py-2 text-caption font-bold text-[#334155] hover:border-brand"
                  >
                    <Copy className="h-4 w-4" /> {copied ? 'Link copied' : 'Copy share link'}
                  </button>
                  <button
                    type="button"
                    onClick={printPack}
                    className="inline-flex min-h-11 items-center gap-2 rounded-control bg-brand px-4 py-2 text-caption font-bold text-white hover:bg-brand-hover"
                  >
                    <Printer className="h-4 w-4" /> Print / save PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-10 print:px-0 print:py-4">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="grid gap-5 md:grid-cols-[0.75fr_1.25fr]">
              <div className="rounded-container border border-[#E2E8F0] bg-white p-6 print:break-inside-avoid">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  Current evidence readiness
                </p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-[3.5rem] font-bold leading-none">{score}</span>
                  <span className="pb-2 text-body font-semibold text-[#64748B]">/100</span>
                </div>
                <p className="mt-3 font-bold">{readinessLabel(score)}</p>
                <div className="mt-5 space-y-2">
                  {evidenceEntries.map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-caption">
                      {value ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <TriangleAlert className="h-4 w-4 text-amber-600" />
                      )}
                      <span className={value ? 'text-[#475569]' : 'font-bold text-[#334155]'}>
                        {EVIDENCE_LABELS[key]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-container border border-brand-soft bg-brand-softer p-6 print:break-inside-avoid">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  Control hypothesis
                </p>
                <h2 className="mt-2 text-subsection font-bold">What should change if it works?</h2>
                <p className="mt-3 text-body leading-8 text-[#334155]">{entry.expectedEffect}</p>
                <p className="mt-5 text-caption leading-6 text-[#64748B]">
                  Control completion is not treated as proof of effectiveness. The review should
                  compare working conditions before and after the intervention, check whether the
                  effect lasted, and test for unintended migration.
                </p>
              </div>
            </div>

            {dates ? (
              <div className="rounded-container border border-[#E2E8F0] bg-white p-6 print:break-inside-avoid">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  Illustrative review windows
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-caption font-bold">Baseline</p>
                    <p className="mt-1 text-caption text-[#64748B]">
                      {formatDate(dates.baselineStart)} – {formatDate(dates.baselineEnd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption font-bold">Initial review</p>
                    <p className="mt-1 text-caption text-[#64748B]">
                      {formatDate(dates.initialStart)} – {formatDate(dates.initialEnd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption font-bold">Sustainability check</p>
                    <p className="mt-1 text-caption text-[#64748B]">
                      {formatDate(dates.sustainedStart)} – {formatDate(dates.sustainedEnd)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <section className="rounded-container border border-[#E2E8F0] bg-white p-6 print:break-inside-avoid">
                <h2 className="text-subsection font-bold">Evidence to collect</h2>
                <ul className="mt-4 space-y-2 text-caption leading-6 text-[#475569]">
                  {entry.evidenceNeeded.map((item) => (
                    <li key={item} className="flex gap-2">
                      <ClipboardCheck className="mt-1 h-4 w-4 shrink-0 text-brand" />
                      {item}
                    </li>
                  ))}
                </ul>
                {missing.length ? (
                  <div className="mt-5 rounded-control border border-amber-200 bg-amber-50 p-4">
                    <p className="text-caption font-bold text-amber-950">Current gaps</p>
                    <p className="mt-1 text-caption leading-6 text-amber-900">
                      {missing.map((key) => EVIDENCE_LABELS[key]).join(', ')}
                    </p>
                  </div>
                ) : null}
              </section>

              <section className="rounded-container border border-[#E2E8F0] bg-white p-6 print:break-inside-avoid">
                <h2 className="text-subsection font-bold">Work-pattern indicators</h2>
                <ul className="mt-4 space-y-2 text-caption leading-6 text-[#475569]">
                  {entry.indicators.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <section className="rounded-container border border-amber-200 bg-amber-50 p-6 print:break-inside-avoid">
                <h2 className="text-subsection font-bold text-amber-950">
                  Possible workload migration
                </h2>
                <ul className="mt-4 space-y-2 text-caption leading-6 text-amber-950">
                  {entry.migrationRisks.map((item) => (
                    <li key={item} className="flex gap-2">
                      <TriangleAlert className="mt-1 h-4 w-4 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-container border border-[#E2E8F0] bg-white p-6 print:break-inside-avoid">
                <h2 className="text-subsection font-bold">Worker consultation questions</h2>
                <ul className="mt-4 space-y-3">
                  {entry.consultationQuestions.map((item) => (
                    <li
                      key={item}
                      className="rounded-control border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-caption leading-6 text-[#475569]"
                    >
                      “{item}”
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {jurisdiction ? (
              <section className="rounded-container border border-[#E2E8F0] bg-white p-6 print:break-inside-avoid">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-brand" />
                  <h2 className="text-subsection font-bold">{jurisdiction.name} context</h2>
                </div>
                <p className="mt-3 text-body leading-8 text-[#475569]">
                  {jurisdiction.reviewExpectation}
                </p>
                <p className="mt-3 text-caption leading-6 text-[#64748B]">
                  {jurisdiction.evidenceSignal}
                </p>
                <a
                  href={jurisdiction.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-caption font-bold text-brand"
                >
                  {jurisdiction.sourceLabel} <ExternalLink className="h-4 w-4" />
                </a>
              </section>
            ) : null}

            <section className="rounded-container border border-brand-soft bg-brand-softer p-6 print:break-inside-avoid">
              <h2 className="text-subsection font-bold">Decision record</h2>
              <p className="mt-3 text-caption leading-6 text-[#475569]">
                Record what changed, what did not, how workers interpreted the change, whether the
                effect was sustained, whether demand moved elsewhere, and what action follows.
              </p>
              <p className="mt-4 text-caption font-bold text-[#334155]">
                Suggested timing: {entry.reviewTiming}
              </p>
            </section>

            <p className="text-caption leading-6 text-[#64748B] print:pb-4">
              SignalTrue provides an evidence and review method. This pack does not determine legal
              compliance, diagnose workers, or replace consultation and professional judgement.
            </p>
          </div>
        </section>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
