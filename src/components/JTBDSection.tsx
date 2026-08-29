import { UserCheck, Users, Clock, Zap, Moon, RefreshCw } from 'lucide-react';

const signals = [
  {
    icon: UserCheck,
    name: 'Manager capacity',
    description: 'Coordination and decision demands exceed usable management capacity.',
  },
  {
    icon: Users,
    name: 'Meeting demand',
    description: 'Recurring meetings compress the time available to complete planned work.',
  },
  {
    icon: Clock,
    name: 'Work fragmentation',
    description: 'Usable focus windows shrink and task switching increases.',
  },
  {
    icon: Zap,
    name: 'Communication pressure',
    description: 'Short response expectations and urgent requests become routine.',
  },
  {
    icon: Moon,
    name: 'Recovery opportunity',
    description: 'Work moves outside normal hours or high-demand periods repeat without recovery.',
  },
  {
    icon: RefreshCw,
    name: 'Combined exposure',
    description: 'Several work-design risk indicators move together over time.',
  },
];

const JTBDSection = () => {
  return (
    <section id="what-we-observe" className="py-16 lg:py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-4">
              What SignalTrue observes
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 text-[#0F172A]">
              Leading indicators for psychosocial risk review.
            </h2>
            <p className="text-lg text-[#475569] max-w-2xl mx-auto">
              SignalTrue compares current team-level patterns with the team’s own baseline. It
              highlights material changes for investigation—not diagnoses, individual scores or
              conclusions about worker health.
            </p>
          </div>

          {/* Signal cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {signals.map((signal, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] animate-slide-up"
                style={{ animationDelay: `${index * 0.07}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] mb-4 flex items-center justify-center">
                  <signal.icon className="w-6 h-6 text-brand" />
                </div>
                <h3 className="font-display font-semibold text-[#0F172A] mb-2">{signal.name}</h3>
                <p className="text-sm text-[#475569]">{signal.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default JTBDSection;
