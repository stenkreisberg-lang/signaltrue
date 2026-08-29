import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  ArrowRight,
  Users,
  Database,
  FileText,
} from 'lucide-react';

/*
 * CATEGORY KING POSITIONING:
 * Privacy is enforced, not promised.
 * This page must demonstrate architectural privacy, not marketing claims.
 */

// What we use
const whatWeUse = [
  {
    icon: Database,
    title: 'Calendar metadata',
    description:
      'Meeting times, durations, and participant counts. Never meeting content or notes.',
  },
  {
    icon: FileText,
    title: 'Communication timing patterns',
    description:
      'When messages are sent, response intervals, channel activity levels. Never message content.',
  },
  {
    icon: Users,
    title: 'Aggregated behavioral signals',
    description: 'Team-level patterns only. Individual data is never exposed to managers.',
  },
];

// What we NEVER use
const whatWeNeverUse = [
  'No Slack message text',
  'No email bodies',
  'No document contents',
  'No meeting recordings',
  'No screen tracking',
  'No keystroke tracking',
  'No webcam tracking',
  'No private employee notes',
  'No individual productivity ranking',
];

// Worker transparency responsibilities
const employeeTransparency = [
  {
    title: 'Purpose before collection',
    description:
      'Workers should be told why the data is used, which teams are in scope and who can see outputs.',
  },
  {
    title: 'Fields and exclusions',
    description:
      'The implementation record lists included metadata and the content or individual measures that are excluded.',
  },
  {
    title: 'Understand the output',
    description:
      'Teams should see the same pattern, limitations and consultation questions used by decision-makers.',
  },
  {
    title: 'Consultation and challenge',
    description:
      'Workers can add context, challenge an interpretation and help choose a proportionate control.',
  },
];

const governanceRecord = [
  [
    'Purpose and lawful-use record',
    'The risk question, scope, accountable owner and prohibited uses.',
  ],
  ['Data map', 'Sources, metadata fields, transformations, group rules and output recipients.'],
  [
    'Access matrix',
    'Which roles can configure sources, review evidence, record actions or see executive summaries.',
  ],
  [
    'Retention and deletion',
    'Deployment-specific retention, deletion workflow and contract exit process.',
  ],
  [
    'Hosting and subprocessors',
    'Deployment location, service providers and incident contacts confirmed during security review.',
  ],
  [
    'DPIA and DPA support',
    'Information required by the customer to complete its own assessment and agreement.',
  ],
];

