import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle, LineChart, Shield, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';
import { trackEvent } from '../lib/analytics';

const signalContent: Record<string, { title: string; description: string; bullets: string[] }> = {
  'meeting-overload': {
    title: 'Meeting overload signal',
    description:
      'Detect rising meeting density, recurring meeting load, and coordination pressure before teams lose execution time.',
    bullets: [
      'Meeting hours rising against baseline',
      'Recurring meetings expanding',
      'Focus time squeezed by coordination',
    ],
  },
  'recovery-time-collapse': {
    title: 'Recovery time collapse signal',
    description:
      'See when after-hours work and compressed recovery windows become a sustained team risk.',
    bullets: [
      'After-hours work increasing',
      'Pressure periods extending',
      'Recovery windows shrinking',
    ],
  },
  'focus-fragmentation': {
    title: 'Focus fragmentation signal',
    description:
      'Find where interruptions and meeting patterns are breaking the long focus blocks teams need for real work.',
    bullets: ['Shorter focus windows', 'More context switching', 'Fewer maker-time blocks'],
  },
  'after-hours-drift': {
    title: 'After-hours drift signal',
    description:
      'Identify teams where work is shifting into evenings and weekends before burnout becomes visible.',
    bullets: [
      'Evening work patterns rising',
      'Weekend activity increasing',
      'Recovery loss becoming persistent',
    ],
  },
  'responsiveness-pressure': {
    title: 'Responsiveness pressure signal',
    description:
      'Understand when fast-response expectations are creating interruption pressure and weakening async work.',
    bullets: [
      'Shorter response expectations',
      'Rising urgent communication',
      'More interrupt-driven work',
    ],
  },
  'coordination-overhead': {
    title: 'Coordination overhead signal',
    description:
      'Spot when teams spend more energy coordinating work than moving important decisions forward.',
    bullets: ['More handoffs', 'More alignment loops', 'Slower decision flow'],
  },
  'manager-load': {
    title: 'Manager load signal',
    description:
      'See when managers are becoming overloaded by meetings, interruptions, and decision bottlenecks.',
    bullets: [
      'Manager meeting load rising',
      'Decision load concentrated',
      'Protected focus time falling',
    ],
  },
};

const pageContent: Record<
  string,
  {
    eyebrow: string;
    title: string;
    description: string;
    metaTitle: string;
    metaDescription: string;
    points: string[];
  }
> = {
  '/burnout-early-warning-system': {
    eyebrow: 'Burnout early warning system',
    title: 'Detect burnout risk before surveys or resignations reveal it.',
    description:
      'SignalTrue uses work metadata to show team-level pressure patterns while there is still time to fix workload, coordination, and recovery conditions.',
    metaTitle: 'Burnout Early Warning System for Teams | SignalTrue',
    metaDescription:
      'SignalTrue detects burnout risk early with team-level metadata signals for meetings, focus time, recovery, response pressure, and manager load.',
    points: [
      'See sustained pressure before it becomes absence, attrition, or missed delivery.',
      'Use team-level patterns instead of individual surveillance or sentiment guessing.',
      'Give leaders practical actions: reduce meeting load, protect focus, rebalance decision pressure.',
    ],
  },
  '/employee-engagement-leading-indicators': {
    eyebrow: 'Employee engagement leading indicators',
    title: 'Measure the work conditions that weaken engagement before scores drop.',
    description:
      'SignalTrue gives HR and leaders leading indicators from how work actually happens: coordination load, focus loss, recovery risk, and execution drag.',
    metaTitle: 'Employee Engagement Leading Indicators | SignalTrue',
    metaDescription:
      'Use SignalTrue to monitor leading indicators of employee engagement: meeting pressure, focus fragmentation, recovery risk, and manager overload.',
    points: [
      'Move from lagging survey results to early work-system signals.',
      'Understand whether engagement risk is caused by workload, meetings, responsiveness, or manager bottlenecks.',
      'Track whether interventions improve the actual conditions teams experience.',
    ],
  },
  '/sample-report': {
    eyebrow: 'Sample report',
    title: 'See what a weekly team pressure report looks like.',
    description:
      'Review the kind of executive summary, signal table, and recommended actions leaders receive after SignalTrue calibrates against team metadata.',
    metaTitle: 'Sample Team Pressure Report | SignalTrue',
    metaDescription:
      'View the SignalTrue sample report: team-level workload signals, pressure trends, and practical leadership actions without message content.',
    points: [
      'Weekly executive summary for leaders.',
      'Signal table for manager load, meeting pressure, focus loss, response pressure, and recovery risk.',
      'Recommended actions that reduce system pressure without blaming individuals.',
    ],
  },
  '/solutions': {
    eyebrow: 'Solutions',
    title: 'Work-system intelligence for HR, executives, and team leaders.',
    description:
      'Use SignalTrue to see where overload, coordination drag, and recovery risk are building across teams.',
    metaTitle: 'Work-System Intelligence Solutions | SignalTrue',
    metaDescription:
      'SignalTrue helps HR, executives, and team leaders detect workload risk, manager overload, and execution drag early.',
    points: [
      'HR sees engagement risk before surveys lag behind reality.',
      'Executives see where delivery capacity is weakening.',
      'Managers get practical actions that improve work conditions.',
    ],
  },
  '/resources': {
    eyebrow: 'Resources',
    title: 'Guides for spotting workload risk earlier.',
    description:
      'Start with the sample report, diagnostic, and signal library to understand early indicators of burnout and execution drag.',
    metaTitle: 'Workload Risk Resources | SignalTrue',
    metaDescription:
      'Explore SignalTrue resources for burnout early warning, employee engagement leading indicators, and team workload risk.',
    points: [
      'Read the burnout early warning guide.',
      'Explore employee engagement leading indicators.',
      'Review the sample team pressure report.',
    ],
  },
};

