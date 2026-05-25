import { XCircle } from 'lucide-react';

const laggingIndicators = [
  {
    name: 'Surveys',
    problem: 'Show how people felt after pressure built up.',
  },
  {
    name: 'Exit interviews',
    problem: 'Explain the problem after someone has already left.',
  },
  {
    name: 'Manager intuition',
    problem: 'Useful, but inconsistent and hard to scale.',
  },
  {
    name: 'Project dashboards',
    problem: 'Show missed work, not the pressure causing it.',
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
            Teams rarely break suddenly.
            <br />
            They slow down first.
          </h2>

          <div className="max-w-3xl mx-auto text-center mb-12 lg:mb-16">
            <p className="text-xl text-muted-foreground">
              Before deadlines slip or people leave, the work pattern changes. Meetings increase.
              Focus time shrinks. Managers become bottlenecks. Urgent messages become normal. Work
              moves into evenings.
            </p>
            <p className="text-xl text-muted-foreground mt-4">
              Most companies notice this too late because their tools show opinions, outputs, or
              damage after pressure has already built up.
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
              SignalTrue helps leaders see pressure while it is still fixable.
            </p>
            <p className="text-[#334155] mt-2">
              Meetings pile up. Focus time disappears. Managers become bottlenecks. Work moves into
              evenings.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyOrganizationsGoBlind;
