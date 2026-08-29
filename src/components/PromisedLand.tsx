import { CheckCircle } from 'lucide-react';

const outcomes = [
  {
    title: 'Reduce excessive demands',
    description:
      'Review workload, meeting load and decision demand before exposure becomes sustained.',
  },
  {
    title: 'Improve work control',
    description:
      'Protect usable work time and clarify priorities, autonomy and response expectations.',
  },
  {
    title: 'Protect recovery',
    description: 'Identify when work outside normal hours is becoming a repeated team pattern.',
  },
  {
    title: 'Review control effectiveness',
    description: 'Assign an owner, record the action and compare the same indicator after 14 days.',
  },
];

const PromisedLand = () => {
  return (
    <section
      id="what-leaders-fix"
      className="py-16 lg:py-20 bg-[#F8FAFC] border-y border-[#E2E8F0]"
    >
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <p className="text-caption font-semibold text-brand uppercase tracking-wider mb-4">
              What leaders can fix earlier
            </p>
            <h2 className="text-section sm:text-display lg:text-display font-display font-bold text-[#0F172A]">
              Turn evidence into preventive action.
            </h2>
          </div>

          {/* Outcome cards */}
          <div className="grid sm:grid-cols-2 gap-6">
            {outcomes.map((outcome, index) => (
              <div
                key={index}
                className="p-6 rounded-container bg-white border border-[#E2E8F0] animate-slide-up shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-control bg-brand-soft flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-[#0F172A] mb-2">
                      {outcome.title}
                    </h3>
                    <p className="text-caption text-[#475569]">{outcome.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-12 text-center">
            <p className="text-lead text-[#0F172A] font-medium">
              A signal starts a health &amp; safety conversation. It never replaces worker
              consultation, professional judgement or a formal risk assessment.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromisedLand;
