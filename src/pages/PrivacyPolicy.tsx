import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';

const sections = [
  [
    '1. Scope and roles',
    'This policy explains how SignalTrue handles information through its website, commercial forms and product services. For customer worker data, the customer determines the authorised purpose and SignalTrue processes data under the customer agreement and data-processing terms.',
  ],
  [
    '2. Website and commercial information',
    'When you contact SignalTrue, we may receive your name, work email, organisation, role, message and first-party attribution information such as landing page, referrer and campaign parameters. We use it to respond, manage the commercial relationship, prevent misuse and understand whether public pages are useful. Names, email addresses and free-text messages are excluded from analytics events.',
  ],
  [
    '3. Product information',
    'Product processing is limited to the connector fields and purposes documented for each deployment. SignalTrue uses allowlisted work-pattern metadata to calculate pseudonymous and aggregated team metrics. Raw third-party responses and fields outside the allowlist must not be retained as product records.',
  ],
  [
    '4. Content exclusions',
    'The documented product boundary excludes message and email bodies, attachments, document content, meeting descriptions, keystrokes, screenshots, webcam footage and individual productivity rankings. Where an upstream permission can technically expose broader fields, SignalTrue must discard fields outside the allowlist and describe that distinction accurately.',
  ],
  [
    '5. Purposes and prohibited uses',
    'SignalTrue processes information to operate integrations, calculate team-level work-pattern observations, support investigation and control review, maintain security, provide support and meet contractual obligations. It must not be used for individual productivity ranking, psychological profiling, disciplinary monitoring or automated employment decisions.',
  ],
  [
    '6. Service providers and locations',
    'SignalTrue uses infrastructure, authentication, communications, monitoring and other service providers. The applicable subprocessor list, storage locations, processing locations and support-access arrangements are confirmed for each deployment. SignalTrue does not make an Australian data-residency guarantee unless that deployment has been verified in writing.',
  ],
  [
    '7. Retention and deletion',
    'Website enquiries are retained only as long as needed for the commercial relationship, legal obligations and reasonable business records. Product retention is customer-configured and documented during implementation. Deletion and offboarding procedures cover active systems and the applicable backup lifecycle.',
  ],
  [
    '8. Security and incidents',
    'SignalTrue uses access controls, encryption, environment separation, monitoring and incident-response procedures appropriate to the service. No online service can promise absolute security. Suspected privacy or security incidents can be reported to privacy@signaltrue.ai or support@signaltrue.ai.',
  ],
  [
    '9. Access, correction and questions',
    'Requests concerning customer worker data should normally be directed to the employing organisation, which controls the relevant deployment. You may contact privacy@signaltrue.ai about SignalTrue-held information, correction, deletion, complaints or this policy. Applicable rights and response processes depend on the relevant jurisdiction and relationship.',
  ],
  [
    '10. Changes',
    'Material changes will be published with an updated effective date. Contractual notice will be provided where required by the applicable customer agreement.',
  ],
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="Privacy Policy | SignalTrue"
        description="How SignalTrue handles website information and purpose-limited team work-pattern metadata, including fields, purposes, locations, retention and privacy contacts."
        path="/privacy"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16">
          <div className="container mx-auto max-w-4xl px-6">
            <p className="text-sm font-bold uppercase tracking-wider text-brand">Version 1.0</p>
            <h1 className="mt-3 text-4xl font-bold text-[#0F172A] sm:text-5xl">Privacy Policy</h1>
            <p className="mt-5 text-lg text-[#475569]">
              Effective 29 August 2026 · Owner: SignalTrue Privacy
            </p>
            <p className="mt-5 max-w-3xl leading-7 text-[#475569]">
              SignalTrue is designed to provide team-level work-pattern evidence with a defined
              purpose and visible limitations. This policy separates public website information from
              customer-controlled product processing.
            </p>
          </div>
        </section>
        <section className="py-16">
          <div className="container mx-auto max-w-4xl space-y-5 px-6">
            {sections.map(([title, copy]) => (
              <article key={title} className="rounded-2xl border border-[#E2E8F0] bg-white p-7">
                <h2 className="text-xl font-bold text-[#0F172A]">{title}</h2>
                <p className="mt-3 leading-7 text-[#475569]">{copy}</p>
              </article>
            ))}
            <p className="text-sm leading-6 text-[#64748B]">
              Australian readers can also review the{' '}
              <Link className="font-semibold text-brand hover:underline" to="/au/privacy">
                Australian privacy overview
              </Link>
              ,{' '}
              <Link
                className="font-semibold text-brand hover:underline"
                to="/au/worker-transparency"
              >
                worker transparency guidance
              </Link>{' '}
              and{' '}
              <Link className="font-semibold text-brand hover:underline" to="/au/data-residency">
                data-residency status
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