export default function SeoLanding() {
  const location = useLocation();
  const { signalSlug } = useParams<{ signalSlug?: string }>();
  const signal = signalSlug ? signalContent[signalSlug] : null;
  const page = signal
    ? {
        eyebrow: 'Signal library',
        title: signal.title,
        description: signal.description,
        metaTitle: `${signal.title} | SignalTrue`,
        metaDescription: signal.description,
        points: signal.bullets,
      }
    : pageContent[location.pathname] || pageContent['/resources'];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title={page.metaTitle}
        description={page.metaDescription}
        path={location.pathname}
      />
      <Navbar />
      <main className="pt-20">
        <section className="bg-white border-b border-[#E2E8F0] py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-4">
                {page.eyebrow}
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-[#0F172A] mb-6">
                {page.title}
              </h1>
              <p className="text-xl text-[#334155] max-w-3xl mb-8">{page.description}</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/contact"
                  onClick={() => trackEvent('demo_cta_click', { source_page: location.pathname })}
                >
                  <Button variant="hero" size="xl">
                    Request demo
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link
                  to="/product#sample-report"
                  onClick={() =>
                    trackEvent('sample_report_click', { source_page: location.pathname })
                  }
                >
                  <Button variant="hero-outline" size="xl">
                    View sample report
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-start">
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <LineChart className="w-6 h-6 text-[#1D4ED8]" />
                  <h2 className="text-2xl font-display font-bold text-[#0F172A]">
                    What SignalTrue shows
                  </h2>
                </div>
                <ul className="space-y-4">
                  {page.points.map((point) => (
                    <li key={point} className="flex gap-3 text-[#334155]">
                      <CheckCircle className="w-5 h-5 text-[#047857] flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: Users,
                    title: 'Team-level only',
                    text: 'Reports stay aggregated so leaders can improve work systems without monitoring individuals.',
                  },
                  {
                    icon: Shield,
                    title: 'No message content',
                    text: 'SignalTrue uses timing, counts, and collaboration metadata, not email bodies or chat text.',
                  },
                  {
                    icon: LineChart,
                    title: 'Baseline-aware',
                    text: 'Signals compare current conditions against the team baseline so leaders see what changed.',
                  },
                  {
                    icon: CheckCircle,
                    title: 'Action-oriented',
                    text: 'Every signal connects to practical interventions for meetings, focus, recovery, and manager load.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="bg-white border border-[#E2E8F0] rounded-2xl p-6"
                  >
                    <item.icon className="w-6 h-6 text-[#1D4ED8] mb-4" />
                    <h3 className="font-display font-bold text-[#0F172A] mb-2">{item.title}</h3>
                    <p className="text-sm text-[#475569]">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white border-y border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-display font-bold text-[#0F172A] mb-4">
                Explore the product next
              </h2>
              <p className="text-[#475569] mb-8">
                See the sample report, privacy model, and six core signals in the product overview.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/product">
                  <Button variant="cta" size="lg">
                    Product overview
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="outline" size="lg">
                    Pricing
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
}
