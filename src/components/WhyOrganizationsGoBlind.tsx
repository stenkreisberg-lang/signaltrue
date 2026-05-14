import { XCircle } from 'lucide-react';

const laggingIndicators = [
  {
    name: 'Annual surveys',
    problem: 'Tell you how people felt after the pressure already built up.',
  },
  { name: 'Exit interviews', problem: 'Explain why someone left after the damage is done.' },
  { name: 'Manager intuition', problem: 'Anecdotal and inconsistent. Hard to act on at scale.' },
  {
    name: 'Engagement dashboards',
    problem: 'Show numbers without telling leaders what to fix or when.',
  },
];

const WhyOrganizationsGoBlind = () => {
  return (
    <section id="the-problem" className="py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
              The Problem
            </p>
          </div>

          {/* Section headline */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-center mb-6">
            Most teams do not break suddenly.
            <br />
            They slow down first.
          </h2>

          <div className="max-w-3xl mx-auto text-center mb-12 lg:mb-16 space-y-4">
            <p className="text-xl text-muted-foreground">
              Before burnout, resignation, or missed delivery, the work system usually shows signs.
              Most companies notice too late because they rely on signals that only arrive after the
              damage is already visible.
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
              SignalTrue helps leaders see the pressure building while it is still fixable.
            </p>
            <p className="text-[#334155] mt-2">
              Meetings pile up. Focus time disappears. Managers become bottlenecks. Urgent messages
              become the norm. Work moves into evenings.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyOrganizationsGoBlind;
