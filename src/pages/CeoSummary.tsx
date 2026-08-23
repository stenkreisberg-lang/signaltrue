import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Minus,
  Printer,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';

interface Observation {
  direction: 'increased' | 'decreased' | 'stable';
  percentChange?: number;
  summary: string;
}

interface CeoSummaryData {
  organizationName: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  observations: {
    meetingLoadChange: Observation;
    afterHoursWork: Observation;
    coordinationPressure: Observation & { areasAffected?: string[] };
  };
  significance: { summary: string };
  riskDirection: {
    overall: 'improving' | 'stable' | 'worsening';
    trendConfidence: 'low' | 'medium' | 'high';
    explanation: string;
  };
  privacyStatement: {
    minTeamSize: number;
    noContentAccess: boolean;
    noIndividualMonitoring: boolean;
  };
  footer: string;
}

function DirectionIcon({ direction }: { direction: Observation['direction'] }) {
  if (direction === 'increased') return <TrendingUp className="h-5 w-5 text-amber-700" />;
  if (direction === 'decreased') return <TrendingDown className="h-5 w-5 text-emerald-700" />;
  return <Minus className="h-5 w-5 text-slate-500" />;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function CeoSummaryPage() {
  const { token } = useParams<{ token: string }>();
  const [summary, setSummary] = useState<CeoSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/trial/ceo-summary/${token}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Summary not found');
        setSummary(data.summary);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load summary');
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Preparing the executive brief…
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-700" />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Executive brief unavailable</h1>
          <p className="mt-3 text-slate-600">{error || 'This reviewed link may have expired.'}</p>
        </div>
      </div>
    );
  }

  const observations = [
    ['Meeting demand', summary.observations.meetingLoadChange],
    ['Recovery opportunity', summary.observations.afterHoursWork],
    ['Coordination pressure', summary.observations.coordinationPressure],
  ] as const;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <main className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm print:border-0 print:shadow-none sm:p-10">
        <header className="border-b border-slate-200 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Building2 className="h-5 w-5" /> Prepared for {summary.organizationName}
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Executive psychosocial risk decision brief
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                A team-level view of changing work conditions for leadership decisions. Not an
                employee health or performance score.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="no-print inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
            >
              <Printer className="h-4 w-4" /> Print or save PDF
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4" /> {formatDate(summary.periodStart)}–
              {formatDate(summary.periodEnd)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4" /> Generated {formatDate(summary.generatedAt)}
            </span>
          </div>
        </header>

        <section className="py-8">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Decision status
          </p>
          <div className="mt-3 rounded-2xl bg-slate-950 p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-300">Exposure direction</p>
                <p className="mt-1 text-2xl font-bold capitalize">
                  {summary.riskDirection.overall}
                </p>
              </div>
              <div className="rounded-full border border-slate-600 px-3 py-1 text-sm font-bold capitalize">
                {summary.riskDirection.trendConfidence} confidence
              </div>
            </div>
            <p className="mt-4 leading-7 text-slate-300">{summary.riskDirection.explanation}</p>
          </div>
        </section>

        <section className="border-t border-slate-200 py-8">
          <h2 className="text-2xl font-bold text-slate-950">
            What changed against qualified baselines
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {observations.map(([title, observation]) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2">
                  <DirectionIcon direction={observation.direction} />
                  <h3 className="font-bold text-slate-900">{title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{observation.summary}</p>
                {observation.percentChange != null && (
                  <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Recorded change {observation.percentChange}%
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 py-8">
          <h2 className="text-2xl font-bold text-slate-950">Why leadership should review this</h2>
          <p className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 leading-7 text-slate-700">
            {summary.significance.summary}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              [
                'Verify',
                'Ask Health & Safety what workers and managers have confirmed about context and cause.',
              ],
              [
                'Own',
                'Confirm a named operational owner and remove resource or decision barriers.',
              ],
              [
                'Review',
                'Require the same indicator, worker feedback and effectiveness decision at the review date.',
              ],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 py-8">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <h2 className="font-bold text-emerald-950">Use boundaries</h2>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
                {[
                  `Team-level reporting only; configured minimum ${summary.privacyStatement.minTeamSize || 5} people.`,
                  'No message or email content and no individual productivity scoring.',
                  'The evidence does not diagnose health, establish cause or replace worker consultation.',
                ].map((item) => (
                  <p key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 pt-6 text-sm text-slate-500">
          {summary.footer}
        </footer>
      </main>
    </div>
  );
}
