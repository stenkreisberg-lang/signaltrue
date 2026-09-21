import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Layers,
  Moon,
  Network,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';

const reviewCycle = [
  ['Assess', 'Use the organisation’s existing assessment, consultation and WHS process.'],
  ['Observe', 'See material, sustained changes in aggregated team work patterns.'],
  ['Investigate', 'Review the observation with workers and relevant operational evidence.'],
  ['Control', 'Record the organisational or work-design action and its accountable owner.'],
  ['Review', 'Observe whether the relevant work pattern subsequently changed.'],
];

const observable = [
  { icon: Clock3, label: 'Meeting load changed' },
  { icon: Layers, label: 'Focus-time availability changed' },
  { icon: Moon, label: 'After-hours activity changed' },
  { icon: Network, label: 'Work fragmentation changed' },
  { icon: Users, label: 'Manager coordination load changed' },
  { icon: CalendarClock, label: 'A change persisted across multiple periods' },
];

const cannotTell = [
  'Whether a worker is burned out or has a psychological injury',
  'Whether a psychosocial hazard legally exists',
  'Why a work pattern changed without investigation and consultation',
  'Whether an organisation is legally compliant',
  'Whether an employee is productive or should face an employment decision',
];

const evidenceTimeline = [
  ['12 Sep', 'Observation', 'After-hours activity was 31% above the established team baseline.'],
  ['18 Sep', 'Investigation', 'WHS review opened and operational context requested.'],
  ['22 Sep', 'Consultation', 'Workers discussed recurring late customer handovers.'],
  ['1 Oct', 'Control', 'Handover timing and recurring meeting schedule changed.'],
  ['29 Oct', 'Review', 'After-hours activity was 4% above the original baseline.'],
];

