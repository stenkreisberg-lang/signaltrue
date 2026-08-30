import { ArrowRight, CheckCircle2, FlaskConical, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const evidenceBoundaries = [
  {
    icon: CheckCircle2,
    label: 'Evidence supports',
    value: 'A private pilot diagnostic and a research-quality data audit',
  },
  {
    icon: ShieldCheck,
    label: 'Evidence does not yet support',
    value: 'Causal, predictive, ROI or intervention-effectiveness claims',
  },
];

const PilotEvidenceSection = () => (
  <section className="border-y border-[#E2E8F0] bg-white py-16 lg:py-20">
    <div className="container mx-auto px-6">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-soft bg-brand-softer px-3 py-1.5 text-caption font-bold uppercase tracking-wider text-brand">
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            Early pilot evidence
          </div>
          <h2 className="mb-4 text-section font-bold text-[#0F172A]">
            We publish the limit with the result.
          </h2>
          <p className="text-body text-[#475569]">
            A June 2026 aggregate audit covered 1,090 connected work events across Microsoft Outlook
            and Teams. It confirmed meaningful calendar coverage—and exposed incomplete attribution
            and outcome labels before they could become overconfident claims.
          </p>
          <p className="mt-4 text-caption text-[#64748B]">
            No customer names or individual identities are included in the audit.
          </p>
        </div>

        <div className="rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-6">
          <p className="mb-5 text-lead font-bold text-[#0F172A]">What the pilot established</p>
          <dl className="space-y-4">
            {evidenceBoundaries.map((item) => (
              <div key={item.label} className="flex gap-3 rounded-container bg-white p-4">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <dt className="text-caption font-bold uppercase tracking-wide text-brand">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-body text-[#334155]">{item.value}</dd>
                </div>
              </div>
            ))}
          </dl>
          <Link
            to="/trust"
            className="mt-5 inline-flex items-center gap-2 text-caption font-bold text-brand hover:text-brand-hover hover:underline"
          >
            Review the evidence boundaries <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  </section>
);

export default PilotEvidenceSection;
