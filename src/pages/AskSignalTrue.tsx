import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Loader2,
  MessageSquareText,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { trackEvent } from '../lib/analytics';

type Source = {
  source: string;
  section: string;
  url?: string;
};

type Answer = {
  response: string;
  sources: Source[];
  leadTrigger?: string | null;
};

const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_API_URL || 'https://signaltrue-backend.onrender.com'
    : '';

const STARTER_QUESTIONS = [
  'We reduced recurring meetings. How do we prove the control actually worked?',
  'What does Safe Work Australia expect when reviewing psychosocial controls?',
  'What evidence should we collect after introducing right-to-disconnect boundaries?',
  'How can SignalTrue help without monitoring individual employees?',
];

export default function AskSignalTrue() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    trackEvent('ask_signaltrue_viewed');
  }, []);

  const ask = async (nextQuestion: string) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) return;

    setQuestion(trimmed);
    setLoading(true);
    setError('');
    setAnswer(null);
    trackEvent('ask_signaltrue_question_submitted', {
      question_length: trimmed.length,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          sessionId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not answer the question.');

      if (data.sessionId) setSessionId(data.sessionId);
      setAnswer({
        response: data.response,
        sources: data.sources || [],
        leadTrigger: data.leadTrigger || null,
      });
      trackEvent('ask_signaltrue_answer_received', {
        source_count: Array.isArray(data.sources) ? data.sources.length : 0,
        lead_triggered: Boolean(data.leadTrigger),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not answer the question.');
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(question);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PageMeta
        title="Ask SignalTrue | Psychosocial Control Evidence Q&A"
        description="Ask practical questions about psychosocial control reviews, workload migration, privacy, and jurisdiction-specific expectations. Answers are constrained to SignalTrue documentation and named public sources."
        path="/ask"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white">
          <div className="container mx-auto px-6 py-16 lg:py-20">
            <div className="mx-auto max-w-5xl text-center">
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-brand-soft bg-brand-softer px-3 py-1.5 text-caption font-bold text-brand">
                <MessageSquareText className="h-4 w-4" />
                Ask SignalTrue
              </div>
              <h1 className="mx-auto max-w-4xl text-section font-bold sm:text-display">
                Ask the question your risk register cannot answer by itself.
              </h1>
              <p className="mx-auto mt-5 max-w-3xl text-body leading-8 text-[#475569]">
                Ask about control effectiveness, workload migration, worker consultation, privacy,
                or jurisdiction context. Answers use SignalTrue documentation and named public
                evidence sources, not open-ended web speculation.
              </p>
              <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-4 text-caption text-[#64748B]">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand" /> No employee data required
                </span>
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-brand" /> Sources shown when available
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-12 lg:py-16">
          <div className="mx-auto max-w-5xl">
            <form
              onSubmit={submit}
              className="rounded-container border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-7"
            >
              <label className="text-caption font-bold text-[#334155]" htmlFor="ask-signaltrue">
                Your question
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <textarea
                  ref={inputRef}
                  id="ask-signaltrue"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Example: We reduced meetings by 30%. What else should we check before saying the control worked?"
                  className="min-h-[104px] flex-1 resize-none rounded-control border border-[#CBD5E1] bg-white px-4 py-3 text-body leading-7 outline-none focus:border-brand"
                />
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-6 py-3 text-caption font-bold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#94A3B8] sm:self-end"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Thinking
                    </>
                  ) : (
                    <>
                      Ask <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {STARTER_QUESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => void ask(item)}
                  className="rounded-control border border-[#E2E8F0] bg-white p-4 text-left text-caption font-semibold leading-6 text-[#334155] transition hover:border-brand-soft hover:bg-brand-softer"
                >
                  {item}
                </button>
              ))}
            </div>

            {error ? (
              <div className="mt-7 rounded-control border border-red-200 bg-red-50 p-4 text-caption text-red-900">
                {error}
              </div>
            ) : null}

            {answer ? (
              <section className="mt-8 rounded-container border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  SignalTrue answer
                </p>
                <div className="mt-4 whitespace-pre-wrap text-body leading-8 text-[#334155]">
                  {answer.response}
                </div>

                {answer.sources.length ? (
                  <div className="mt-8 border-t border-[#E2E8F0] pt-6">
                    <p className="text-caption font-bold text-[#334155]">Sources used</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {answer.sources.map((source, index) =>
                        source.url ? (
                          <a
                            key={`${source.source}-${source.section}-${index}`}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-control border border-[#E2E8F0] bg-[#F8FAFC] p-4 hover:border-brand-soft"
                          >
                            <p className="text-caption font-bold text-[#0F172A]">{source.source}</p>
                            <p className="mt-1 text-caption text-[#64748B]">{source.section}</p>
                            <span className="mt-2 inline-flex items-center gap-1 text-caption font-bold text-brand">
                              Open source <ExternalLink className="h-3.5 w-3.5" />
                            </span>
                          </a>
                        ) : (
                          <div
                            key={`${source.source}-${source.section}-${index}`}
                            className="rounded-control border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                          >
                            <p className="text-caption font-bold text-[#0F172A]">{source.source}</p>
                            <p className="mt-1 text-caption text-[#64748B]">{source.section}</p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="mt-8 rounded-container border border-brand-soft bg-brand-softer p-5">
                  <p className="font-bold">Turn the answer into a review, not another document.</p>
                  <p className="mt-2 text-caption leading-6 text-[#475569]">
                    Use the free control tool to convert the question into an evidence plan with
                    before/after checks, migration risks, worker questions, and review timing.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Link
                      to="/did-the-control-work"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand px-4 py-2.5 text-caption font-bold text-white hover:bg-brand-hover"
                    >
                      Build the evidence plan <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      to="/controls"
                      className="inline-flex min-h-11 items-center justify-center rounded-control border border-brand bg-white px-4 py-2.5 text-caption font-bold text-brand hover:bg-white"
                    >
                      Browse control guides
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
