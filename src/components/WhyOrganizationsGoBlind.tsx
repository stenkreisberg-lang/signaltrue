import { XCircle } from 'lucide-react';
import { PrimaryCommercialCTA, SampleReportCTA } from './CommercialCTA';

const gaps = [
  {
    name: 'Risk assessment',
    problem:
      'Identifies hazards and exposure, but does not by itself prove that a later control worked.',
  },
  {
    name: 'Worker survey',
    problem:
      'Captures lived experience at a point in time, but the work can change between survey rounds.',
  },
  {
    name: 'Absence and turnover',
    problem:
      'Useful outcomes, but usually too late to tell whether a preventive control should be changed now.',
  },
  {
    name: 'Workforce analytics',
    problem:
      'Shows meetings, focus time or after-hours activity, but usually stops before the WHS control decision.',
  },
];

const WhyOrganizationsGoBlind = () => {
  return (
    <section id="the-problem" className="py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <p className="text-caption font-semibold text-primary uppercase tracking-wider mb-4">
              The gap after assessment
            </p>
          </div>

          <h2 className="text-section font-display font-bold text-center mb-6">
            Finding a psychosocial risk is not the same as knowing whether the response worked.
          </h2>

          <div className="max-w-3xl mx-auto text-center mb-12 lg:mb-16">
            <p className="text-lead text-muted-foreground">
              A control is introduced. Meetings are reduced, work is redistributed, roles are
              clarified or staffing changes. Then comes the difficult question: did the conditions
              of work improve, did the improvement last, or did pressure move somewhere else?
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 lg:gap-6 mb-12 max-w-4xl mx-auto">
            {gaps.map((item, index) => (
              <div
                key={index}
                className="p-6 rounded-container bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-control bg-[#F1F5F9]">
                    <XCircle className="w-5 h-5 text-[#5F6B68]" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-[#0F172A] mb-1">{item.name}</h3>
                    <p className="text-caption text-[#475569]">{item.problem}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto text-center p-6 lg:p-8 rounded-container bg-brand-softer border border-brand-soft">
            <p className="text-lead text-[#0F172A] font-medium">
              SignalTrue sits between assessment and the decision to maintain, modify or replace a
              control.
            </p>
            <p className="text-[#334155] mt-2">
              Use the organisation's existing psychosocial assessment and worker consultation. Add
              team-level work-pattern evidence before and after the intervention. Then bring the
              evidence back to people for the review decision.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <PrimaryCommercialCTA
                ctaLocation="homepage_problem"
                className="inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-5 py-3 text-caption font-bold text-white hover:bg-brand-hover"
              >
                Get a free preview
              </PrimaryCommercialCTA>
              <SampleReportCTA
                ctaLocation="homepage_problem"
                className="inline-flex min-h-12 items-center justify-center rounded-control border border-[#CBD5E1] bg-white px-5 py-3 text-caption font-bold text-[#0F172A]"
              >
                See the sample report
              </SampleReportCTA>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyOrganizationsGoBlind;
