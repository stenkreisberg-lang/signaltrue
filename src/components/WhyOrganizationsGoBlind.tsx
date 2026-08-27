import { XCircle } from 'lucide-react';
import { PrimaryCommercialCTA, SampleReportCTA } from './CommercialCTA';

const laggingIndicators = [
  {
    name: 'Annual risk assessments',
    problem: 'Can become a snapshot that misses how work changes between reviews.',
  },
  {
    name: 'Absence and turnover data',
    problem: 'Confirm harm or disruption after preventive opportunities have passed.',
  },
  {
    name: 'Manager observations',
    problem: 'Essential context, but difficult to compare consistently across teams.',
  },
  {
    name: 'Delivery dashboards',
    problem: 'Show delayed work, not the work-design conditions creating the risk.',
  },
];

const WhyOrganizationsGoBlind = () => {
  return (
    <section id="the-problem" className="py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
              The problem
            </p>
          </div>

          {/* Section headline */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-center mb-6">
            Psychosocial risks build gradually.
            <br />
            The work pattern changes first.
          </h2>

          <div className="max-w-3xl mx-auto text-center mb-12 lg:mb-16">
            <p className="text-xl text-muted-foreground">
              Before deadlines slip or people leave, the work pattern changes. Meetings increase.
              Focus time shrinks. Managers become bottlenecks. Urgent messages become normal. Work
              moves into evenings.
            </p>
            <p className="text-xl text-muted-foreground mt-4">
              Most organizations notice too late because their evidence is periodic, fragmented or
              focused on outcomes after exposure has already increased.
            </p>
          </div>

          {/* Enemy Tools Grid */}
          <div className="grid sm:grid-cols-2 gap-4 lg:gap-6 mb-12 max-w-4xl mx-auto">
            {laggingIndicators.map((item, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-[#FEE2E2]">
                    <XCircle className="w-5 h-5 text-[#B91C1C]" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-[#0F172A] mb-1">{item.name}</h3>
                    <p className="text-sm text-[#475569]">{item.problem}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Highlight box */}
          <div className="max-w-3xl mx-auto text-center p-6 lg:p-8 rounded-2xl bg-[#FEE2E2] border border-[#B91C1C]/20">
            <p className="text-lg lg:text-xl text-[#0F172A] font-medium">
              SignalTrue adds continuous evidence to—not a replacement for—worker consultation.
            </p>
            <p className="text-[#334155] mt-2">
              Identify the pattern, verify the cause with the team, select a proportionate control
              and review the same measure after action.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <PrimaryCommercialCTA
                ctaLocation="homepage_problem"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1D4ED8] px-5 py-3 text-sm font-bold text-white hover:bg-[#1E40AF]"
              />
              <SampleReportCTA
                ctaLocation="homepage_problem"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-5 py-3 text-sm font-bold text-[#0F172A]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyOrganizationsGoBlind;
