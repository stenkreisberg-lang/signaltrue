import { ArrowRight, CheckCircle2, Clock3, FileCheck2, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';

const weeks = [
  [
    'Week 1',
    'Readiness',
    'Confirm purpose, scope, worker consultation, privacy notice, roles, retention and the work groups included.',
  ],
  [
    'Week 2',
    'Connect',
    'Connect selected work systems, verify permissions, coverage and field exclusions.',
  ],
  [
    'Weeks 2–3',
    'Baseline',
    'Use available history to establish a qualified team baseline and document exclusions.',
  ],
  [
    'Weeks 3–5',
    'Observe',
    'Review material, persistent work-pattern changes and classify expected or unexplained context.',
  ],
  [
    'Weeks 5–7',
    'Act',
    'Investigate with workers and record one proportionate work-design or organisational control.',
  ],
  [
    'Week 8',
    'Review',
    'Compare subsequent observations and produce a Psychosocial Control Evidence Pack.',
  ],
];

const successMeasures = [
  'Was the connected data reliable enough to support team-level observations?',
  'Did SignalTrue surface information that was worth investigating?',
  'Did the evidence improve a worker consultation or WHS review?',
  'Could an accountable owner record and review a control?',
  'Could executives understand the final evidence pack and its limitations?',
  'Did workers understand what SignalTrue used and what it could not determine?',
];

export default function AustraliaPilot() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="8-Week Australian Psychosocial Control Pilot | SignalTrue"
        description="A controlled eight-week pilot to establish team baselines, observe changing work patterns, investigate with workers and review evidence after a work-design control."
        path="/au/8-week-pilot"
        lang="en-AU"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-24">
          <div className="container mx-auto max-w-5xl px-6 text-center">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">
              Australian pilot
            </p>
            <h1 className="mt-4 text-display font-bold text-[#0F172A] sm:text-display lg:text-display">
              Eight weeks to see what happens between your psychosocial risk assessments.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lead leading-8 text-[#475569]">
              Test whether privacy-preserving, team-level work-pattern evidence improves the way one
              defined control is investigated, documented and reviewed.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/au/monitoring-gap-audit">Run the Monitoring Gap Audit</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/contact?intent=au-pilot&cta=au_pilot_hero">
                  Discuss pilot readiness <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] py-16">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="grid gap-5 md:grid-cols-3">
              {[
                [
                  Users,
                  'Defined scope',
                  'One agreed use case, eligible work groups and accountable WHS and operational owners.',
                ],
                [
                  ShieldCheck,
                  'Readiness before telemetry',
                  'Purpose, consultation, privacy notice, retention, roles and jurisdiction confirmed first.',
                ],
                [
                  FileCheck2,
                  'Evidence—not a certificate',
                  'The output records observations, investigation, consultation, controls and limitations.',
                ],
              ].map(([Icon, title, copy]) => {
                const CardIcon = Icon as typeof Users;
                return (
                  <article
                    key={String(title)}
                    className="rounded-container border border-[#E2E8F0] bg-white p-6"
                  >
                    <CardIcon className="h-6 w-6 text-brand" />
                    <h2 className="mt-4 text-lead font-bold text-[#0F172A]">{String(title)}</h2>
                    <p className="mt-3 text-caption leading-6 text-[#475569]">{String(copy)}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto max-w-5xl px-6">
            <div className="text-center">
              <Clock3 className="mx-auto h-8 w-8 text-brand" />
              <h2 className="mt-4 text-section font-bold text-[#0F172A]">
                How the eight weeks run
              </h2>
            </div>
            <div className="mt-10 overflow-hidden rounded-container border border-[#E2E8F0]">
              {weeks.map(([period, stage, copy]) => (
                <div
                  key={period}
                  className="grid gap-2 border-b border-[#E2E8F0] p-5 last:border-0 md:grid-cols-[130px_130px_1fr]"
                >
                  <strong className="text-[#0F172A]">{period}</strong>
                  <span className="text-caption font-bold text-brand">{stage}</span>
                  <span className="text-caption leading-6 text-[#475569]">{copy}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-caption leading-6 text-[#64748B]">
              Timing depends on historical data availability and implementation readiness.
              SignalTrue will not enable production telemetry before required customer confirmations
              and deployment-specific controls are complete.
            </p>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <h2 className="text-section font-bold text-[#0F172A]">Pilot output</h2>
                <div className="mt-6 rounded-container border border-[#93C5FD] bg-[#EFF6FF] p-7">
                  <p className="text-caption font-bold uppercase tracking-wider text-brand">
                    Final deliverable
                  </p>
                  <h3 className="mt-2 text-lead font-bold text-[#0F172A]">
                    Psychosocial Control Evidence Pack
                  </h3>
                  <ul className="mt-5 space-y-3 text-caption leading-6 text-[#334155]">
                    {[
                      'Scope and method',
                      'Data coverage and baseline',
                      'Team-level observations',
                      'Investigation and consultation record',
                      'Control ownership and timing',
                      'Subsequent observations',
                      'Mandatory limitations and audit information',
                    ].map((item) => (
                      <li key={item} className="flex gap-2">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <h2 className="text-section font-bold text-[#0F172A]">Success questions</h2>
                <div className="mt-6 space-y-3">
                  {successMeasures.map((item) => (
                    <div
                      key={item}
                      className="rounded-container border border-[#E2E8F0] bg-white p-4 text-caption leading-6 text-[#334155]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-section font-bold text-[#0F172A]">
              A pilot does not certify compliance.
            </h2>
            <p className="mt-5 leading-7 text-[#475569]">
              SignalTrue provides implementation tools and evidence. The customer remains
              responsible for legal obligations, psychosocial risk assessment, worker consultation
              and decisions about controls.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/contact?intent=au-pilot&cta=au_pilot_final">
                Discuss an Australian pilot <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
