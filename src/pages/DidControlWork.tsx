import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { trackEvent } from '../lib/analytics';

type AnswerValue = 0 | 1 | 2;

type Question = {
  id: string;
  question: string;
  context?: string;
  answers: Array<{ label: string; value: AnswerValue }>;
  gapTitle: string;
  gapCopy: string;
};

const QUESTIONS: Question[] = [
  {
    id: 'assessment',
    question: 'Have you completed a psychosocial risk assessment?',
    answers: [
      { label: 'Yes, within the last 12 months', value: 2 },
      { label: 'Yes, but more than 12 months ago / still in progress', value: 1 },
      { label: 'No', value: 0 },
    ],
    gapTitle: 'Assessment basis is weak or outdated',
    gapCopy: 'A control review needs a clear starting point: what risk was identified, where, and for whom.',
  },
  {
    id: 'specificRisk',
    question: 'Did the assessment identify a specific hazard or exposure area?',
    answers: [
      { label: 'Yes, specific hazard and affected work group', value: 2 },
      { label: 'Only broad organisational themes', value: 1 },
      { label: 'Not clearly', value: 0 },
    ],
    gapTitle: 'The risk is too broad to review',
    gapCopy: 'If the risk is not specific, it is difficult to connect a control to a measurable change in work.',
  },
  {
    id: 'control',
    question: 'For the risk you are managing, is there a defined control?',
    answers: [
      { label: 'Yes', value: 2 },
      { label: 'Partly / several actions but no clear control', value: 1 },
      { label: 'No', value: 0 },
    ],
    gapTitle: 'The control is not clearly defined',
    gapCopy: 'A review should test one intended change, not a collection of unrelated wellbeing activities.',
  },
  {
    id: 'outcome',
    question: 'Did you define what should change if the control works?',
    context: 'For example: less after-hours work, lower meeting burden, more recovery time or fewer handoff delays.',
    answers: [
      { label: 'Yes, with a measurable outcome', value: 2 },
      { label: 'Only a broad desired outcome', value: 1 },
      { label: 'No', value: 0 },
    ],
    gapTitle: 'No measurable control outcome',
    gapCopy: 'You can prove an intervention happened, but not whether it changed the exposure it was meant to reduce.',
  },
  {
    id: 'baseline',
    question: 'Do you have a baseline from before the control was introduced?',
    answers: [
      { label: 'Yes, comparable evidence exists', value: 2 },
      { label: 'Partly / limited baseline', value: 1 },
      { label: 'No', value: 0 },
    ],
    gapTitle: 'No reliable baseline',
    gapCopy: 'Without a pre-control baseline, normal fluctuation can easily be mistaken for improvement.',
  },
  {
    id: 'reviewEvidence',
    question: 'How will you determine whether the control worked?',
    answers: [
      { label: 'Worker consultation plus operational evidence', value: 2 },
      { label: 'Survey or operational evidence only', value: 1 },
      { label: 'Manager judgement / not defined', value: 0 },
    ],
    gapTitle: 'The review depends on one evidence source',
    gapCopy: 'Worker experience and operational work patterns answer different questions. Strong review evidence uses both.',
  },
  {
    id: 'migration',
    question: 'Can you see whether the problem moved somewhere else?',
    context: 'For example: fewer meetings but more after-hours email, chat or coordination work.',
    answers: [
      { label: 'Yes', value: 2 },
      { label: 'Partly', value: 1 },
      { label: 'No', value: 0 },
    ],
    gapTitle: 'Risk migration is invisible',
    gapCopy: 'A control can improve one metric while moving demand into another channel, time period or work group.',
  },
  {
    id: 'reviewDecision',
    question: 'Is there a defined review date and decision point?',
    answers: [
      { label: 'Yes, date and decision are defined', value: 2 },
      { label: 'Review date only', value: 1 },
      { label: 'No', value: 0 },
    ],
    gapTitle: 'No clear review decision',
    gapCopy: 'A control should end in a human decision: maintain, modify, replace, investigate further or gather more evidence.',
  },
];

function scoreLabel(score: number) {
  if (score >= 85) return 'Strong control-review foundation';
  if (score >= 65) return 'Reviewable, but important gaps remain';
  if (score >= 40) return 'Material gaps in your control-review process';
  return 'Too many gaps to confidently judge control effectiveness';
}

