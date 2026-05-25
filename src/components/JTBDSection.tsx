import { UserCheck, Users, Clock, Zap, Moon, RefreshCw } from 'lucide-react';

const signals = [
  {
    icon: UserCheck,
    name: 'Manager overload',
    description: 'Managers lose focus time and become decision bottlenecks.',
  },
  {
    icon: Users,
    name: 'Meeting pressure',
    description: 'Recurring meetings crowd out real work.',
  },
  {
    icon: Clock,
    name: 'Focus loss',
    description: 'Deep work windows shrink or disappear.',
  },
  {
    icon: Zap,
    name: 'Response pressure',
    description: 'Urgent communication becomes the default.',
  },
  {
    icon: Moon,
    name: 'Recovery risk',
    description: 'Work shifts into evenings and repeated high-pressure periods.',
  },
  {
    icon: RefreshCw,
    name: 'Execution drag',
    description: 'Several signals combine and the team starts moving slower.',
  },
];

const JTBDSection = () => {
  return (
    <section id="what-we-detect" className="py-16 lg:py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-4">
              What SignalTrue detects
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 text-[#0F172A]">
              Early warning signals for manager overload and execution drag.
            </h2>
            <p className="text-lg text-[#475569] max-w-2xl mx-auto">
              SignalTrue compares each team's current work rhythm against its normal baseline and
              flags changes in meetings, focus time, after-hours work, response pressure, and
              manager load.
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
                  <signal.icon className="w-6 h-6 text-[#1D4ED8]" />
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
