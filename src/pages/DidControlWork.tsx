import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  SearchCheck,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { trackEvent } from '../lib/analytics';
import {
  CONTROL_LIBRARY,
  HAZARDS,
  controlPath,
  findControlEntry,
} from '../content/controlLibrary';

type EvidenceState = {
  baseline: boolean;
  postChange: boolean;
  sustained: boolean;
  migration: boolean;
  workerValidation: boolean;
};

const EMPTY_EVIDENCE: EvidenceState = {
  baseline: false,
  postChange: false,
  sustained: false,
  migration: false,
  workerValidation: false,
};

const EVIDENCE_ITEMS: Array<{
  key: keyof EvidenceState;
  label: string;
  explanation: string;
}> = [
  {
    key: 'baseline',
    label: 'Pre-change baseline exists',
    explanation: 'You can compare the new pattern with several normal weeks before the control.',
  },
  {
    key: 'postChange',
    label: 'Post-change evidence exists',
    explanation: 'You have comparable evidence from after the control was introduced.',
  },
  {
    key: 'sustained',
    label: 'A sustainability check exists',
    explanation: 'You checked later to see whether the change lasted rather than relying on a short-term dip.',
  },
  {
    key: 'migration',
    label: 'You checked for workload migration',
    explanation: 'You looked for demand moving into messages, evenings, another role, or another team.',
  },
  {
    key: 'workerValidation',
    label: 'Workers validated what the evidence means',
    explanation: 'Worker consultation is connected to the evidence rather than treated as a separate exercise.',
  },
];

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