export default function AustraliaPsychosocialRisk() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="Psychosocial Control Effectiveness Evidence Australia | SignalTrue"
        description="Evidence for Australian WHS teams reviewing whether psychosocial controls changed the work. Privacy-conscious team-level work-pattern evidence, worker validation and clear limits."
        path="/au"
        lang="en-AU"
      />
      <Navbar />

      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-24">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-5xl text-center">
              <p className="mb-4 text-caption font-bold uppercase tracking-wider text-brand">
                SignalTrue Australia
              </p>
              <h1 className="text-display font-bold tracking-tight text-[#0F172A] sm:text-display lg:text-display">
                You implemented a psychosocial control. Did the work actually change?
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-lead leading-8 text-[#475569]">
                SignalTrue helps Australian WHS and psychosocial-risk teams review whether a control was followed by a meaningful, sustained change in aggregated work patterns, and whether pressure may simply have moved elsewhere.
              </p>
              <p className="mx-auto mt-4 max-w-3xl font-semibold text-[#334155]">
                Start with one control: workload redistribution, meeting reduction, role clarification, roster change or another work-design intervention. Observe what changed, validate it with workers, then decide what to do next.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to="/au/monitoring-gap-audit">
                    Review one control <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/au/8-week-pilot">See the 8-week control review pilot</Link>
                </Button>
              </div>
              <Link
                to="/sample-report"
                className="mt-5 inline-flex items-center text-caption font-semibold text-brand hover:underline"
              >
                See a fictional control review from baseline to decision <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <p className="mx-auto mt-5 max-w-3xl text-caption leading-6 text-[#64748B]">
                Designed to support an ISO 45003-informed psychosocial risk process within an ISO 45001 OH&amp;S context. Alignment does not mean certification or establish WHS compliance.{' '}
                <Link to="/au/standards-assurance" className="font-semibold text-brand hover:underline">See the standards mapping.</Link>
              </p>
              <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2 text-caption text-[#475569]">
                {[
                  'ISO 45003-informed workflow',
                  'Australian WHS control-review fit',
                  'Team-level, aggregated evidence',
                  'No individual risk or productivity scores',
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand" /> {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  The control-review gap
                </p>
                <h2 className="mt-3 text-section font-bold text-[#0F172A] sm:text-display">
                  The harder question starts after the assessment: did the control work?
                </h2>
                <p className="mt-5 leading-7 text-[#475569]">
                  Restructures, hiring constraints, project peaks, leadership changes and new
                  systems can alter working conditions between formal reviews. SignalTrue
                  complements—not replaces—risk assessment and worker consultation.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Day 1', 'Formal assessment and consultation'],
                  ['Days 2–364', 'Work design, workload and coordination continue changing'],
                  ['Next review', 'New snapshot of conditions'],
                ].map(([period, copy], index) => (
                  <article
                    key={period}
                    className="rounded-container border border-[#E2E8F0] bg-white p-5"
                  >
                    <p className="text-caption font-bold text-brand">{period}</p>
                    <p className="mt-2 text-caption leading-6 text-[#475569]">{copy}</p>
                    {index < 2 && <ArrowDown className="mt-4 h-4 w-4 text-[#94A3B8] sm:hidden" />}
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-caption font-bold uppercase tracking-wider text-brand">
                Where SignalTrue fits
              </p>
              <h2 className="mt-3 text-section font-bold text-[#0F172A]">
                OBSERVATION → INTERPRETATION → VALIDATION → ACTION
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-5">
              {reviewCycle.map(([title, copy], index) => (
                <article
                  key={title}
                  className={`rounded-container border p-5 ${
                    index === 1 || index === 4
                      ? 'border-[#93C5FD] bg-[#EFF6FF]'
                      : 'border-[#E2E8F0] bg-[#F8FAFC]'
                  }`}
                >
                  <p className="text-caption font-bold text-[#64748B]">0{index + 1}</p>
                  <h3 className="mt-2 font-bold text-[#0F172A]">{title}</h3>
                  <p className="mt-2 text-caption leading-6 text-[#475569]">{copy}</p>
                </article>
              ))}
            </div>
            <p className="mt-6 text-center text-caption text-[#64748B]">
              SignalTrue primarily supports the Observe and Review stages. The organisation remains
              responsible for investigation, consultation and WHS decisions.
            </p>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-section font-bold text-[#0F172A]">SignalTrue can show</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {observable.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex gap-3 rounded-container border border-[#E2E8F0] bg-white p-4"
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                      <span className="text-caption text-[#334155]">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-section font-bold text-[#0F172A]">
                  SignalTrue cannot determine
                </h2>
                <div className="mt-6 space-y-3">
                  {cannotTell.map((item) => (
                    <div
                      key={item}
                      className="flex gap-3 rounded-container border border-amber-200 bg-amber-50 p-4"
                    >
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                      <span className="text-caption text-amber-950">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-8 rounded-container bg-[#0F172A] p-5 text-center font-semibold text-white">
              Work-pattern data is evidence for investigation and consultation, not a diagnosis.
            </p>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-caption font-bold uppercase tracking-wider text-brand">Start from the control, not the dashboard</p>
              <h2 className="mt-3 text-section font-bold text-[#0F172A]">Four controls. Four evidence questions.</h2>
              <p className="mt-4 leading-7 text-[#475569]">SignalTrue is useful only when an observation connects to a decision. These examples show the level of specificity we expect before a pilot begins.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {[
                ['High job demands', 'Work was redistributed across the team', 'Did after-hours activity and meeting demand reduce without coordination load moving to another team?'],
                ['Low job control', 'Approval steps were simplified', 'Did response bottlenecks and coordination loops reduce, and do workers report greater practical control over workflow?'],
                ['Poor role clarity', 'Decision rights and hand-offs were clarified', 'Did repeated coordination and cross-team dependency patterns reduce after the change?'],
                ['Poor organisational change management', 'Change cadence and manager support were redesigned', 'Did manager coordination load and after-hours activity stabilise, and do workers validate the improvement?'],
              ].map(([hazard, control, question]) => (
                <article key={hazard} className="rounded-container border border-[#E2E8F0] bg-white p-6">
                  <p className="text-caption font-bold text-brand">{hazard}</p>
                  <h3 className="mt-2 font-bold text-[#0F172A]">{control}</h3>
                  <p className="mt-3 text-caption leading-6 text-[#475569]">{question}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-caption font-bold uppercase tracking-wider text-brand">
                  Example observation
                </p>
                <h2 className="mt-3 text-section font-bold text-[#0F172A]">
                  Evidence with its limits visible
                </h2>
                <p className="mt-4 leading-7 text-[#475569]">
                  Every observation should show the current value, baseline, duration, sample size,
                  data coverage, limitations and questions worth investigating.
                </p>
              </div>
              <article className="rounded-container border border-[#CBD5E1] bg-[#F8FAFC] p-7 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-caption font-bold text-brand">Work-pattern observation</p>
                    <h3 className="mt-1 text-lead font-bold text-[#0F172A]">
                      After-hours activity
                    </h3>
                  </div>
                  <BarChart3 className="h-7 w-7 text-brand" />
                </div>
                <p className="mt-5 text-body font-semibold text-[#0F172A]">
                  Activity outside configured working hours was 26% above this team’s established
                  baseline over the last three weeks.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-caption">
                  <div className="rounded-control bg-white p-3">
                    <strong>42</strong>
                    <br />
                    active workers
                  </div>
                  <div className="rounded-control bg-white p-3">
                    <strong>91%</strong>
                    <br />
                    data coverage
                  </div>
                </div>
                <div className="mt-5 border-t border-[#CBD5E1] pt-5 text-caption leading-6 text-[#475569]">
                  <strong className="text-[#0F172A]">What this does not mean:</strong> this
                  observation does not establish that workers are overworked or experiencing
                  psychosocial harm.
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] py-16 lg:py-20">
          <div className="container mx-auto max-w-5xl px-6">
            <div className="text-center">
              <p className="text-caption font-bold uppercase tracking-wider text-brand">
                Control evidence timeline
              </p>
              <h2 className="mt-3 text-section font-bold text-[#0F172A]">
                Connect an observation to what the organisation did next.
              </h2>
            </div>
            <div className="mt-10 overflow-hidden rounded-container border border-[#E2E8F0] bg-white">
              {evidenceTimeline.map(([date, stage, copy]) => (
                <div
                  key={`${date}-${stage}`}
                  className="grid gap-2 border-b border-[#E2E8F0] p-5 last:border-0 md:grid-cols-[90px_140px_1fr]"
                >
                  <strong className="text-[#0F172A]">{date}</strong>
                  <span className="text-caption font-bold text-brand">{stage}</span>
                  <span className="text-caption leading-6 text-[#475569]">{copy}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-center text-caption text-[#64748B]">
              A subsequent change can support review, but it does not by itself prove causation or
              legal effectiveness.
            </p>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="mb-10 rounded-container border border-[#BFDBFE] bg-[#EFF6FF] p-6 md:p-8">
              <p className="text-caption font-bold uppercase tracking-wider text-brand">The question Australian guidance already asks</p>
              <p className="mt-3 text-lead font-bold text-[#0F172A]">Are the controls working effectively, without creating new risks?</p>
              <p className="mt-3 max-w-4xl text-caption leading-6 text-[#475569]">
                Safe Work Australia says control measures should be reviewed regularly and changed or replaced when they are not working effectively. SignalTrue does not answer that legal question for you. It contributes one missing evidence source: whether relevant team work patterns changed after the control, and whether pressure may have moved elsewhere.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-caption font-semibold">
                <a href="https://www.safeworkaustralia.gov.au/book/health-care-and-social-assistance/managing-whs-risks/review-controls" target="_blank" rel="noreferrer" className="text-brand hover:underline">Safe Work Australia: Review controls</a>
                <Link to="/au/standards-assurance" className="text-brand hover:underline">How SignalTrue relates to WHS and ISO 45003</Link>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                [
                  ShieldCheck,
                  'Worker transparency',
                  'Explain the purpose, fields, access, retention, limitations and prohibited uses before monitoring starts.',
                  '/au/worker-transparency',
                ],
                [
                  FileCheck2,
                  'Privacy and security',
                  'Review the documented processing boundary, permissions and deployment-specific controls.',
                  '/au/trust',
                ],
                [
                  CalendarClock,
                  'Eight-week pilot',
                  'Test one defined use case with consultation, success measures and a final evidence pack.',
                  '/au/8-week-pilot',
                ],
              ].map(([Icon, title, copy, href]) => {
                const CardIcon = Icon as typeof ShieldCheck;
                return (
                  <article
                    key={String(title)}
                    className="rounded-container border border-[#E2E8F0] p-6"
                  >
                    <CardIcon className="h-6 w-6 text-brand" />
                    <h2 className="mt-4 text-lead font-bold text-[#0F172A]">{String(title)}</h2>
                    <p className="mt-3 text-caption leading-6 text-[#475569]">{String(copy)}</p>
                    <Link
                      to={String(href)}
                      className="mt-5 inline-flex items-center font-semibold text-brand hover:underline"
                    >
                      Learn more <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-section font-bold text-[#0F172A]">
              Start with one control you already changed.
            </h2>
            <p className="mt-5 text-body text-[#475569]">
              Assess how your organisation currently reviews psychosocial controls between formal
              assessments, then decide whether a controlled pilot is justified.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/au/monitoring-gap-audit">
                Review one control <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
