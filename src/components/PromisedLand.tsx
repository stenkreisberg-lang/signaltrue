import { CheckCircle } from 'lucide-react';

const outcomes = [
  {
    title: 'Reduce manager bottlenecks',
    description: 'See where decisions, meetings, and interruptions are overloading key people.',
  },
  {
    title: 'Protect focus time',
    description: 'Find where meetings and response pressure are crowding out real work.',
  },
  {
    title: 'Stop after-hours creep',
    description: 'Catch recovery risk before evening work becomes normal.',
  },
  {
    title: 'Act before delivery slips',
    description:
      'Fix pressure patterns before they become missed work, burnout, or resignation risk.',
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
            <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-4">
              What leaders can fix earlier
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0F172A]">
              What leaders can fix before delivery slows.
            </h2>
          </div>

          {/* Outcome cards */}
          <div className="grid sm:grid-cols-2 gap-6">
            {outcomes.map((outcome, index) => (
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
                      {outcome.title}
                    </h3>
                    <p className="text-sm text-[#475569]">{outcome.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-12 text-center">
            <p className="text-xl text-[#0F172A] font-medium">
              SignalTrue helps leaders act before pressure becomes a people problem or delivery
              problem.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromisedLand;
