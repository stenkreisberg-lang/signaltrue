import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import {
  Clock,
  Users,
  Zap,
  Moon,
  RefreshCw,
  UserCheck,
  ArrowRight,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Activity,
  Eye,
} from 'lucide-react';

// Analytics tracking
const trackEvent = (eventName: string) => {
  if (
    typeof window !== 'undefined' &&
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  ) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', eventName);
  }
  try {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    fetch(`${apiUrl}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, timestamp: new Date().toISOString() }),
    }).catch(() => {
      /* Silently fail for analytics */
    });
  } catch {
    /* Silently fail for analytics */
  }
};

// 6 Signal cards — short format per brief
const signals = [
  {
    icon: UserCheck,
    name: 'Manager load',
    detects: 'Manager meetings, interruptions, decision load, shrinking focus time.',
    whyItMatters: 'Overloaded managers become bottlenecks.',
    action: 'Delegate decisions, reduce recurring meetings, protect manager focus blocks.',
  },
  {
    icon: Users,
    name: 'Meeting pressure',
    detects: 'Rising meeting volume, recurring meetings, meeting density.',
    whyItMatters: 'Meetings crowd out work and slow decisions.',
    action: 'Cancel low-value meetings, shorten defaults, assign meeting owners.',
  },
  {
    icon: Clock,
    name: 'Focus loss',
    detects: 'Shrinking focus windows and fragmented workdays.',
    whyItMatters: 'People need usable hours, not just fewer meetings.',
    action: 'Create team focus blocks, move updates async, reduce ad hoc interruptions.',
  },
  {
    icon: Zap,
    name: 'Response pressure',
    detects: 'Faster expected responses and rising urgent communication.',
    whyItMatters: 'Constant urgency creates stress and weakens async work.',
    action: 'Define response rules, reduce "just checking" follow-ups, protect async decisions.',
  },
  {
    icon: Moon,
    name: 'Recovery risk',
    detects: 'After-hours work and repeated high-pressure periods.',
    whyItMatters: 'Short pressure spikes are normal. Sustained recovery loss is not.',
    action: 'Pause non-essential work, reduce meeting compression, rebalance load.',
  },
  {
    icon: RefreshCw,
    name: 'Execution drag',
    detects: 'Several pressure signals rising together.',
    whyItMatters: 'The team can look busy while moving slower.',
    action: 'Run a work-system review and fix the top three pressure points.',
  },
];

// What SignalTrue does NOT do per spec
const whatThisIsNot = [
  'SignalTrue does not read message content.',
  'SignalTrue does not read email bodies.',
  'SignalTrue does not record meetings.',
  'SignalTrue does not track screens.',
  'SignalTrue does not monitor keystrokes.',
  'SignalTrue does not rank employees.',
  'SignalTrue does not show individual productivity scores.',
  'SignalTrue does not tell managers who is underperforming.',
];

// Sample report signal rows
const reportSignals = [
  {
    signal: 'Manager load',
    status: 'Critical',
    change: '+32%',
    meaning: 'Managers are spending more time in meetings and coordination',
  },
  {
    signal: 'Meeting pressure',
    status: 'Rising',
    change: '+18%',
    meaning: 'Meeting load is increasing compared with the team baseline',
  },
  {
    signal: 'Focus time',
    status: 'Decreasing',
    change: '-28%',
    meaning: 'Usable focus windows are shrinking',
  },
  {
    signal: 'After-hours work',
    status: 'Rising',
    change: '+35%',
    meaning: 'More work is moving into evenings',
  },
  {
    signal: 'Response pressure',
    status: 'Rising',
    change: '+21%',
    meaning: 'Faster response expectations may be creating interruption pressure',
  },
  {
    signal: 'Execution drag',
    status: 'Watch',
    change: '+14%',
    meaning: 'Several pressure signals are rising together',
  },
];

const Product = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-white border-b border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-4">
                Product
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6 text-[#0F172A]">
                See the signals that show{' '}
                <span className="text-[#1D4ED8]">manager overload early.</span>
              </h1>
              <p className="text-xl text-[#334155] max-w-2xl mx-auto mb-4">
                SignalTrue detects team-level changes in meetings, focus time, response pressure,
                after-hours work, and manager load before they become delivery or retention
                problems.
              </p>
              <p className="text-sm text-[#475569] mb-8">
                Metadata only. Team-level only. No message content. No individual productivity
                scores.
              </p>
              <Link to="/contact" onClick={() => trackEvent('demo_requested')}>
                <Button variant="hero" size="xl">
                  Request demo
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Sample Report Section */}
        <section
          id="sample-report"
          className="py-20 lg:py-24 bg-[#F8FAFC] border-b border-[#E2E8F0]"
        >
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-4">
                  Sample report
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-[#0F172A]">
                  The weekly report leaders receive.
                </h2>
                <p className="text-lg text-[#475569] max-w-2xl mx-auto">
                  Each week, SignalTrue shows what changed, which teams are under pressure, and what
                  leaders should fix next.
                </p>
              </div>

              {/* Report card */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_8px_24px_rgba(15,23,42,0.06)] overflow-hidden">
                {/* Report header */}
                <div className="p-6 border-b border-[#E2E8F0] bg-[#0F172A]">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                        <span className="text-xs font-medium text-[#FCD34D] uppercase tracking-wider">
                          Rising pressure
                        </span>
                      </div>
                      <h3 className="text-2xl font-display font-bold text-white">
                        Weekly Team Pressure Report
                      </h3>
                      <p className="text-[#94A3B8] mt-1">
                        Team: Product &amp; Engineering · 13 May to 19 May
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-xs text-[#64748B]">
                        Report type: Team-level signals only
                      </span>
                      <span className="text-xs text-[#64748B]">
                        No message content. No individual scores.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Executive summary */}
                <div className="p-6 border-b border-[#E2E8F0]">
                  <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-3">
                    Executive summary
                  </p>
                  <p className="text-[#334155] mb-4">
                    Product &amp; Engineering is showing rising pressure this week. Several signals
                    are moving together: meeting pressure is increasing, focus time is decreasing,
                    after-hours work is rising, manager load is critical, and response pressure is
                    rising.
                  </p>
                  <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FCD34D]/40">
                    <p className="text-sm font-semibold text-[#92400E]">
                      Recommended leadership focus this week
                    </p>
                    <p className="text-sm text-[#78350F] mt-1">
                      Reduce manager bottlenecks and protect focus time before pressure becomes a
                      delivery or retention problem.
                    </p>
                  </div>
                </div>

                {/* Signal overview table */}
                <div className="p-6 border-b border-[#E2E8F0]">
                  <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-4">
                    Signal overview
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E2E8F0]">
                          <th className="text-left py-2 pr-4 text-[#475569] font-medium">Signal</th>
                          <th className="text-left py-2 pr-4 text-[#475569] font-medium">Status</th>
                          <th className="text-right py-2 pr-4 text-[#475569] font-medium">
                            Change
                          </th>
                          <th className="text-left py-2 text-[#475569] font-medium hidden sm:table-cell">
                            What it means
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportSignals.map((row, i) => (
                          <tr key={i} className="border-b border-[#F1F5F9] last:border-0">
                            <td className="py-3 pr-4 font-medium text-[#0F172A]">{row.signal}</td>
                            <td className="py-3 pr-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  row.status === 'Critical'
                                    ? 'bg-[#FEE2E2] text-[#B91C1C]'
                                    : row.status === 'Rising'
                                      ? 'bg-[#FEF3C7] text-[#92400E]'
                                      : row.status === 'Decreasing'
                                        ? 'bg-[#FEF3C7] text-[#92400E]'
                                        : 'bg-[#F1F5F9] text-[#475569]'
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-right font-semibold text-[#B91C1C]">
                              {row.change}
                            </td>
                            <td className="py-3 text-[#475569] hidden sm:table-cell">
                              {row.meaning}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recommended actions preview */}
                <div className="p-6">
                  <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-4">
                    Recommended actions this week
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      {
                        n: 1,
                        title: 'Reduce recurring meeting load',
                        detail:
                          'Review all recurring meetings. Cancel, shorten, or move async any meeting that does not support decision-making, conflict resolution, or cross-team alignment.',
                      },
                      {
                        n: 2,
                        title: 'Protect manager focus blocks',
                        detail:
                          'Add at least two protected 90-minute focus blocks per manager. These blocks should not be used for status updates or recurring meetings.',
                      },
                      {
                        n: 3,
                        title: 'Move routine updates async',
                        detail:
                          'Replace at least one recurring status meeting with a written update this week.',
                      },
                      {
                        n: 4,
                        title: 'Assign clearer decision owners',
                        detail:
                          'Every active workstream should have one clear decision owner by the end of the week.',
                      },
                    ].map((action) => (
                      <div
                        key={action.n}
                        className="p-4 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE]"
                      >
                        <p className="text-sm font-semibold text-[#1E3A8A] mb-1">
                          Action {action.n}: {action.title}
                        </p>
                        <p className="text-xs text-[#334155] leading-relaxed">{action.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                    <p className="text-xs text-[#475569]">
                      This report is based on team-level work metadata only. No message content. No
                      individual productivity scores. Goal: system pressure, not personal blame.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center mt-8">
                <Link to="/contact" onClick={() => trackEvent('demo_requested')}>
                  <Button variant="hero" size="lg">
                    See this report in a demo
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Signals Section */}
        <section className="py-20 lg:py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-[#0F172A]">
                The six signals SignalTrue tracks
              </h2>
              <p className="text-[#475569]">
                Each signal shows where work is becoming heavier, slower, or harder to sustain.
              </p>
            </div>

            <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {signals.map((signal, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] animate-slide-up shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
                  style={{ animationDelay: `${index * 0.07}s` }}
                >
                  <div className="p-3 rounded-xl bg-[#EFF6FF] w-fit mb-4">
                    <signal.icon className="w-6 h-6 text-[#1D4ED8]" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-[#0F172A] mb-3">
                    {signal.name}
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-[#1D4ED8] uppercase tracking-wider mb-1">
                        Detects
                      </p>
                      <p className="text-sm text-[#475569]">{signal.detects}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1D4ED8] uppercase tracking-wider mb-1">
                        Why it matters
                      </p>
                      <p className="text-sm text-[#475569]">{signal.whyItMatters}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1D4ED8] uppercase tracking-wider mb-1">
                        Action
                      </p>
                      <p className="text-sm text-[#475569]">{signal.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What This Is NOT Section */}
        <section className="py-20 lg:py-24 bg-[#F8FAFC] border-y border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-[#0F172A]">
                  What SignalTrue does not do
                </h2>
                <p className="text-lg text-[#475569]">
                  SignalTrue shows system pressure, not personal blame.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {whatThisIsNot.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex items-center gap-3"
                  >
                    <XCircle className="w-5 h-5 text-[#B91C1C] flex-shrink-0" />
                    <span className="text-[#0F172A] font-medium text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-6 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-center">
                <p className="text-lg text-[#064E3B] font-medium">
                  SignalTrue shows system pressure, not personal blame. That difference matters.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6 text-[#0F172A]">
                See the report your leaders would receive.
              </h2>
              <p className="text-lg text-[#334155] mb-8 max-w-xl mx-auto">
                Request a demo and we will show how SignalTrue turns work patterns into a weekly
                leadership report.
              </p>
              <Link to="/contact" onClick={() => trackEvent('demo_requested')}>
                <Button variant="hero" size="xl">
                  Request demo
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Product;
