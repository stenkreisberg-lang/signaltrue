import { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardCheck, RotateCcw } from 'lucide-react';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';

type AuditCategory =
  | 'Established monitoring practice'
  | 'Developing monitoring practice'
  | 'Limited monitoring visibility';

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
  if (score >= 9) return 'Established monitoring practice';
  if (score >= 5) return 'Developing monitoring practice';
  return 'Limited monitoring visibility';
}

const resultCopy: Record<AuditCategory, string> = {
  'Established monitoring practice':
    'Your organisation appears to have a structured foundation. The next question is whether continuous team-level work-pattern evidence would improve the timing or quality of control reviews.',
  'Developing monitoring practice':
    'Some important practices exist, but evidence, ownership or review cadence may be inconsistent. A focused pilot can test one gap without replacing your existing assessment and consultation process.',
  'Limited monitoring visibility':
    'Your organisation may have limited structured visibility between formal assessments. Start by clarifying purpose, consultation, governance and the controls that need review before introducing new monitoring.',
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
        title="Monitoring Gap Audit Australia | SignalTrue"
        description="Assess how your organisation monitors and reviews psychosocial controls between formal assessments. The result is a practice diagnostic, not a compliance conclusion."
        path="/au/monitoring-gap-audit"
        lang="en-AU"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16">
          <div className="container mx-auto max-w-4xl px-6 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-brand" />
            <p className="mt-5 text-sm font-bold uppercase tracking-wider text-brand">
              Australian diagnostic
            </p>
            <h1 className="mt-3 text-4xl font-bold text-[#0F172A] sm:text-5xl">
              Where is the gap between assessments?
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#475569]">
              Six questions about control records, review cadence, evidence and worker consultation.
              The result describes monitoring maturity—not legal compliance.
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
                    className="rounded-2xl border border-[#E2E8F0] bg-white p-6"
                  >
                    <legend className="px-1 text-lg font-bold text-[#0F172A]">
                      {index + 1}. {item.question}
                    </legend>
                    <div className="mt-5 space-y-3">
                      {item.options.map((option) => {
                        const selected = answers[item.id] === option.value;
                        return (
                          <label
                            key={option.label}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
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
                            <span className="text-sm leading-6 text-[#334155]">{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
                {error && (
                  <p
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                  >
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 font-bold text-white hover:bg-brand-hover"
                >
                  View my monitoring result <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            ) : (
              <div className="space-y-8">
                <section
                  id="audit-result"
                  tabIndex={-1}
                  className="rounded-3xl border border-[#93C5FD] bg-white p-8 shadow-sm outline-none md:p-10"
                >
                  <CheckCircle2 className="h-9 w-9 text-[#0F766E]" />
                  <p className="mt-5 text-sm font-bold uppercase tracking-wider text-brand">
                    Your result
                  </p>
                  <h2 className="mt-2 text-3xl font-bold text-[#0F172A]">{category}</h2>
                  <p className="mt-5 text-lg leading-8 text-[#475569]">{resultCopy[category]}</p>
                  <div className="mt-6 rounded-xl bg-[#F8FAFC] p-5 text-sm leading-6 text-[#475569]">
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

                <section className="rounded-3xl border border-[#E2E8F0] bg-white p-7 md:p-10">
                  <LeadForm
                    ctaLocation="au_monitoring_gap_result"
                    source="Australia monitoring gap audit"
                    tag={`au-monitoring-gap-${category.toLowerCase().replaceAll(' ', '-')}`}
                    heading="Discuss the result with SignalTrue"
                    intro="If the result identifies a useful gap, tell us who should join a short pilot-readiness conversation. We normally reply within one Australian business day."
                    submitLabel="Discuss the Monitoring Gap Audit"
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