const Trust = () => {
  return (
    <div className="min-h-screen bg-white">
      <PageMeta
        title="SignalTrue Trust | Metadata Only, Team-Level Privacy"
        description="See what SignalTrue uses and never uses: metadata-only team insights, no message content, no individual productivity scores."
        path="/trust"
      />
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-white border-b border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D1FAE5] border border-[#A7F3D0] mb-6">
                <Shield className="w-4 h-4 text-[#047857]" />
                <span className="text-sm font-medium text-[#047857]">Privacy by architecture</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6 text-[#0F172A]">
                Privacy is not a feature.{' '}
                <span className="text-[#0F766E]">It is the foundation.</span>
              </h1>
              <p className="text-lg text-[#334155] max-w-xl mx-auto">
                SignalTrue is built to observe work-system pressure without reading employee
                messages, exposing individual behaviour, or ranking productivity.
              </p>
            </div>
          </div>
        </section>

        {/* Plain-language summary cards */}
        <section className="py-12 bg-[#ECFDF5] border-b border-[#A7F3D0]">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  'Metadata only',
                  'No message content',
                  'Team-level signals',
                  'No employee ranking',
                ].map((item) => (
                  <div
                    key={item}
                    className="p-4 rounded-xl bg-white border border-[#A7F3D0] text-center"
                  >
                    <CheckCircle className="w-5 h-5 text-[#047857] mx-auto mb-2" />
                    <span className="text-sm font-semibold text-[#064E3B]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What We Use Section */}
        <section className="py-20 lg:py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold text-[#0F766E] uppercase tracking-wider mb-4">
                  What we use
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-[#0F172A]">
                  Work-pattern metadata with defined purpose
                </h2>
                <p className="text-lg text-[#475569] max-w-2xl mx-auto">
                  We use the minimum fields needed to calculate team-level work-pattern indicators.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {whatWeUse.map((item, index) => (
                  <div key={index} className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="p-3 rounded-xl bg-[#D1FAE5] w-fit mb-4">
                      <item.icon className="w-6 h-6 text-[#047857]" />
                    </div>
                    <h3 className="font-display font-semibold text-[#0F172A] mb-2">{item.title}</h3>
                    <p className="text-sm text-[#475569]">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What We NEVER Use Section */}
        <section className="py-20 lg:py-24 bg-[#F8FAFC] border-y border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FEE2E2] border border-[#B91C1C]/20 mb-6">
                  <EyeOff className="w-4 h-4 text-[#B91C1C]" />
                  <span className="text-sm font-medium text-[#B91C1C]">Hard limits</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-[#0F172A]">
                  What we never access
                </h2>
                <p className="text-lg text-[#475569] max-w-2xl mx-auto">
                  SignalTrue does not need private content to observe work-system pressure.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-white border border-[#E2E8F0]">
                <div className="grid sm:grid-cols-2 gap-4">
                  {whatWeNeverUse.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-[#B91C1C] flex-shrink-0" />
                      <span className="text-[#334155]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Employee Transparency Section */}
        <section className="py-20 lg:py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold text-[#0F766E] uppercase tracking-wider mb-4">
                  Employee transparency
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-[#0F172A]">
                  Workers should understand and challenge how evidence is used
                </h2>
                <p className="text-lg text-[#475569] max-w-2xl mx-auto">
                  Responsible use requires communication and consultation—not a hidden analytics
                  process. SignalTrue provides the material needed for that conversation.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {employeeTransparency.map((item, index) => (
                  <div key={index} className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="flex items-center gap-3 mb-3">
                      <CheckCircle className="w-5 h-5 text-[#047857]" />
                      <h3 className="font-display font-semibold text-[#0F172A]">{item.title}</h3>
                    </div>
                    <p className="text-sm text-[#475569] pl-8">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section className="py-20 lg:py-24 bg-[#F8FAFC] border-y border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold text-[#0F766E] uppercase tracking-wider mb-4">
                  Technical architecture
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-[#0F172A]">
                  Privacy enforced at every layer
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] text-center">
                  <div className="p-3 rounded-xl bg-[#DBEAFE] w-fit mx-auto mb-4">
                    <Lock className="w-6 h-6 text-brand-hover" />
                  </div>
                  <h3 className="font-semibold text-[#0F172A] mb-2">Encryption</h3>
                  <p className="text-sm text-[#475569]">
                    Data is encrypted in transit and at rest. Deployment-specific controls are
                    confirmed during the security review.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] text-center">
                  <div className="p-3 rounded-xl bg-[#DBEAFE] w-fit mx-auto mb-4">
                    <Users className="w-6 h-6 text-brand-hover" />
                  </div>
                  <h3 className="font-semibold text-[#0F172A] mb-2">Aggregation thresholds</h3>
                  <p className="text-sm text-[#475569]">
                    The reporting floor is five active people. Some sensitive indicators require
                    eight, and an organization can set a higher threshold.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] text-center">
                  <div className="p-3 rounded-xl bg-[#DBEAFE] w-fit mx-auto mb-4">
                    <Eye className="w-6 h-6 text-brand-hover" />
                  </div>
                  <h3 className="font-semibold text-[#0F172A] mb-2">Role-based access</h3>
                  <p className="text-sm text-[#475569]">
                    Hard permission boundaries between team, org, and HR access levels.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#E2E8F0] bg-[#F8FAFC] py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-5xl">
              <div className="max-w-3xl">
                <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#0F766E]">
                  Procurement and governance
                </p>
                <h2 className="text-3xl font-bold text-[#0F172A] sm:text-4xl">
                  The controls a buyer should verify before a pilot.
                </h2>
                <p className="mt-4 text-lg leading-8 text-[#475569]">
                  SignalTrue confirms deployment-specific details in writing. Claims that depend on
                  the customer configuration are not presented as universal guarantees.
                </p>
              </div>
              <div className="mt-10 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
                {governanceRecord.map(([title, copy]) => (
                  <div
                    key={title}
                    className="grid gap-2 border-b border-[#E2E8F0] p-5 last:border-0 md:grid-cols-[240px_1fr]"
                  >
                    <strong className="text-[#0F172A]">{title}</strong>
                    <span className="text-sm leading-6 text-[#475569]">{copy}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <Link to="/contact?intent=security-review&cta=trust">
                    Request the security review pack
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/client-success">See the client success process</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#E2E8F0] bg-white py-20 lg:py-24">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-5xl">
              <div className="max-w-3xl">
                <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#0F766E]">
                  Responsible-use method
                </p>
                <h2 className="text-3xl font-bold text-[#0F172A] sm:text-4xl">
                  A signal is the start of a risk review—not a conclusion.
                </h2>
                <p className="mt-4 text-lg leading-8 text-[#475569]">
                  SignalTrue separates measured evidence from interpretation and records the
                  consultation and control decision that follows.
                </p>
              </div>
              <div className="mt-10 grid gap-5 md:grid-cols-4">
                {[
                  [
                    '1. Qualify',
                    'Coverage, group thresholds and baseline maturity must be sufficient.',
                  ],
                  [
                    '2. Inspect',
                    'The user sees the current value, baseline, change and confidence.',
                  ],
                  [
                    '3. Consult',
                    'Workers and managers verify context, causes and practical controls.',
                  ],
                  [
                    '4. Review',
                    'An owner records the action and the same indicator is measured again.',
                  ],
                ].map(([title, copy]) => (
                  <div key={title} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                    <h3 className="font-bold text-[#0F172A]">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#475569]">{copy}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-950">
                <strong>Important limitation:</strong> metadata cannot establish a medical
                condition, employee sentiment, intent or the cause of a work pattern. Organizations
                remain responsible for worker consultation, professional judgement, local legal
                duties and appropriate escalation.
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6 text-[#0F172A]">
                Questions about privacy?
              </h2>
              <p className="text-lg text-[#334155] mb-8 max-w-xl mx-auto">
                For privacy or data protection questions, contact:{' '}
                <a href="mailto:privacy@signaltrue.ai" className="text-[#0F766E] underline">
                  privacy@signaltrue.ai
                </a>
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild variant="hero" size="xl">
                  <Link to="/contact">
                    Talk to us
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button asChild variant="hero-outline" size="xl">
                  <Link to="/how-it-works">See how it works</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Trust;
