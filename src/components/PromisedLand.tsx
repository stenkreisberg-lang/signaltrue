import { CheckCircle, Sparkles } from 'lucide-react';

const promisedLandBenefits = [
  {
    title: 'Fewer surprise exits',
    description: 'See where work patterns suggest teams may be under sustained pressure.',
  },
  {
    title: 'Earlier leadership decisions',
    description: 'Act before pressure becomes burnout, missed work, or key-person risk.',
  },
  {
    title: 'Structural fixes instead of motivational talks',
    description: 'Address root causes in workload, meetings, focus time, and coordination.',
  },
  {
    title: 'Sustainable execution under pressure',
    description: 'Maintain performance without normalizing exhaustion.',
  },
];

const PromisedLand = () => {
  return (
    <section id="promised-land" className="py-16 lg:py-20 bg-[#F8FAFC] border-y border-[#E2E8F0]">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D1FAE5] border border-[#A7F3D0] mb-6">
              <Sparkles className="w-4 h-4 text-[#047857]" />
              <span className="text-sm font-medium text-[#047857]">The Prevention Shift</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0F172A]">
              What changes when you see risk early
            </h2>
          </div>

          {/* Benefits grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {promisedLandBenefits.map((benefit, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-white border border-[#E2E8F0] animate-slide-up shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-[#D1FAE5] flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-[#047857]" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-[#0F172A] mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-[#475569]">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-12 text-center">
            <p className="text-xl text-[#0F172A] font-medium">
              Leaders see where workload risk is building before it becomes burnout, missed
              execution, or resignation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromisedLand;
