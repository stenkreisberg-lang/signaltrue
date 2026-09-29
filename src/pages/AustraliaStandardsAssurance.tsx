import { CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';

const sources = [
  [
    'Safe Work Australia: Managing psychosocial risks',
    'https://www.safeworkaustralia.gov.au/safety-topic/managing-health-and-safety/mental-health/managing-risks',
  ],
  [
    'Safe Work Australia: Reviewing controls',
    'https://www.safeworkaustralia.gov.au/book/health-care-and-social-assistance/managing-whs-risks/review-controls',
  ],
  ['ISO 45003:2021', 'https://www.iso.org/standard/64283.html'],
];

const alignment = [
  [
    'Understand context and psychosocial risk',
    'Uses the customer’s existing hazard, risk and consultation context. SignalTrue does not declare that a legal hazard exists.',
    'Customer / WHS process',
  ],
  [
    'Identify relevant work conditions',
    'Adds aggregated evidence about selected work patterns such as meeting demand, after-hours activity, focus-time availability and coordination.',
    'SignalTrue + customer',
  ],
  [
    'Plan a control',
    'Records the control, accountable owner, intended work change, relevant evidence and review date.',
    'Customer, supported by SignalTrue',
  ],
  [
    'Implement the control',
    'The organisation changes work, systems, roles, resources or another relevant control. SignalTrue does not prescribe the legal control.',
    'Customer',
  ],
  [
    'Monitor what changed',
    'Compares qualified team-level patterns before and after the control and checks whether the change persists or demand may have migrated.',
    'SignalTrue',
  ],
  [
    'Consult and validate',
    'Presents observations and limitations for discussion with workers, HSRs and accountable leaders. Human context remains necessary.',
    'Customer / workers',
  ],
  [
    'Review effectiveness',
    'Packages observation, interpretation, worker validation and limitations to support a maintain, modify, investigate or replace decision.',
    'SignalTrue + customer',
  ],
  [
    'Document and improve',
    'Keeps a traceable control-review record that can support the organisation’s existing OH&S continual-improvement process.',
    'Customer, supported by SignalTrue',
  ],
];

const boundaries = [
  'No diagnosis of burnout, stress, psychological injury or individual health.',
  'No individual psychosocial-risk or productivity score.',
  'No claim that a work-pattern change proves causation.',
  'No claim that SignalTrue makes an organisation WHS compliant.',
  'No claim that Australian law requires SignalTrue, continuous telemetry or any specific technology.',
  'No claim that SignalTrue is ISO 45003 or ISO 45001 certified.',
];

export default function AustraliaStandardsAssurance() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="ISO 45003 Alignment & Australian WHS | SignalTrue"
        description="See how SignalTrue supports an ISO 45003-informed psychosocial risk process and Australian WHS control review, with responsibilities and product boundaries mapped explicitly."
        path="/au/standards-assurance"
        lang="en-AU"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-24">
          <div className="container mx-auto max-w-5xl px-6">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">
              Standards alignment
            </p>
            <h1 className="mt-3 max-w-4xl text-display font-bold tracking-tight text-[#0F172A]">
              Designed to support an ISO 45003-informed psychosocial risk process.
            </h1>
            <p className="mt-6 max-w-3xl text-lead leading-8 text-[#475569]">
              SignalTrue adds privacy-conscious organisational evidence to the part many
              organisations find difficult: checking what changed after a psychosocial control was
              implemented. It is designed to work inside an existing OH&amp;S process, not replace
              it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-caption font-semibold text-[#1E40AF]">
                ISO 45003-informed design
              </span>
              <span className="rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-caption font-semibold text-[#1E40AF]">
                ISO 45001 OH&amp;S context
              </span>
              <span className="rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-caption font-semibold text-[#1E40AF]">
                Australian WHS control-review fit
              </span>
              <span className="rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-caption font-semibold text-[#475569]">
                Alignment, not certification
              </span>
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] py-16 lg:py-20">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="max-w-3xl">
              <p className="text-caption font-bold uppercase tracking-wider text-brand">
                The mapping
              </p>
              <h2 className="mt-3 text-section font-bold text-[#0F172A]">
                What “aligned” means in the product
              </h2>
              <p className="mt-4 leading-7 text-[#475569]">
                We do not use ISO as a badge. The workflow separates what SignalTrue can evidence
                from what still belongs to the organisation, workers, HSRs and competent WHS
                professionals.
              </p>
            </div>
            <div className="mt-8 overflow-hidden rounded-container border border-[#E2E8F0] bg-white">
              <div className="hidden grid-cols-[1fr_1.8fr_0.8fr] gap-4 border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3 text-caption font-bold text-[#475569] md:grid">
                <span>Process</span>
                <span>How SignalTrue supports it</span>
                <span>Responsibility</span>
              </div>
              {alignment.map(([step, support, owner]) => (
                <div
                  key={step}
                  className="grid gap-2 border-b border-[#E2E8F0] px-5 py-5 last:border-0 md:grid-cols-[1fr_1.8fr_0.8fr] md:gap-4"
                >
                  <p className="font-bold text-[#0F172A]">{step}</p>
                  <p className="text-caption leading-6 text-[#475569]">{support}</p>
                  <p className="text-caption font-semibold text-[#334155]">{owner}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto max-w-5xl px-6">
            <div className="rounded-container border border-[#BFDBFE] bg-[#EFF6FF] p-6 md:p-8">
              <ShieldCheck className="h-7 w-7 text-brand" />
              <h2 className="mt-4 text-section font-bold text-[#0F172A]">
                The assurance statement
              </h2>
              <p className="mt-4 max-w-4xl text-lead leading-8 text-[#334155]">
                SignalTrue is designed to support organisations applying ISO 45003 guidance and ISO
                45001 OH&amp;S management principles to psychosocial risk. Its control-review
                workflow adds organisational work-pattern evidence, preserves worker validation and
                records evidence limitations. SignalTrue is not ISO certified, and use of SignalTrue
                does not establish ISO conformity or WHS compliance.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] py-16 lg:py-20">
          <div className="container mx-auto max-w-5xl px-6">
            <h2 className="text-section font-bold text-[#0F172A]">
              Claims we deliberately do not make
            </h2>
            <p className="mt-4 max-w-3xl leading-7 text-[#475569]">
              Clear boundaries are part of assurance. They prevent work-pattern evidence from being
              turned into surveillance, diagnosis or a false compliance conclusion.
            </p>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {boundaries.map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-container border border-[#E2E8F0] bg-white p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <p className="text-caption leading-6 text-[#334155]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto max-w-4xl px-6">
            <h2 className="text-section font-bold text-[#0F172A]">Verify the basis yourself</h2>
            <p className="mt-4 leading-7 text-[#475569]">
              The positioning above is grounded in primary sources. Safe Work Australia describes
              review of control effectiveness and consultation as part of the WHS risk-management
              cycle. ISO describes ISO 45003 as guidance for managing psychosocial risk within an
              OH&amp;S management system based on ISO 45001.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {sources.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-caption font-semibold text-brand hover:border-[#93C5FD] hover:underline"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-section font-bold text-[#0F172A]">
              Test the alignment on one real control.
            </h2>
            <p className="mt-5 text-body text-[#475569]">
              Bring one psychosocial control your organisation has implemented. We will map the
              intended work change, available evidence, worker-validation step, limitations and the
              review decision it needs to support.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/au/monitoring-gap-audit">
                  Check control-review readiness <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/sample-report">See a sample control review</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
