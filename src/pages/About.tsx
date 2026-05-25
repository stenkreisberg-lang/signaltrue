import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity, Shield, Eye } from 'lucide-react';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 *
 * About Page (per spec):
 * Purpose: Credibility + philosophical alignment.
 *
 * Opening: Why SignalTrue Exists
 * Copy: Burnout is not a motivation problem. It's a system problem that goes unseen for too long.
 *
 * Belief System:
 * - Signals beat surveys
 * - Systems shape behavior
 * - Early truth enables better leadership
 *
 * Founding Insight: Explain why existing tools fail leaders.
 * No bios first. Belief first.
 */

// Analytics tracking
const trackEvent = (eventName: string) => {
  if (
    typeof window !== 'undefined' &&
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  ) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', eventName);
  }
};

// Belief system per spec - 5 beliefs
const beliefs = [
  {
    icon: Activity,
    title: 'The work system usually breaks before people do.',
    description:
      'Burnout is rarely the first signal. Before that, meeting load rises, focus time disappears, response pressure increases, and recovery shrinks.',
  },
  {
    icon: Eye,
    title: 'Managers are often the pressure layer.',
    description:
      'Managers absorb leadership priorities, team questions, customer pressure, and unclear decisions. When managers overload, the whole team feels it.',
  },
  {
    icon: Shield,
    title: 'Surveys are useful, but late.',
    description:
      'Surveys tell leaders how people felt after pressure was already building. SignalTrue helps leaders see where to act earlier.',
  },
  {
    icon: Shield,
    title: 'Privacy must be designed, not promised.',
    description:
      'A company should not need to trust managers not to misuse data. The product should prevent misuse by design.',
  },
  {
    icon: Activity,
    title: 'The answer is system change, not personal blame.',
    description:
      'If a signal rises, the question is not "Who is the problem?" The question is "What in the way we work is creating this pressure?"',
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-white border-b border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-4">
                Why SignalTrue Exists
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6 text-[#0F172A]">
                Work does not break because people stop caring.{' '}
                <span className="text-[#1D4ED8]">
                  It breaks because the system makes caring harder.
                </span>
              </h1>
              <p className="text-lg text-[#334155] max-w-xl mx-auto">
                SignalTrue exists to help leaders see the work-system friction that usually stays
                hidden until people burn out, delivery slows, or managers become bottlenecks.
              </p>
            </div>
          </div>
        </section>

        {/* Founding Insight Section */}
        <section className="py-20 lg:py-24 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-4">
                The founding insight
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-8 text-[#0F172A]">
                Existing tools show the problem too late.
              </h2>
              <div className="space-y-6 text-lg text-[#334155]">
                <p>Surveys show how people felt after pressure built up.</p>
                <p>Exit interviews explain why someone left.</p>
                <p>Project dashboards show missed work after delivery is already affected.</p>
                <p>
                  All of these are useful. But they usually describe the damage after it happens.
                </p>
                <p className="text-[#0F172A] font-medium border-l-4 border-[#1D4ED8] pl-6 bg-[#EFF6FF] py-4 pr-4 rounded-r-xl">
                  SignalTrue was built to detect pressure earlier, while leaders can still fix the
                  system.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Belief System Section */}
        <section className="py-20 lg:py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-4">
                What we believe
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#0F172A]">
                What we believe
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {beliefs.map((belief, index) => (
                <div
                  key={index}
                  className="p-8 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] mb-6 flex items-center justify-center">
                    <belief.icon className="w-7 h-7 text-[#1D4ED8]" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-[#0F172A] mb-4">
                    {belief.title}
                  </h3>
                  <p className="text-[#475569]">{belief.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ethics / Dark Island Section */}
        <section className="py-20 lg:py-24 bg-[#0F172A]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6 text-white">
                Built for prevention, not surveillance.
              </h2>
              <p className="text-[#CBD5E1] text-lg mb-6">
                SignalTrue does not diagnose people, score performance, or expose private behavior.
                It shows team-level work pressure so leaders can fix the system earlier.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 mt-8">
                {['No individual scoring', 'No employee ranking', 'System-level signals only'].map(
                  (item) => (
                    <div
                      key={item}
                      className="px-4 py-3 rounded-xl bg-[#1E293B] border border-[#334155]"
                    >
                      <span className="text-[#CBD5E1] text-sm font-medium">{item}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-[#F8FAFC]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6 text-[#0F172A]">
                Built for prevention, not surveillance.
              </h2>
              <p className="text-lg text-[#334155] mb-8 max-w-xl mx-auto">
                SignalTrue does not diagnose people, score performance, or expose private behavior.
                It shows team-level work pressure so leaders can fix the system earlier.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/how-it-works">
                  <Button variant="hero-outline" size="xl">
                    See how it works
                  </Button>
                </Link>
                <Link to="/contact" onClick={() => trackEvent('demo_requested')}>
                  <Button variant="hero" size="xl">
                    Request demo
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