export default function DidControlWork() {
  const [hazardSlug, setHazardSlug] = useState('');
  const [controlSlug, setControlSlug] = useState('');
  const [implementedOn, setImplementedOn] = useState('');
  const [evidence, setEvidence] = useState<EvidenceState>(EMPTY_EVIDENCE);
  const [showPlan, setShowPlan] = useState(false);
  const [copied, setCopied] = useState(false);

  const availableControls = useMemo(
    () => CONTROL_LIBRARY.filter((entry) => entry.hazardSlug === hazardSlug),
    [hazardSlug]
  );

  const entry = findControlEntry(hazardSlug, controlSlug);
  const score = EVIDENCE_ITEMS.reduce(
    (total, item) => total + (evidence[item.key] ? 20 : 0),
    0
  );
  const missing = EVIDENCE_ITEMS.filter((item) => !evidence[item.key]);

  useEffect(() => {
    trackEvent('did_control_work_viewed');
  }, []);

  const planDates = useMemo(() => {
    if (!implementedOn) return null;
    return {
      baselineStart: addDays(implementedOn, -28),
      baselineEnd: addDays(implementedOn, -1),
      bufferEnd: addDays(implementedOn, 13),
      initialStart: addDays(implementedOn, 14),
      initialEnd: addDays(implementedOn, 42),
      sustainedStart: addDays(implementedOn, 43),
      sustainedEnd: addDays(implementedOn, 84),
    };
  }, [implementedOn]);

  const generatePlan = () => {
    if (!entry) return;
    setShowPlan(true);
    setCopied(false);
    trackEvent('did_control_work_completed', {
      hazard_slug: entry.hazardSlug,
      control_slug: entry.controlSlug,
      evidence_score: score,
      missing_count: missing.length,
    });
    window.setTimeout(() => {
      document.getElementById('control-review-plan')?.scrollIntoView({ behavior: 'smooth' });
    }, 20);
  };

  const planText = entry
    ? [
        `SignalTrue control review plan`,
        `Hazard: ${entry.hazard}`,
        `Control: ${entry.control}`,
        `Current evidence score: ${score}/100 — ${readinessLabel(score)}`,
        '',
        `Expected effect: ${entry.expectedEffect}`,
        '',
        'Evidence to review:',
        ...entry.evidenceNeeded.map((item) => `- ${item}`),
        '',
        'Work-pattern indicators:',
        ...entry.indicators.map((item) => `- ${item}`),
        '',
        'Possible workload migration:',
        ...entry.migrationRisks.map((item) => `- ${item}`),
        '',
        'Worker consultation questions:',
        ...entry.consultationQuestions.map((item) => `- ${item}`),
        '',
        `Suggested timing: ${entry.reviewTiming}`,
        planDates
          ? `Illustrative windows from ${formatDate(implementedOn)}: baseline ${formatDate(
              planDates.baselineStart
            )}–${formatDate(planDates.baselineEnd)}; initial review ${formatDate(
              planDates.initialStart
            )}–${formatDate(planDates.initialEnd)}; sustainability check ${formatDate(
              planDates.sustainedStart
            )}–${formatDate(planDates.sustainedEnd)}.`
          : '',
        '',
        'Use this as a review aid, not as a legal conclusion or substitute for worker consultation.',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const copyPlan = async () => {
    if (!planText) return;
    await navigator.clipboard.writeText(planText);
    setCopied(true);
    trackEvent('did_control_work_plan_copied', {
      hazard_slug: entry?.hazardSlug,
      control_slug: entry?.controlSlug,
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PageMeta
        title="Did the Control Work? Free Psychosocial Control Review Tool | SignalTrue"
        description="Choose a psychosocial hazard and workplace control, check the evidence you already have, and generate a practical before-and-after control review plan."
        path="/did-the-control-work"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white">
          <div className="container mx-auto px-6 py-16 lg:py-20">
            <div className="mx-auto max-w-4xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-soft bg-brand-softer px-3 py-1.5 text-caption font-bold text-brand">
                <SearchCheck className="h-4 w-4" />
                Free control review utility
              </div>
              <h1 className="max-w-3xl text-section font-bold sm:text-display">
                You changed the work. Did the control actually work?
              </h1>
              <p className="mt-5 max-w-2xl text-body leading-8 text-[#475569]">
                Pick one psychosocial hazard and one control. SignalTrue will show what evidence is
                still missing, what to measure, where workload can migrate, and what to ask workers
                before closing the review.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 text-caption text-[#475569]">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand" /> No sign-up required
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand" /> No employee data entered
                </span>
                <span className="inline-flex items-center gap-2">
                  <TriangleAlert className="h-4 w-4 text-brand" /> Review aid, not a legal conclusion
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-12 lg:py-16">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-container border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
              <p className="text-caption font-bold uppercase tracking-wider text-brand">
                1. Define the control
              </p>

              <label className="mt-6 block text-caption font-bold text-[#334155]">
                Psychosocial hazard
              </label>
              <select
                value={hazardSlug}
                onChange={(event) => {
                  setHazardSlug(event.target.value);
                  setControlSlug('');
                  setShowPlan(false);
                }}
                className="mt-2 w-full rounded-control border border-[#CBD5E1] bg-white px-4 py-3 text-body text-[#0F172A]"
              >
                <option value="">Choose a hazard</option>
                {HAZARDS.map((hazard) => (
                  <option key={hazard.slug} value={hazard.slug}>
                    {hazard.label}
                  </option>
                ))}
              </select>

              <label className="mt-5 block text-caption font-bold text-[#334155]">
                Control introduced
              </label>
              <select
                value={controlSlug}
                disabled={!hazardSlug}
                onChange={(event) => {
                  setControlSlug(event.target.value);
                  setShowPlan(false);
                }}
                className="mt-2 w-full rounded-control border border-[#CBD5E1] bg-white px-4 py-3 text-body text-[#0F172A] disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
              >
                <option value="">Choose a control</option>
                {availableControls.map((control) => (
                  <option key={control.controlSlug} value={control.controlSlug}>
                    {control.control}
                  </option>
                ))}
              </select>

              <label className="mt-5 block text-caption font-bold text-[#334155]">
                Implementation date <span className="font-normal text-[#64748B]">(optional)</span>
              </label>
              <input
                type="date"
                value={implementedOn}
                onChange={(event) => setImplementedOn(event.target.value)}
                className="mt-2 w-full rounded-control border border-[#CBD5E1] bg-white px-4 py-3 text-body text-[#0F172A]"
              />

              {entry ? (
                <div className="mt-6 rounded-control border border-brand-soft bg-brand-softer p-5">
                  <p className="text-caption font-bold text-brand">What should change if it works?</p>
                  <p className="mt-2 text-caption leading-6 text-[#334155]">{entry.expectedEffect}</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-container border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
              <p className="text-caption font-bold uppercase tracking-wider text-brand">
                2. What evidence do you have?
              </p>
              <p className="mt-3 text-caption leading-6 text-[#64748B]">
                Tick only what is genuinely available for this specific control.
              </p>

              <div className="mt-6 space-y-3">
                {EVIDENCE_ITEMS.map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer gap-4 rounded-control border border-[#E2E8F0] p-4 transition hover:border-brand-soft hover:bg-brand-softer"
                  >
                    <input
                      type="checkbox"
                      checked={evidence[item.key]}
                      onChange={(event) => {
                        setEvidence((current) => ({
                          ...current,
                          [item.key]: event.target.checked,
                        }));
                        setShowPlan(false);
                      }}
                      className="mt-1 h-4 w-4 rounded border-[#94A3B8] accent-[var(--brand)]"
                    />
                    <span>
                      <span className="block text-caption font-bold text-[#1E293B]">{item.label}</span>
                      <span className="mt-1 block text-caption leading-5 text-[#64748B]">
                        {item.explanation}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                disabled={!entry}
                onClick={generatePlan}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-brand px-5 py-3 text-body font-bold text-white shadow-sm hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#94A3B8]"
              >
                Generate the control review plan
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        {showPlan && entry ? (
          <section id="control-review-plan" className="border-y border-[#E2E8F0] bg-white">
            <div className="container mx-auto px-6 py-14 lg:py-18">
              <div className="mx-auto max-w-6xl">
                <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                  <aside className="rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-6 sm:p-8">
                    <p className="text-caption font-bold uppercase tracking-wider text-brand">
                      Current review basis
                    </p>
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-[4rem] font-bold leading-none">{score}</span>
                      <span className="pb-2 text-body font-semibold text-[#64748B]">/100</span>
                    </div>
                    <p className="mt-3 text-subsection font-bold">{readinessLabel(score)}</p>

                    {missing.length ? (
                      <div className="mt-6">
                        <p className="text-caption font-bold text-[#334155]">Still missing</p>
                        <ul className="mt-3 space-y-2 text-caption leading-6 text-[#475569]">
                          {missing.map((item) => (
                            <li key={item.key} className="flex gap-2">
                              <TriangleAlert className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
                              {item.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="mt-6 rounded-control border border-emerald-200 bg-emerald-50 p-4 text-caption leading-6 text-emerald-950">
                        All five evidence layers are present. The next step is interpretation and
                        documented worker consultation, not an automatic “pass”.
                      </div>
                    )}

                    <Link
                      to={controlPath(entry)}
                      className="mt-7 inline-flex items-center gap-2 text-caption font-bold text-brand hover:text-brand-hover"
                    >
                      Open the full control guide <ArrowRight className="h-4 w-4" />
                    </Link>
                  </aside>

                  <div>
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-caption font-bold uppercase tracking-wider text-brand">
                          Your evidence plan
                        </p>
                        <h2 className="mt-2 text-section font-bold">
                          {entry.hazard}: {entry.control}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={copyPlan}
                        className="inline-flex items-center justify-center gap-2 rounded-control border border-[#CBD5E1] bg-white px-4 py-2.5 text-caption font-bold text-[#334155] hover:border-brand"
                      >
                        <Copy className="h-4 w-4" /> {copied ? 'Copied' : 'Copy plan'}
                      </button>
                    </div>

                    {planDates ? (
                      <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        {[
                          [
                            'Baseline',
                            `${formatDate(planDates.baselineStart)} – ${formatDate(
                              planDates.baselineEnd
                            )}`,
                          ],
                          [
                            'Initial review',
                            `${formatDate(planDates.initialStart)} – ${formatDate(
                              planDates.initialEnd
                            )}`,
                          ],
                          [
                            'Sustainability',
                            `${formatDate(planDates.sustainedStart)} – ${formatDate(
                              planDates.sustainedEnd
                            )}`,
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-control border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                          >
                            <CalendarDays className="h-4 w-4 text-brand" />
                            <p className="mt-2 text-caption font-bold">{label}</p>
                            <p className="mt-1 text-caption text-[#64748B]">{value}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                      <div>
                        <h3 className="text-subsection font-bold">Measure these patterns</h3>
                        <ul className="mt-3 space-y-2 text-caption leading-6 text-[#475569]">
                          {entry.indicators.map((item) => (
                            <li key={item} className="flex gap-2">
                              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-subsection font-bold">Check where demand moved</h3>
                        <ul className="mt-3 space-y-2 text-caption leading-6 text-[#475569]">
                          {entry.migrationRisks.map((item) => (
                            <li key={item} className="flex gap-2">
                              <TriangleAlert className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-8 rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-6">
                      <h3 className="text-subsection font-bold">Ask workers these questions</h3>
                      <ul className="mt-4 grid gap-3 md:grid-cols-2">
                        {entry.consultationQuestions.map((item) => (
                          <li
                            key={item}
                            className="rounded-control border border-[#E2E8F0] bg-white p-4 text-caption leading-6 text-[#475569]"
                          >
                            “{item}”
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-8 rounded-container border border-brand-soft bg-brand-softer p-6">
                      <div className="flex gap-3">
                        <ClipboardCheck className="mt-1 h-5 w-5 shrink-0 text-brand" />
                        <div>
                          <p className="font-bold">Suggested review timing</p>
                          <p className="mt-1 text-caption leading-6 text-[#475569]">
                            {entry.reviewTiming}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                      <Link
                        to="/control-evidence-assessment"
                        className="inline-flex min-h-12 items-center justify-center rounded-control border border-brand bg-white px-5 py-3 text-caption font-bold text-brand hover:bg-brand-softer"
                      >
                        Assess your overall evidence process
                      </Link>
                      <Link
                        to="/contact?intent=control-review"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-5 py-3 text-caption font-bold text-white hover:bg-brand-hover"
                      >
                        Review this control with SignalTrue <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="container mx-auto px-6 py-14">
          <div className="mx-auto max-w-5xl rounded-container border border-[#E2E8F0] bg-white p-7 sm:p-9">
            <h2 className="text-section font-bold">Why this is different from “did we complete the action?”</h2>
            <p className="mt-4 max-w-3xl text-body leading-8 text-[#475569]">
              Completing a control is not the same as showing that working conditions changed.
              A useful review compares before and after, checks whether the effect lasted, looks for
              unintended migration, and validates interpretation with workers.
            </p>
            <Link
              to="/controls"
              className="mt-6 inline-flex items-center gap-2 text-caption font-bold text-brand hover:text-brand-hover"
            >
              Browse the Psychosocial Control Library <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
