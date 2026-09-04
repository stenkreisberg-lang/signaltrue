import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileCheck2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';
import { PrimaryCommercialCTA, SampleReportCTA } from '../components/CommercialCTA';

const phases = [
  {
    title: '1. Define the risk question',
    timing: 'Before access is connected',
    owner: 'Health & Safety lead',
    output: 'Purpose statement, in-scope teams, consultation plan and success measures.',
    icon: ClipboardCheck,
  },
  {
    title: '2. Establish safe coverage',
    timing: 'Setup and baseline period',
    owner: 'IT or systems administrator',
    output: 'Approved metadata sources, role access, group thresholds and coverage record.',
    icon: Database,
  },
  {
    title: '3. Review evidence with workers',
    timing: 'When a qualified pattern appears',
    owner: 'Health & Safety with the affected team',
    output: 'Verified context, alternative explanations and a proportionate control decision.',
    icon: Users,
  },
  {
    title: '4. Measure control effectiveness',
    timing: 'Normally after 14 and 28 days',
    owner: 'Named operational owner',
    output: 'Before-and-after evidence, worker feedback, review outcome and next decision.',
    icon: FileCheck2,
  },
];

const successMeasures = [
  'At least one qualified team baseline with sufficient source coverage.',
  'A documented risk question and worker consultation plan before interpretation.',
  'At least one owned, reversible work-design control with a review date.',
  'The same indicator measured again, with context and worker feedback recorded.',
  'A concise executive decision brief showing exposure direction, action status and evidence limits.',
];

const responsibilities = [
  ['Health & Safety', 'Owns purpose, consultation, risk interpretation and the evidence register.'],
  ['IT / systems', 'Approves sources and permissions; never interprets worker or team risk.'],
  ['Operational owner', 'Implements the agreed control and records practical constraints.'],
  [
    'Workers and managers',
    'Verify context, identify causes and evaluate whether the change helped.',
  ],
  [
    'Executive sponsor',
    'Removes organizational barriers and decides where resources or escalation are required.',
  ],
  [
    'SignalTrue',
    'Supports setup, explains evidence and limitations, and facilitates the first action review.',
  ],
];

export default function ServiceProcess() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="SignalTrue Client Success Process | From Evidence to Prevention"
        description="See the SignalTrue service process, responsibilities, deliverables and success measures for a responsible psychosocial risk pilot."
        path="/client-success"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-4xl text-center">
              <p className="mb-4 text-caption font-bold uppercase tracking-wider text-brand">
                Client success process
              </p>
              <h1 className="text-display font-bold tracking-tight text-[#0F172A] sm:text-display lg:text-display">
                A managed path from early evidence to a reviewed preventive action.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-body leading-8 text-[#475569]">
                SignalTrue is not delivered as another dashboard. The service helps Health &amp;
                Safety, workers, operational owners and executives use team-level evidence safely,
                make one clear decision and learn whether the work condition improved.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <PrimaryCommercialCTA
                    ctaLocation="client_success"
                    queryParams={{ intent: 'pilot' }}
                  >
                    Request a scoped pilot <ArrowRight className="ml-2 h-4 w-4" />
                  </PrimaryCommercialCTA>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <SampleReportCTA ctaLocation="client_success">
                    View the evidence record
                  </SampleReportCTA>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-10 max-w-3xl">
                <p className="mb-3 text-caption font-bold uppercase tracking-wider text-brand">
                  Delivery sequence
                </p>
                <h2 className="text-section font-bold text-[#0F172A]">Four controlled phases</h2>
                <p className="mt-3 text-[#475569]">
                  No risk conclusion is produced from metadata alone. Qualification, consultation
                  and review are explicit parts of the service.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {phases.map((phase) => (
                  <article
                    key={phase.title}
                    className="rounded-container border border-[#E2E8F0] bg-white p-6"
                  >
                    <phase.icon className="h-7 w-7 text-brand" aria-hidden="true" />
                    <h3 className="mt-4 text-lead font-bold text-[#0F172A]">{phase.title}</h3>
                    <dl className="mt-5 grid gap-3 text-caption">
                      <div>
                        <dt className="font-bold text-[#334155]">When</dt>
                        <dd className="mt-1 text-[#64748B]">{phase.timing}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-[#334155]">Accountable owner</dt>
                        <dd className="mt-1 text-[#64748B]">{phase.owner}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-[#334155]">Recorded output</dt>
                        <dd className="mt-1 text-[#64748B]">{phase.output}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#BFDBFE] bg-[#EFF6FF] py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
              <div className="rounded-container bg-white p-7 shadow-sm">
                <ShieldCheck className="h-7 w-7 text-brand" aria-hidden="true" />
                <h2 className="mt-4 text-lead font-bold text-[#0F172A]">Pilot success measures</h2>
                <ul className="mt-5 space-y-3">
                  {successMeasures.map((item) => (
                    <li key={item} className="flex gap-3 text-caption leading-6 text-[#475569]">
                      <CheckCircle2
                        className="mt-1 h-4 w-4 shrink-0 text-brand"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-container bg-[#0F172A] p-7 text-white">
                <p className="text-caption font-bold uppercase tracking-wider text-[#93C5FD]">
                  CEO value
                </p>
                <h2 className="mt-3 text-lead font-bold">
                  A decision brief—not another people score.
                </h2>
                <p className="mt-4 leading-7 text-[#CBD5E1]">
                  The executive view answers five questions: where exposure is changing, how strong
                  the evidence is, what workers and managers have verified, who owns the control,
                  and whether the control improved the measured condition.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 text-caption">
                  {[
                    'Exposure direction',
                    'Evidence confidence',
                    'Controls due',
                    'Control effectiveness',
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-container border border-[#334155] bg-[#1E293B] p-3"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-8 max-w-3xl">
                <p className="mb-3 text-caption font-bold uppercase tracking-wider text-brand">
                  Clear ownership
                </p>
                <h2 className="text-section font-bold text-[#0F172A]">
                  Who is responsible for what
                </h2>
              </div>
              <div className="overflow-hidden rounded-container border border-[#E2E8F0]">
                {responsibilities.map(([role, responsibility]) => (
                  <div
                    key={role}
                    className="grid gap-2 border-b border-[#E2E8F0] p-5 last:border-0 md:grid-cols-[220px_1fr]"
                  >
                    <strong className="text-[#0F172A]">{role}</strong>
                    <span className="text-[#475569]">{responsibility}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
