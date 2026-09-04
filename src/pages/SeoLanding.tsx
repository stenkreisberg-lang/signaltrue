import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle, LineChart, Shield, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';
import { PrimaryCommercialCTA, SampleReportCTA } from '../components/CommercialCTA';

const signalContent: Record<string, { title: string; description: string; bullets: string[] }> = {
  'meeting-overload': {
    title: 'Meeting overload signal',
    description:
      'Observe rising meeting density, recurring meeting load, and coordination pressure before teams lose execution time.',
    bullets: [
      'Meeting hours rising against baseline',
      'Recurring meetings expanding',
      'uninterrupted calendar availability squeezed by coordination',
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
      'Identify teams where work is shifting into evenings and weekends before recovery loss becomes sustained.',
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
    title: 'management capacity signal',
    description:
      'See when managers are becoming overloaded by meetings, interruptions, and decision bottlenecks.',
    bullets: [
      'Manager meeting load rising',
      'Decision load concentrated',
      'Protected uninterrupted calendar availability falling',
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
    eyebrow: 'Psychosocial risk early evidence',
    title: 'Review work conditions between surveys.',
    description:
      'SignalTrue uses work metadata to show team-level pressure patterns while there is still time to fix workload, coordination, and recovery conditions.',
    metaTitle: 'Psychosocial Risk Early Evidence for Teams | SignalTrue',
    metaDescription:
      'SignalTrue shows team-level work-condition patterns for meetings, uninterrupted calendar availability, recovery, response pressure, and management capacity without diagnosing burnout.',
    points: [
      'See sustained work pressure early enough to investigate with direct team context.',
      'Use team-level patterns instead of individual surveillance or sentiment guessing.',
      'Give leaders practical actions: reduce meeting load, protect focus, rebalance decision pressure.',
    ],
  },
  '/employee-engagement-leading-indicators': {
    eyebrow: 'Worker consultation indicators',
    title: 'Use changing work conditions to target worker consultation.',
    description:
      'SignalTrue gives Health & Safety leaders team-level evidence about coordination demand, focus loss, recovery opportunity and manager capacity.',
    metaTitle: 'Worker Consultation Indicators for Psychosocial Risk | SignalTrue',
    metaDescription:
      'Use team-level work-pattern indicators to prioritise worker consultation about meeting demand, fragmentation, recovery and manager capacity.',
    points: [
      'Use evidence to decide where consultation is most urgent.',
      'Ask workers to verify workload, meeting, response-time and manager-capacity context.',
      'Track whether agreed controls improve the same measured condition.',
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
      'Signal table for management capacity, meeting pressure, focus loss, response pressure, and recovery risk.',
      'Recommended actions that reduce system pressure without blaming individuals.',
    ],
  },
  '/solutions': {
    eyebrow: 'Solutions',
    title: 'Work-design evidence for Health & Safety, executives and operational owners.',
    description:
      'Use SignalTrue to see where overload, coordination drag, and recovery risk are building across teams.',
    metaTitle: 'Work-System Intelligence Solutions | SignalTrue',
    metaDescription:
      'SignalTrue helps HR, executives, and team leaders observe workload risk, manager overload, and execution drag early.',
    points: [
      'Health & Safety prioritises team-level psychosocial risk reviews.',
      'Executives see evidence confidence, controls due and barriers requiring decisions.',
      'Managers and workers agree practical controls and review effectiveness.',
    ],
  },
  '/resources': {
    eyebrow: 'Resources',
    title: 'Guides for spotting workload risk earlier.',
    description:
      'Start with the sample report, client success process and signal library to understand team-level psychosocial risk evidence.',
    metaTitle: 'Workload Risk Resources | SignalTrue',
    metaDescription:
      'Explore SignalTrue resources for psychosocial risk indicators, worker consultation, manager capacity and preventive action reviews.',
    points: [
      'Review psychosocial risk indicator guidance.',
      'Explore worker consultation prompts and responsibilities.',
      'Inspect the complete evidence-to-action sample report.',
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
  const ctaLocation = `seo_landing${location.pathname.replace(/[^a-z0-9]+/gi, '_')}`;

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
              <p className="text-caption font-semibold text-brand uppercase tracking-wider mb-4">
                {page.eyebrow}
              </p>
              <h1 className="text-display sm:text-display lg:text-display font-display font-bold text-[#0F172A] mb-6">
                {page.title}
              </h1>
              <p className="text-lead text-[#334155] max-w-3xl mb-8">{page.description}</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild variant="hero" size="xl">
                  <PrimaryCommercialCTA ctaLocation={ctaLocation}>
                    Book a 20-minute visibility review
                    <ArrowRight className="w-5 h-5" />
                  </PrimaryCommercialCTA>
                </Button>
                <Button asChild variant="hero-outline" size="xl">
                  <SampleReportCTA ctaLocation={ctaLocation}>
                    View the fictional sample
                  </SampleReportCTA>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-start">
              <div className="bg-white border border-[#E2E8F0] rounded-container p-8">
                <div className="flex items-center gap-3 mb-6">
                  <LineChart className="w-6 h-6 text-brand" />
                  <h2 className="text-lead font-display font-bold text-[#0F172A]">
                    What SignalTrue shows
                  </h2>
                </div>
                <ul className="space-y-4">
                  {page.points.map((point) => (
                    <li key={point} className="flex gap-3 text-[#334155]">
                      <CheckCircle className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
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
                    text: 'Every signal connects to practical interventions for meetings, focus, recovery, and management capacity.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="bg-white border border-[#E2E8F0] rounded-container p-6"
                  >
                    <item.icon className="w-6 h-6 text-brand mb-4" />
                    <h3 className="font-display font-bold text-[#0F172A] mb-2">{item.title}</h3>
                    <p className="text-caption text-[#475569]">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white border-y border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-section font-display font-bold text-[#0F172A] mb-4">
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
