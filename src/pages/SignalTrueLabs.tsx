import { ArrowRight, BarChart3, CheckCircle2, FlaskConical, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';
import { trackEvent } from '../lib/analytics';
import { useEffect } from 'react';

const QUESTIONS = [
  'Which psychosocial controls are organisations trying most often?',
  'Which evidence layer is most commonly missing after a control is introduced?',
  'How often do organisations check for workload migration?',
  'Which interventions are easiest to verify with existing work-pattern evidence?',
  'Where do control-review methods differ by jurisdiction?',
];

export default function SignalTrueLabs() {
  useEffect(() => {
    trackEvent('signaltrue_labs_viewed');
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PageMeta
        title="SignalTrue Labs | Evidence on Whether Workplace Controls Actually Work"
        description="SignalTrue Labs is building an anonymised evidence base on psychosocial control verification: what organisations change, which evidence gaps remain, and where workload migrates."
        path="/labs"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white">
          <div className="container mx-auto px-6 py-16 lg:py-20">
            <div className="mx-auto max-w-5xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-soft bg-brand-softer px-3 py-1.5 text-caption font-bold text-brand">
                <FlaskConical className="h-4 w-4" />
                SignalTrue Labs
              </div>
              <h1 className="max-w-4xl text-section font-bold sm:text-display">
                Most organisations record what they changed. Very few can compare what happened next.
              </h1>
              <p className="mt-5 max-w-3xl text-body leading-8 text-[#475569]">
                SignalTrue Labs is building an evidence base around a narrower question: when an
                organisation introduces a workplace control, what evidence shows that the work
                actually changed, whether the change lasted, and whether pressure moved somewhere
                else?
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-12 lg:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-container border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <BarChart3 className="h-6 w-6 text-brand" />
                <h2 className="mt-4 text-subsection font-bold">Real review behaviour</h2>
                <p className="mt-3 text-caption leading-6 text-[#64748B]">
                  Anonymous use of the free review tool captures the selected hazard, control,
                  jurisdiction, evidence readiness, and which review layers are missing.
                </p>
              </div>
              <div className="rounded-container border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <ShieldCheck className="h-6 w-6 text-brand" />
                <h2 className="mt-4 text-subsection font-bold">No employee-level dataset</h2>
                <p className="mt-3 text-caption leading-6 text-[#64748B]">
                  The Labs foundation records control-review metadata, not employee identities,
                  health states, message content, or individual productivity.
                </p>
              </div>
              <div className="rounded-container border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <FlaskConical className="h-6 w-6 text-brand" />
                <h2 className="mt-4 text-subsection font-bold">No premature benchmark claims</h2>
                <p className="mt-3 text-caption leading-6 text-[#64748B]">
                  SignalTrue will not publish percentages or benchmarks until sample volume,
                  anonymity, and methodological quality are strong enough to support them.
                </p>
              </div>
            </div>

            <section className="mt-8 rounded-container border border-[#E2E8F0] bg-white p-7 sm:p-9">
              <p className="text-caption font-bold uppercase tracking-wider text-brand">
                The questions the dataset is designed to answer
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {QUESTIONS.map((question) => (
                  <div
                    key={question}
                    className="flex gap-3 rounded-control border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                  >
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                    <p className="text-caption font-semibold leading-6 text-[#334155]">{question}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-container border border-brand-soft bg-brand-softer p-7 sm:p-9">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  Contribute without giving us employee data
                </p>
                <h2 className="mt-2 text-section font-bold">Review one real control.</h2>
                <p className="mt-3 text-body leading-8 text-[#475569]">
                  Use the free control-review tool. Your selections help SignalTrue understand where
                  organisations struggle to verify interventions. The tool does not ask for employee
                  names or individual-level data.
                </p>
                <Link
                  to="/did-the-control-work"
                  className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-5 py-3 text-caption font-bold text-white hover:bg-brand-hover"
                >
                  Review one control <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="rounded-container border border-[#E2E8F0] bg-white p-7 sm:p-9">
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  Why this matters
                </p>
                <h2 className="mt-2 text-section font-bold">
                  The market has plenty of hazard lists. It has far less evidence about controls.
                </h2>
                <p className="mt-3 text-body leading-8 text-[#475569]">
                  SignalTrue Labs is intended to move the conversation from “we introduced an
                  intervention” toward “here is the evidence that working conditions changed, here is
                  what workers said, and here is what happened over time.”
                </p>
                <Link
                  to="/ask"
                  className="mt-6 inline-flex items-center gap-2 text-caption font-bold text-brand hover:text-brand-hover"
                >
                  Ask SignalTrue about the method <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
