import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import PageMeta from '../components/PageMeta';
import { getOriginalAttribution, trackEvent } from '../lib/analytics';

type Dimension = 'detection' | 'investigation' | 'verification' | 'governance';

type Question = {
  id: string;
  dimension: Dimension;
  prompt: string;
  context: string;
  options: Array<{ label: string; value: number }>;
};

type Answer = {
  questionId: string;
  dimension: Dimension;
  value: number;
  label: string;
};

type AssessmentResult = {
  submissionId: string;
  score: number;
  level: 'reactive' | 'developing' | 'structured' | 'continuous';
  weakestDimension: Dimension;
  dimensions: Record<Dimension, number>;
};

const API_BASE =
  process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_API_URL || 'https://signaltrue-backend.onrender.com'
    : '';

const QUESTIONS: Question[] = [
  {
    id: 'detection_1',
    dimension: 'detection',
    prompt: 'When work changes, how quickly is your psychosocial risk picture refreshed?',
    context: 'Think reorganisations, staffing changes, new clients, new technology or workload shifts.',
    options: [
      { label: 'Mostly at the next scheduled assessment', value: 0 },
      { label: 'When a complaint, absence or incident triggers attention', value: 1 },
      { label: 'Managers or H&S review major changes as they happen', value: 2 },
      { label: 'We have defined triggers plus ongoing team-level indicators', value: 3 },
    ],
  },
  {
    id: 'detection_2',
    dimension: 'detection',
    prompt: 'Can you see sustained changes in how work is happening between formal assessments?',
    context: 'For example meeting demand, after-hours activity, uninterrupted calendar availability or coordination load.',
    options: [
      { label: 'No, not consistently', value: 0 },
      { label: 'Only through manual observation or anecdotes', value: 1 },
      { label: 'For some teams or some indicators', value: 2 },
      { label: 'Yes, with defined team-level trends and thresholds', value: 3 },
    ],
  },
  {
    id: 'detection_3',
    dimension: 'detection',
    prompt: 'How do you distinguish a temporary busy period from a persistent change in working conditions?',
    context: 'The issue is persistence, not whether one week looks busy.',
    options: [
      { label: 'We generally do not distinguish them', value: 0 },
      { label: 'Managers make a judgement case by case', value: 1 },
      { label: 'We compare several weeks of evidence', value: 2 },
      { label: 'We compare against a baseline and track duration and context', value: 3 },
    ],
  },
  {
    id: 'investigation_1',
    dimension: 'investigation',
    prompt: 'When a concern appears, how is worker consultation connected to the evidence?',
    context: 'A signal should focus the conversation, not replace it.',
    options: [
      { label: 'Consultation is mostly separate or reactive', value: 0 },
      { label: 'Managers talk to workers, but without a consistent evidence trail', value: 1 },
      { label: 'We bring specific observations into worker consultation', value: 2 },
      { label: 'Observation, consultation and decisions are linked in one review record', value: 3 },
    ],
  },
  {
    id: 'investigation_2',
    dimension: 'investigation',
    prompt: 'Can you connect a change in work patterns to organisational context?',
    context: 'Examples include a restructure, vacancy, delivery deadline, new system or leadership change.',
    options: [
      { label: 'Usually not', value: 0 },
      { label: 'Only if someone remembers the context', value: 1 },
      { label: 'Major changes are documented and considered', value: 2 },
      { label: 'Context is recorded alongside the observed pattern and worker views', value: 3 },
    ],
  },
  {
    id: 'investigation_3',
    dimension: 'investigation',
    prompt: 'How many evidence sources are normally used before deciding what the problem is?',
    context: 'Strong investigations combine worker voice, work evidence and organisational context.',
    options: [
      { label: 'Usually one source', value: 0 },
      { label: 'Two sources, but inconsistently', value: 1 },
      { label: 'Several sources for material risks', value: 2 },
      { label: 'Multiple sources are expected and contradictions are documented', value: 3 },
    ],
  },
  {
    id: 'verification_1',
    dimension: 'verification',
    prompt: 'Before implementing a control, do you define what should change if it works?',
    context: 'A control is difficult to verify if the expected effect was never stated.',
    options: [
      { label: 'Rarely', value: 0 },
      { label: 'Informally', value: 1 },
      { label: 'For important controls', value: 2 },
      { label: 'Yes, with explicit expected effects and review timing', value: 3 },
    ],
  },
  {
    id: 'verification_2',
    dimension: 'verification',
    prompt: 'After a control is implemented, how do you check whether it actually changed the work?',
    context: 'Think before/after evidence, not whether the action was completed.',
    options: [
      { label: 'We mainly confirm the action was completed', value: 0 },
      { label: 'We ask for feedback later', value: 1 },
      { label: 'We compare some before/after evidence', value: 2 },
      { label: 'We compare before/after evidence and check whether improvement was sustained', value: 3 },
    ],
  },
  {
    id: 'verification_3',
    dimension: 'verification',
    prompt: 'Do you check whether demand moved somewhere else after an intervention?',
    context: 'A meeting reduction can move demand into messages, evenings, another role or another team.',
    options: [
      { label: 'No', value: 0 },
      { label: 'Only if someone reports a new problem', value: 1 },
      { label: 'Sometimes for higher-risk changes', value: 2 },
      { label: 'Yes, migration is part of the control review', value: 3 },
    ],
  },
  {
    id: 'governance_1',
    dimension: 'governance',
    prompt: 'At what level is digital work-pattern evidence analysed?',
    context: 'The safer unit is the work system or sufficiently large group, not the individual employee.',
    options: [
      { label: 'Individual-level data is commonly available to managers', value: 0 },
      { label: 'It varies by tool or team', value: 1 },
      { label: 'Mostly team-level, with some exceptions', value: 2 },
      { label: 'Team-level only, with enforced minimum group sizes', value: 3 },
    ],
  },
  {
    id: 'governance_2',
    dimension: 'governance',
    prompt: 'How clearly do you separate an observation from a conclusion about people?',
    context: '“Meeting load increased” is an observation. “This employee is stressed” is a conclusion.',
    options: [
      { label: 'The distinction is not formalised', value: 0 },
      { label: 'We rely on manager judgement', value: 1 },
      { label: 'Guidance exists for sensitive interpretations', value: 2 },
      { label: 'The product and process explicitly prevent individual diagnosis or scoring', value: 3 },
    ],
  },
  {
    id: 'governance_3',
    dimension: 'governance',
    prompt: 'Are allowed and prohibited uses of workforce data documented and visible to workers?',
    context: 'Trust depends on knowing what the data cannot be used for.',
    options: [
      { label: 'No clear policy', value: 0 },
      { label: 'General privacy policy only', value: 1 },
      { label: 'Specific internal rules exist', value: 2 },
      { label: 'Purpose, prohibited uses, access and retention are explicit and communicated', value: 3 },
    ],
  },
];

