import { ArrowRight, CheckCircle2, FileText } from 'lucide-react';
import { SampleReportCTA } from './CommercialCTA';

const SampleReportSection = () => (
  <section className="bg-white py-16 lg:py-20">
    <div className="container mx-auto px-6">
      <div className="mx-auto grid max-w-5xl items-center gap-10 rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-6 sm:p-10 lg:grid-cols-2">
        <div>
          <p className="mb-4 text-caption font-bold uppercase tracking-wider text-brand">
            Fictional example, real review structure
          </p>
          <h2 className="mb-4 text-section font-bold text-[#0F172A]">
            See exactly what the WHS team receives.
          </h2>
          <p className="mb-6 text-body text-[#475569]">
            The sample follows one psychosocial control from intended outcome through baseline,
            after-period, sustainability, possible workload migration, worker evidence and the
            final review decision. All organisations and numbers in the example are fictional.
          </p>
          <SampleReportCTA
            ctaLocation="homepage_report_section"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-6 py-3 font-bold text-white hover:bg-brand-hover"
          >
            Open the sample report <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </SampleReportCTA>
        </div>

        <div className="rounded-container border border-[#E2E8F0] bg-white p-6 shadow-card">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-container bg-brand-softer">
              <FileText className="h-5 w-5 text-brand" aria-hidden="true" />
            </div>
            <div>
              <p className="font-bold text-[#0F172A]">Psychosocial Control Review</p>
              <p className="text-caption text-[#64748B]">Example decision: Partially effective</p>
            </div>
          </div>
          <ul className="space-y-3">
            {[
              'Control objective and expected work change',
              'Before, after and sustainability comparison',
              'Possible workload migration across work channels',
              'Worker consultation evidence beside operational data',
              'Clear maintain, modify, investigate or replace decision',
            ].map((item) => (
              <li key={item} className="flex gap-3 text-caption text-[#334155]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
);

export default SampleReportSection;
