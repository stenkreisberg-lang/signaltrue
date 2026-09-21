import { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardCheck, RotateCcw } from 'lucide-react';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';

type AuditCategory =
  | 'Strong control-review foundation'
  | 'Control-review evidence gap'
  | 'Build the review process first';

interface AuditOption {
  label: string;
  value: number;
}

interface AuditQuestion {
  id: string;
  question: string;
  options: AuditOption[];
}

const questions: AuditQuestion[] = [
  {
    id: 'controls',
    question: 'How are psychosocial controls currently documented?',
    options: [
      { label: 'In an owned, versioned register with review dates', value: 2 },
      {
        label: 'In documents or registers without consistent ownership and review dates',
        value: 1,
      },
      { label: 'There is no consistent record', value: 0 },
    ],
  },
  {
    id: 'review',
    question: 'How often are control effectiveness and ongoing suitability reviewed?',
    options: [
      { label: 'On a defined cadence and when workplace conditions change', value: 2 },
      { label: 'Mainly during periodic assessments or after an issue', value: 1 },
      { label: 'There is no defined review process', value: 0 },
    ],
  },
  {
    id: 'evidence',
    question: 'What evidence is used between formal assessments?',
    options: [
      { label: 'Several sources, including consultation and operational evidence', value: 2 },
      { label: 'One or two sources, such as surveys, incidents or absence data', value: 1 },
      { label: 'No structured evidence between assessments', value: 0 },
    ],
  },
  {
    id: 'change',
    question: 'Can the organisation see work-design conditions changing between formal reviews?',
    options: [
      { label: 'Yes, at a useful team level with defined thresholds and context', value: 2 },
      { label: 'Sometimes, but the evidence is delayed or inconsistent', value: 1 },
      { label: 'No reliable method exists today', value: 0 },
    ],
  },
  {
    id: 'comparison',
    question: 'Can relevant evidence be compared before and after a control is introduced?',
    options: [
      { label: 'Yes, with documented periods, methods and limitations', value: 2 },
      { label: 'Informally or only for some controls', value: 1 },
      { label: 'No', value: 0 },
    ],
  },
  {
    id: 'consultation',
    question: 'How are workers involved in reviewing whether controls are working?',
    options: [
      { label: 'Through a documented, recurring consultation process', value: 2 },
      { label: 'Consultation occurs, but is not consistently linked to reviews', value: 1 },
      { label: 'There is no defined process', value: 0 },
    ],
  },
];

export function calculateAuditResult(score: number): AuditCategory {
  if (score >= 9) return 'Strong control-review foundation';
  if (score >= 5) return 'Control-review evidence gap';
  return 'Build the review process first';
}

const resultCopy: Record<AuditCategory, string> = {
  'Strong control-review foundation':
    'You already have the governance SignalTrue needs. The useful test is narrow: choose one implemented control and see whether aggregated work-pattern evidence adds something your existing review process cannot see quickly or consistently.',
  'Control-review evidence gap':
    'You have parts of the process, but the chain from control → expected work change → evidence → worker validation → decision is inconsistent. This is the strongest pilot fit because SignalTrue can be tested against one real control without replacing your WHS process.',
  'Build the review process first':
    'Do not add another monitoring tool yet. First establish control ownership, review triggers and worker consultation. SignalTrue becomes useful only when there is a defined control and a real decision its evidence can support.',
};