const DIMENSION_LABELS: Record<Dimension, string> = {
  detection: 'Detection',
  investigation: 'Investigation',
  verification: 'Control verification',
  governance: 'Governance & privacy',
};

const LEVEL_LABELS = {
  reactive: 'Reactive evidence',
  developing: 'Developing evidence',
  structured: 'Structured evidence',
  continuous: 'Continuous evidence',
};

const NEXT_ACTION: Record<Dimension, string> = {
  detection:
    'Define what should trigger a review between formal assessments and which team-level work changes are worth watching.',
  investigation:
    'Link observed change, worker consultation and organisational context in the same investigation record.',
  verification:
    'State the expected effect before a control is implemented, then compare before/after evidence and check for migration.',
  governance:
    'Move the unit of analysis to sufficiently large groups and document prohibited uses such as individual productivity or health scoring.',
};

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `control-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ControlEvidenceAssessment() {
  const [searchParams] = useSearchParams();
  const market = searchParams.get('market') || 'global';
  const [sessionId] = useState(createSessionId);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [error, setError] = useState('');
  const [contact, setContact] = useState({ email: '', organization: '', role: '', consentGiven: false });
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const currentQuestion = QUESTIONS[step];
  const progress = result ? 100 : Math.round((step / QUESTIONS.length) * 100);

  useEffect(() => {
    trackEvent('control_assessment_viewed', { market });
  }, [market]);

  const attribution = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const data = getOriginalAttribution();
    return {
      source: data.source,
      medium: data.medium,
      campaign: data.campaign,
      content: data.content,
      term: data.term,
      referrer: data.referrer,
    };
  }, []);

  const completeAssessment = async (nextAnswers: Record<string, Answer>) => {
    setLoadingResult(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/assessment/control-maturity/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          market,
          sourcePath: window.location.pathname,
          attribution,
          answers: QUESTIONS.map((question) => nextAnswers[question.id]),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not calculate your result.');
      setResult(data);
      trackEvent('control_assessment_completed', {
        market,
        score: data.score,
        level: data.level,
        weakest_dimension: data.weakestDimension,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not calculate your result.');
    } finally {
      setLoadingResult(false);
    }
  };

  const chooseOption = async (question: Question, option: { label: string; value: number }) => {
    const nextAnswers = {
      ...answers,
      [question.id]: {
        questionId: question.id,
        dimension: question.dimension,
        value: option.value,
        label: option.label,
      },
    };
    setAnswers(nextAnswers);

    if (step === 0 && Object.keys(answers).length === 0) {
      trackEvent('control_assessment_started', { market });
    }

    if (step === QUESTIONS.length - 1) {
      await completeAssessment(nextAnswers);
    } else {
      setStep((value) => value + 1);
    }
  };

  const submitContact = async (event: FormEvent) => {
    event.preventDefault();
    setClaiming(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/assessment/control-maturity/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...contact }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not email your result.');
      setClaimed(true);
      trackEvent('control_assessment_lead_confirmed', {
        market,
        score: result?.score,
        level: result?.level,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not email your result.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PageMeta
        title="Psychosocial Control Evidence Maturity Assessment | SignalTrue"
        description="Assess how well your organisation detects change, investigates risk, verifies controls and protects worker privacy. Get a 0-100 control-evidence maturity score."
        path="/control-evidence-assessment"
      />

      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-body font-bold text-[#0F172A]">
            SignalTrue
          </Link>
          <div className="flex items-center gap-2 text-caption text-[#64748B]">
            <ShieldCheck className="h-4 w-4 text-brand" />
            No individual health or productivity scoring
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        {!result ? (
          <>
            <div className="mb-10 max-w-3xl">
              <p className="mb-3 text-caption font-bold uppercase tracking-wider text-brand">
                5-7 minute assessment
              </p>
              <h1 className="text-section font-bold sm:text-display">
                Can you prove your psychosocial risk controls are working?
              </h1>
              <p className="mt-4 max-w-2xl text-body text-[#475569]">
                Measure the maturity of your evidence loop across detection, investigation, control
                verification and privacy governance. This is a maturity diagnostic, not a legal or
                compliance assessment.
              </p>
            </div>

            <div className="mb-5 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${Math.max(progress, 4)}%` }}
              />
            </div>

            <div className="rounded-container border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
              {loadingResult ? (
                <div className="py-16 text-center">
                  <p className="text-body font-bold">Calculating your evidence maturity...</p>
                  <p className="mt-2 text-caption text-[#64748B]">
                    The score is calculated server-side so future benchmark data uses one method.
                  </p>
                </div>
              ) : currentQuestion ? (
                <>
                  <div className="mb-6 flex items-center justify-between text-caption text-[#64748B]">
                    <span>
                      Question {step + 1} of {QUESTIONS.length}
                    </span>
                    <span>{DIMENSION_LABELS[currentQuestion.dimension]}</span>
                  </div>
                  <h2 className="text-subsection font-bold">{currentQuestion.prompt}</h2>
                  <p className="mt-2 text-caption leading-6 text-[#64748B]">
                    {currentQuestion.context}
                  </p>

                  <div className="mt-7 grid gap-3">
                    {currentQuestion.options.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => chooseOption(currentQuestion, option)}
                        className="flex w-full items-center justify-between rounded-control border border-[#CBD5E1] bg-white px-5 py-4 text-left text-caption font-semibold text-[#1E293B] transition hover:border-brand hover:bg-brand-softer"
                      >
                        <span>{option.label}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                      </button>
                    ))}
                  </div>

                  {step > 0 ? (
                    <button
                      type="button"
                      onClick={() => setStep((value) => Math.max(0, value - 1))}
                      className="mt-6 inline-flex items-center gap-2 text-caption font-semibold text-[#64748B] hover:text-[#0F172A]"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Previous question
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-container border border-[#E2E8F0] bg-white p-7 shadow-sm sm:p-9">
              <p className="text-caption font-bold uppercase tracking-wider text-brand">
                Your control-evidence maturity
              </p>
              <div className="mt-3 flex items-end gap-3">
                <span className="text-[4rem] font-bold leading-none text-[#0F172A]">{result.score}</span>
                <span className="pb-2 text-body font-semibold text-[#64748B]">/100</span>
              </div>
              <p className="mt-3 text-subsection font-bold">{LEVEL_LABELS[result.level]}</p>

              <div className="mt-7 grid gap-3">
                {(Object.keys(result.dimensions) as Dimension[]).map((dimension) => (
                  <div key={dimension}>
                    <div className="mb-1 flex justify-between text-caption">
                      <span className="font-semibold">{DIMENSION_LABELS[dimension]}</span>
                      <span>{result.dimensions[dimension]}/100</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${result.dimensions[dimension]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-control border border-[#BFDBFE] bg-[#EFF6FF] p-5">
                <p className="text-caption font-bold text-[#1E3A8A]">Largest evidence gap</p>
                <p className="mt-1 text-body font-bold text-[#0F172A]">
                  {DIMENSION_LABELS[result.weakestDimension]}
                </p>
                <p className="mt-2 text-caption leading-6 text-[#334155]">
                  {NEXT_ACTION[result.weakestDimension]}
                </p>
              </div>

              <p className="mt-6 text-caption leading-6 text-[#64748B]">
                This score describes process maturity. It is not a finding of legal compliance, a
                health assessment or a judgement about individual workers.
              </p>
            </section>

            <aside className="rounded-container border border-[#E2E8F0] bg-white p-7 shadow-sm sm:p-8">
              {!claimed ? (
                <>
                  <h2 className="text-subsection font-bold">Keep the result and benchmark it later</h2>
                  <p className="mt-2 text-caption leading-6 text-[#64748B]">
                    We will email this result and its four-dimension breakdown. As the anonymous
                    dataset grows, SignalTrue can also publish aggregate benchmarks without exposing
                    individual organisations.
                  </p>

                  <form onSubmit={submitContact} className="mt-6 grid gap-4">
                    <label className="grid gap-1.5 text-caption font-semibold">
                      Work email
                      <input
                        type="email"
                        required
                        value={contact.email}
                        onChange={(event) =>
                          setContact((value) => ({ ...value, email: event.target.value }))
                        }
                        className="min-h-11 rounded-control border border-[#CBD5E1] px-3 font-normal outline-none focus:border-brand"
                      />
                    </label>
                    <label className="grid gap-1.5 text-caption font-semibold">
                      Organisation
                      <input
                        required
                        value={contact.organization}
                        onChange={(event) =>
                          setContact((value) => ({ ...value, organization: event.target.value }))
                        }
                        className="min-h-11 rounded-control border border-[#CBD5E1] px-3 font-normal outline-none focus:border-brand"
                      />
                    </label>
                    <label className="grid gap-1.5 text-caption font-semibold">
                      Role <span className="font-normal text-[#94A3B8]">(optional)</span>
                      <input
                        value={contact.role}
                        onChange={(event) =>
                          setContact((value) => ({ ...value, role: event.target.value }))
                        }
                        className="min-h-11 rounded-control border border-[#CBD5E1] px-3 font-normal outline-none focus:border-brand"
                      />
                    </label>
                    <label className="flex items-start gap-3 text-caption leading-5 text-[#475569]">
                      <input
                        type="checkbox"
                        required
                        checked={contact.consentGiven}
                        onChange={(event) =>
                          setContact((value) => ({
                            ...value,
                            consentGiven: event.target.checked,
                          }))
                        }
                        className="mt-1"
                      />
                      <span>
                        Email me this result and relevant SignalTrue material about psychosocial
                        control evidence. I can opt out at any time.
                      </span>
                    </label>

                    {error ? <p className="text-caption font-semibold text-red-700">{error}</p> : null}

                    <button
                      type="submit"
                      disabled={claiming}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-5 py-3 text-caption font-bold text-white hover:bg-brand-hover disabled:opacity-60"
                    >
                      {claiming ? 'Saving...' : 'Email my result'}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="py-4">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  <h2 className="mt-4 text-subsection font-bold">Result saved</h2>
                  <p className="mt-2 text-caption leading-6 text-[#64748B]">
                    The result has been emailed to you. If the weakest dimension reflects a live
                    issue, the next useful step is to review what evidence you already have and what
                    is missing.
                  </p>
                  <Link
                    to="/contact?intent=demo&cta=control_evidence_assessment"
                    className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-control bg-brand px-5 py-3 text-caption font-bold text-white hover:bg-brand-hover"
                  >
                    Review the evidence gap
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
