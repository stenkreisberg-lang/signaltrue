import { ArrowRight, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';

interface InformationSection {
  title: string;
  copy?: string;
  bullets?: string[];
}

interface InformationPage {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  sections: InformationSection[];
}

const pages: Record<string, InformationPage> = {
  '/au/psychosocial-risk-monitoring': {
    eyebrow: 'Category overview',
    title: 'Continuous work-pattern evidence between psychosocial risk assessments.',
    description:
      'SignalTrue observes material, persistent changes in aggregated team work patterns so WHS and operational leaders know where further investigation may be useful.',
    sections: [
      {
        title: 'What is observed',
        bullets: [
          'Meeting load and back-to-back meeting patterns',
          'Focus-time availability and work fragmentation',
          'Activity outside configured working hours',
          'Coordination and collaboration distribution',
          'Duration, sample size and data coverage for each change',
        ],
      },
      {
        title: 'How evidence is used',
        copy: 'An observation should be investigated with workers and relevant operational evidence. It can then be linked to a documented control and reviewed against subsequent work-pattern data.',
      },
      {
        title: 'What it does not replace',
        bullets: [
          'Psychosocial hazard identification or risk assessment',
          'Worker and HSR consultation',
          'Professional, legal or medical judgement',
          'The organisation’s responsibility to select and maintain controls',
        ],
      },
    ],
  },
  '/au/privacy': {
    eyebrow: 'Australian privacy overview',
    title: 'Purpose-limited team evidence, with the processing boundary made visible.',
    description:
      'SignalTrue is designed to minimise the information used for work-pattern observations and to keep customer-facing outputs at team level.',
    status:
      'This overview is not a substitute for the customer’s privacy assessment, worker notice, consultation or jurisdiction-specific legal advice.',
    sections: [
      {
        title: 'Processing purpose',
        copy: 'The defined purpose is to observe changing patterns in how work is organised and support investigation and review of work-design controls. SignalTrue must not be used for individual productivity ranking, disciplinary monitoring, psychological profiling or automated employment decisions.',
      },
      {
        title: 'Data boundary',
        bullets: [
          'Use allowlisted timing, duration, count and relationship metadata needed for documented metrics',
          'Exclude message bodies, email bodies, attachments, document content, meeting descriptions, keystrokes, screenshots and webcam data',
          'Discard fields outside the allowlist even where an upstream connector permission can technically expose them',
          'Pseudonymise identities before feature computation and aggregate before customer display',
        ],
      },
      {
        title: 'Customer configuration',
        copy: 'The implementation record confirms the exact fields, permissions, work groups, reporting threshold, retention periods, authorised roles, processing locations and contact points for each deployment.',
      },
    ],
  },
  '/au/worker-transparency': {
    eyebrow: 'Worker perspective',
    title: 'Workers should be able to understand what SignalTrue is doing.',
    description:
      'Responsible implementation requires clear purpose, accurate field descriptions, meaningful consultation and an accessible way to raise questions or challenge interpretation.',
    sections: [
      {
        title: 'Before monitoring starts',
        bullets: [
          'Explain why SignalTrue is being considered and which work groups are in scope',
          'Identify the metadata used, the fields excluded and the connector permissions requested',
          'Explain who can access outputs, the minimum group threshold and retention periods',
          'Provide WHS, privacy and worker or HSR contact points',
        ],
      },
      {
        title: 'During investigation and review',
        copy: 'Work-pattern data cannot explain why a change occurred. Workers and HSRs provide context, identify practical causes, help consider controls and contribute to the review of whether controls are working.',
      },
      {
        title: 'Prohibited uses',
        bullets: [
          'No individual productivity rankings or employee league tables',
          'No automated employment decisions',
          'No individual psychological or medical conclusions',
          'No use of a team-level observation as proof of individual conduct',
        ],
      },
    ],
  },
  '/au/security': {
    eyebrow: 'Security overview',
    title: 'Security claims should be specific, testable and deployment-aware.',
    description:
      'SignalTrue documents the controls used to protect connector access, tenant data, aggregated outputs and evidence reports.',
    status:
      'Deployment-specific security controls and evidence are confirmed during procurement. Certifications are not displayed unless achieved and current.',
    sections: [
      {
        title: 'Core safeguards',
        bullets: [
          'Encryption in transit and at rest',
          'Role-based access and restricted production access',
          'Least-privilege connector permissions and secret management',
          'Rate limiting, dependency scanning and environment separation',
          'Application audit events without sensitive worker telemetry in logs',
        ],
      },
      {
        title: 'Operational assurance',
        bullets: [
          'Backup and restore procedures',
          'Incident response and data-breach assessment process',
          'Connector-health, job-failure, latency and queue monitoring',
          'Retention, deletion and customer offboarding procedures',
        ],
      },
      {
        title: 'Security review pack',
        copy: 'Prospective customers can request the current architecture, data flow, OAuth permissions, subprocessors, retention, deletion, access-control and incident-management information relevant to their proposed deployment.',
      },
    ],
  },
  '/au/data-residency': {
    eyebrow: 'Data residency',
    title: 'Australian data residency will be claimed only after it is deployed and verified.',
    description:
      'A storage region alone is not enough. The public promise must cover telemetry, derived metrics, reports, processing, logs, backups, support access, AI and subprocessors.',
    status:
      'Current public status: SignalTrue does not yet make a verified Australian data-residency guarantee. Exact deployment locations must be confirmed in writing before a pilot handles Australian worker telemetry.',
    sections: [
      {
        title: 'Verification boundary',
        bullets: [
          'Customer work-pattern telemetry and pseudonymous computation records',
          'Derived team metrics and generated evidence reports',
          'Databases, object storage, queues, logs, keys, secrets and backups',
          'Administrative and support access locations',
          'AI processing mode and every relevant subprocessor',
        ],
      },
      {
        title: 'Required evidence before the claim appears',
        copy: 'Production checks must verify approved regions for the API, workers, database, storage, queues, keys and disaster recovery. The subprocessor register and customer data-flow diagram must match the deployed architecture.',
      },
      {
        title: 'Marketing rule',
        copy: 'The website, proposals and sales material must not show an Australian-residency badge or imply in-country processing until the production environment and operating procedures have passed verification.',
      },
    ],
  },
  '/au/trust': {
    eyebrow: 'Australian Trust Centre',
    title: 'Verify the data boundary before evaluating the insight.',
    description:
      'The Trust Centre brings together privacy, worker transparency, security, data location, AI boundaries and responsible-use limitations.',
    sections: [
      {
        title: 'What a buyer can verify',
        bullets: [
          'The product purpose and prohibited uses',
          'Exact connector permissions and allowlisted fields',
          'Minimum group and anti-identification rules',
          'Authorised roles, retention and deletion process',
          'Hosting, support-access and subprocessor locations',
          'AI input boundaries and human oversight',
        ],
      },
      {
        title: 'What workers should be told',
        copy: 'Workers should receive the customer-defined purpose, scope, fields, exclusions, access roles, group protection, retention, locations, limitations and relevant WHS, privacy and HSR contact points.',
      },
      {
        title: 'What SignalTrue does not certify',
        copy: 'SignalTrue does not certify WHS compliance, determine that a psychosocial hazard legally exists, diagnose worker health or prove that a control caused a later change.',
      },
    ],
  },
  '/au/ai-governance': {
    eyebrow: 'AI governance',
    title: 'AI can explain aggregate evidence. It cannot make the decision.',
    description:
      'Core SignalTrue metrics are deterministic. Optional AI features are bounded to aggregate evidence, structured outputs and authorised human review.',
    status:
      'For strict Australian-residency deployments, generative AI remains disabled unless in-region processing has been technically and contractually verified.',
    sections: [
      {
        title: 'Permitted AI support',
        bullets: [
          'Summarise aggregate observations',
          'Draft consultation questions and board summaries',
          'Suggest categories of controls for human consideration',
          'Explain methodology limitations and evidence references',
        ],
      },
      {
        title: 'Information excluded from AI',
        bullets: [
          'Worker names and email addresses',
          'Provider user identifiers and person-level profiles',
          'Raw messages, email, calendar events, titles and descriptions',
          'Individual response histories or employment decisions',
        ],
      },
      {
        title: 'Human authority',
        copy: 'AI cannot create a formal finding, close an investigation, mark a control effective, determine legal compliance, diagnose a worker or make an employment decision. Authorised users remain accountable and review actions are logged.',
      },
    ],
  },
};

export default function AustraliaInformationPage() {
  const { pathname } = useLocation();
  const page = pages[pathname] || pages['/au/trust'];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title={`${page.title} | SignalTrue Australia`}
        description={page.description}
        path={pathname}
        lang="en-AU"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto max-w-5xl px-6">
            <p className="text-caption font-bold uppercase tracking-wider text-brand">
              {page.eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl text-display font-bold text-[#0F172A] sm:text-display">
              {page.title}
            </h1>
            <p className="mt-6 max-w-3xl text-lead leading-8 text-[#475569]">{page.description}</p>
            {page.status && (
              <div className="mt-8 flex max-w-4xl gap-3 rounded-container border border-amber-200 bg-amber-50 p-5 text-caption leading-6 text-amber-950">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <p>{page.status}</p>
              </div>
            )}
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto max-w-5xl space-y-6 px-6">
            {page.sections.map((section) => (
              <article
                key={section.title}
                className="rounded-container border border-[#E2E8F0] bg-white p-7 md:p-8"
              >
                <h2 className="text-lead font-bold text-[#0F172A]">{section.title}</h2>
                {section.copy && <p className="mt-4 leading-7 text-[#475569]">{section.copy}</p>}
                {section.bullets && (
                  <ul className="mt-5 space-y-3">
                    {section.bullets.map((item) => (
                      <li key={item} className="flex gap-3 text-caption leading-6 text-[#334155]">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand" /> {item}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-[#E2E8F0] bg-white py-14">
          <div className="container mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center">
            <div className="flex max-w-2xl gap-3">
              <Info className="mt-1 h-5 w-5 shrink-0 text-brand" />
              <p className="text-caption leading-6 text-[#475569]">
                Deployment-specific details are confirmed during implementation readiness and take
                precedence over general website descriptions.
              </p>
            </div>
            <Button asChild>
              <Link to="/au/monitoring-gap-audit">
                Run the audit <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