export default function AustraliaMonitoringGapAudit() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState('');
  const score = useMemo(
    () => Object.values(answers).reduce((total, value) => total + value, 0),
    [answers]
  );
  const category = calculateAuditResult(score);

  const submitAudit = (event: FormEvent) => {
    event.preventDefault();
    if (Object.keys(answers).length !== questions.length) {
      setError('Answer all six questions to view your result.');
      return;
    }
    setError('');
    setShowResult(true);
    window.setTimeout(() => document.getElementById('audit-result')?.focus(), 0);
  };

  const resetAudit = () => {
    setAnswers({});
    setShowResult(false);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="Psychosocial Control Review Readiness | SignalTrue Australia"
        description="Six questions to test whether your organisation can review one psychosocial control from implementation through evidence, worker validation and a maintain, modify or replace decision."
        path="/au/monitoring-gap-audit"
        lang="en-AU"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16">
          <div className="container mx-auto max-w-4xl px-6 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-brand" />
            <p className="mt-5 text-caption font-bold uppercase tracking-wider text-brand">
              Australian diagnostic
            </p>
            <h1 className="mt-3 text-display font-bold text-[#0F172A] sm:text-display">
              Can you show whether one psychosocial control actually worked?
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-body leading-8 text-[#475569]">
              Six questions about control records, review cadence, evidence and worker consultation.
              The result describes monitoring maturity; not legal compliance.
            </p>
          </div>
        </section>

        <section className="py-12 lg:py-16">
          <div className="container mx-auto max-w-4xl px-6">
            {!showResult ? (
              <form onSubmit={submitAudit} className="space-y-6" noValidate>
                {questions.map((item, index) => (
                  <fieldset
                    key={item.id}
                    className="rounded-container border border-[#E2E8F0] bg-white p-6"
                  >
                    <legend className="px-1 text-body font-bold text-[#0F172A]">
                      {index + 1}. {item.question}
                    </legend>
                    <div className="mt-5 space-y-3">
                      {item.options.map((option) => {
                        const selected = answers[item.id] === option.value;
                        return (
                          <label
                            key={option.label}
                            className={`flex cursor-pointer items-start gap-3 rounded-container border p-4 transition ${
                              selected
                                ? 'border-brand bg-[#EFF6FF]'
                                : 'border-[#E2E8F0] hover:border-[#93C5FD]'
                            }`}
                          >
                            <input
                              type="radio"
                              name={item.id}
                              value={option.value}
                              checked={selected}
                              onChange={() => {
                                setAnswers((current) => ({ ...current, [item.id]: option.value }));
                                setError('');
                              }}
                              className="mt-1 h-4 w-4"
                            />
                            <span className="text-caption leading-6 text-[#334155]">
                              {option.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
                {error && (
                  <p
                    role="alert"
                    className="rounded-control border border-red-200 bg-red-50 p-4 text-caption text-red-800"
                  >
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-brand px-6 py-3 font-bold text-white hover:bg-brand-hover"
                >
                  Show my control-review gap <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            ) : (
              <div className="space-y-8">
                <section
                  id="audit-result"
                  tabIndex={-1}
                  className="rounded-container border border-[#93C5FD] bg-white p-8 shadow-sm outline-none md:p-10"
                >
                  <CheckCircle2 className="h-9 w-9 text-brand" />
                  <p className="mt-5 text-caption font-bold uppercase tracking-wider text-brand">
                    Your result
                  </p>
                  <h2 className="mt-2 text-section font-bold text-[#0F172A]">{category}</h2>
                  <p className="mt-5 text-body leading-8 text-[#475569]">{resultCopy[category]}</p>
                  <div className="mt-6 rounded-container bg-[#F8FAFC] p-5 text-caption leading-6 text-[#475569]">
                    This result is based only on your answers. It is not a psychosocial risk
                    assessment, legal opinion, compliance finding or evaluation of worker health.
                  </div>
                  <button
                    type="button"
                    onClick={resetAudit}
                    className="mt-6 inline-flex items-center gap-2 font-semibold text-brand hover:underline"
                  >
                    <RotateCcw className="h-4 w-4" /> Retake the audit
                  </button>
                </section>

                <section className="rounded-container border border-[#E2E8F0] bg-white p-7 md:p-10">
                  <LeadForm
                    ctaLocation="au_monitoring_gap_result"
                    source="Australia monitoring gap audit"
                    tag={`au-monitoring-gap-${category.toLowerCase().split(' ').join('-')}`}
                    heading="Bring one control. We will map the evidence gap."
                    intro="Tell us one psychosocial control you have already implemented and who owns its review. We will use the conversation to map the expected work change, available evidence, worker-validation step and the decision the review needs to support."
                    submitLabel="Review one control with SignalTrue"
                  />
                </section>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
