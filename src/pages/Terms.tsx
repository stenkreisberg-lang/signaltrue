import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PageMeta from '../components/PageMeta';

const terms = [
  [
    '1. Application',
    'These public terms describe permitted use of the SignalTrue website and product. Signed customer agreements, data-processing terms and order forms take precedence for paid or pilot services.',
  ],
  [
    '2. Intended purpose',
    'SignalTrue supports team-level observation of changing work patterns, investigation with workers, documentation of organisational controls and review of subsequent evidence.',
  ],
  [
    '3. Prohibited use',
    'You must not use SignalTrue to rank individual productivity, profile psychological or medical conditions, conduct disciplinary surveillance, make or substantially determine employment decisions, evade worker consultation, or represent an observation as a legal compliance finding.',
  ],
  [
    '4. Customer responsibilities',
    'Customers remain responsible for lawful implementation, worker and HSR consultation, notices and policies, authorised users, work-group configuration, retention choices, psychosocial risk assessment, legal advice and decisions about controls.',
  ],
  [
    '5. Product limitations',
    'SignalTrue identifies changes in aggregated work-pattern data. It cannot by itself determine cause, worker health, the existence of a psychosocial hazard, legal compliance or whether a control caused a later change. Outputs must be considered with workers and other relevant evidence.',
  ],
  [
    '6. Accounts and access',
    'Users must protect credentials, use only authorised accounts and promptly report suspected unauthorised access. Access may be restricted to protect customers, workers, the service or other users.',
  ],
  [
    '7. Data and confidentiality',
    'Customer data is handled under the applicable customer agreement, data-processing terms and deployment record. Users must not upload or enter information outside the agreed purpose or attempt to obtain suppressed, individual or cross-tenant information.',
  ],
  [
    '8. Availability and changes',
    'SignalTrue may update the service to improve reliability, security, methodology or responsible-use safeguards. Service commitments and support arrangements are defined in the applicable customer agreement.',
  ],
  [
    '9. Intellectual property',
    'SignalTrue and its licensors retain rights in the service, methods, software and documentation. Customers retain rights in their data and customer-entered records, subject to the applicable agreement.',
  ],
  [
    '10. Contact',
    'Questions about these terms can be sent to legal@signaltrue.ai. Privacy questions can be sent to privacy@signaltrue.ai and security concerns to support@signaltrue.ai.',
  ],
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="Responsible Use Terms | SignalTrue"
        description="Public terms for responsible use of SignalTrue team-level work-pattern evidence, including prohibited individual monitoring and employment-decision uses."
        path="/terms"
      />
      <Navbar />
      <main className="pt-20">
        <section className="border-b border-[#E2E8F0] bg-white py-16">
          <div className="container mx-auto max-w-4xl px-6">
            <p className="text-sm font-bold uppercase tracking-wider text-[#1D4ED8]">Version 1.0</p>
            <h1 className="mt-3 text-4xl font-bold text-[#0F172A] sm:text-5xl">
              Responsible Use Terms
            </h1>
            <p className="mt-5 text-lg text-[#475569]">
              Effective 29 August 2026 · Owner: SignalTrue Legal
            </p>
          </div>
        </section>
        <section className="py-16">
          <div className="container mx-auto max-w-4xl space-y-5 px-6">
            {terms.map(([title, copy]) => (
              <article key={title} className="rounded-2xl border border-[#E2E8F0] bg-white p-7">
                <h2 className="text-xl font-bold text-[#0F172A]">{title}</h2>
                <p className="mt-3 leading-7 text-[#475569]">{copy}</p>
              </article>
            ))}
            <p className="text-sm leading-6 text-[#64748B]">
              These public terms should be reviewed by qualified counsel before they are relied on
              as the complete contractual terms for an Australian customer engagement.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