export default function DidControlWork() {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    trackEvent('did_control_work_viewed', { campaign: 'people_at_work_transition' });
  }, []);

  const answeredCount = Object.keys(answers).length;
  const score = useMemo(() => {
    const total = Object.values(answers).reduce<number>((sum, value) => sum + value, 0);
    return Math.round((total / (QUESTIONS.length * 2)) * 100);
  }, [answers]);

  const gaps = useMemo(
    () =>
      QUESTIONS
        .filter((q) => (answers[q.id] ?? 2) < 2)
        .sort((a, b) => (answers[a.id] ?? 2) - (answers[b.id] ?? 2))
        .slice(0, 4),
    [answers]
  );

  const finish = () => {
    if (answeredCount !== QUESTIONS.length) return;
    setShowResult(true);
    trackEvent('did_control_work_completed', {
      score,
      gap_count: gaps.length,
      campaign: 'people_at_work_transition',
    });
    window.setTimeout(() => {
      document.getElementById('diagnostic-result')?.scrollIntoView({ behavior: 'smooth' });
    }, 20);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PageMeta
        title="People at Work closed. Is your psychosocial control review ready? | SignalTrue"
        description="A two-minute diagnostic for Australian organisations to find gaps between psychosocial risk assessment, the control introduced and the evidence needed to review whether it worked."
        path="/did-the-control-work"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white">
          <div className="container mx-auto max-w-5xl px-6 py-16 lg:py-20">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">
              Australia · 2-minute control-review diagnostic
            </p>
            <h1 className="mt-4 max-w-4xl text-section font-bold sm:text-display">
              People at Work closed on 2 October. Is your psychosocial risk process ready for what comes next?
            </h1>
            <p className="mt-6 max-w-3xl text-lead leading-8 text-[#475569]">
              Assessment identifies risk. The harder part is proving whether the control you introduced
              actually changed the conditions of work. Check where your current review process has gaps.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-caption text-[#475569]">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand" /> No sign-up
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand" /> No employee data
              </span>
              <span className="inline-flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 text-brand" /> Review aid, not legal advice
              </span>
            </div>
          </div>
        </section>

        <section className="container mx-auto max-w-5xl px-6 py-12 lg:py-16">
          <div className="rounded-container border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-caption font-bold uppercase tracking-wider text-brand">Check your process</p>
                <h2 className="mt-2 text-section font-bold">8 questions. About two minutes.</h2>
              </div>
              <p className="text-caption font-bold text-[#64748B]">{answeredCount}/8</p>
            </div>

            <div className="mt-8 space-y-8">
              {QUESTIONS.map((q, index) => (
                <div key={q.id} className="border-t border-[#E2E8F0] pt-7 first:border-0 first:pt-0">
                  <p className="text-caption font-bold text-brand">Question {index + 1}</p>
                  <h3 className="mt-2 text-lead font-bold">{q.question}</h3>
                  {q.context ? <p className="mt-2 text-caption leading-6 text-[#64748B]">{q.context}</p> : null}
                  <div className="mt-4 grid gap-3">
                    {q.answers.map((option) => {
                      const selected = answers[q.id] === option.value;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => {
                            setAnswers((current) => ({ ...current, [q.id]: option.value }));
                            setShowResult(false);
                          }}
                          className={
                            'rounded-control border px-4 py-3 text-left text-caption font-semibold transition ' +
                            (selected
                              ? 'border-brand bg-brand-softer text-[#0F172A]'
                              : 'border-[#E2E8F0] bg-white text-[#334155] hover:border-brand-soft')
                          }
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={answeredCount !== QUESTIONS.length}
              onClick={finish}
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-brand px-6 py-3 text-body font-bold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#94A3B8]"
            >
              Show my control-review gaps <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        {showResult ? (
          <section id="diagnostic-result" className="border-y border-[#E2E8F0] bg-white">
            <div className="container mx-auto max-w-5xl px-6 py-14 lg:py-18">
              <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
                <aside className="rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-7">
                  <p className="text-caption font-bold uppercase tracking-wider text-brand">Your readiness score</p>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-[4.5rem] font-bold leading-none">{score}</span>
                    <span className="pb-2 text-body font-semibold text-[#64748B]">/100</span>
                  </div>
                  <p className="mt-4 text-lead font-bold">{scoreLabel(score)}</p>
                </aside>

                <div>
                  <p className="text-caption font-bold uppercase tracking-wider text-brand">What needs attention</p>
                  <div className="mt-5 space-y-4">
                    {gaps.length ? (
                      gaps.map((gap) => (
                        <div key={gap.id} className="rounded-container border border-[#E2E8F0] p-5">
                          <h3 className="font-bold">{gap.gapTitle}</h3>
                          <p className="mt-2 text-caption leading-6 text-[#475569]">{gap.gapCopy}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-container border border-emerald-200 bg-emerald-50 p-5 text-caption leading-6 text-emerald-950">
                        Your process has all eight foundations. The remaining question is whether the evidence can be gathered consistently and turned into a clear human review decision.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-10 rounded-container border border-brand-soft bg-brand-softer p-7 sm:p-8">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">What if much of this evidence did not have to be assembled manually?</p>
                <h2 className="mt-3 text-section font-bold">
                  SignalTrue connects the assessment, the control and evidence about how work changed.
                </h2>
                <p className="mt-4 max-w-3xl text-body leading-7 text-[#475569]">
                  It can compare relevant team-level calendar and collaboration patterns before and after a control,
                  check whether the change lasted, flag possible workload migration, and keep worker consultation
                  beside the operational evidence. The final decision remains with the organisation.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/sample-report"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-6 py-3 font-bold text-white hover:bg-brand-hover"
                  >
                    See the fictional sample report <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/contact?intent=au-founding-review"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-brand bg-white px-6 py-3 font-bold text-brand hover:bg-white/70"
                  >
                    Start a founding review · AU$99
                  </Link>
                </div>

                <div className="mt-7 border-t border-brand-soft pt-6">
                  <p className="text-caption leading-6 text-[#475569]">
                    Want the thinking behind this approach? Read Sten Kreisberg's AHRI article on the gap between
                    psychosocial assessment and ongoing evidence.
                  </p>
                  <a
                    href="https://www.ahri.com.au/articles/how-to-assess-psychosocial-risk-exposure-before-its-too-late"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-caption font-bold text-brand hover:underline"
                  >
                    Read the AHRI article <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="bg-[#0F172A] py-14 text-white">
          <div className="container mx-auto max-w-4xl px-6 text-center">
            <p className="text-caption font-bold uppercase tracking-wider text-[#93C5FD]">Founding review</p>
            <h2 className="mt-3 text-section font-bold">One risk. One control. AU$99.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#CBD5E1]">
              The aim is to validate whether this review is useful, not to maximise pilot revenue.
              One team, one identified psychosocial risk, one control and one final evidence review.
            </p>
            <Link
              to="/contact?intent=au-founding-review"
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-control bg-white px-6 py-3 font-bold text-[#0F172A] hover:bg-[#E2E8F0]"
            >
              Start the AU$99 founding review <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
