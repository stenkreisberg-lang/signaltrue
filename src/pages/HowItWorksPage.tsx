import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import {
  Plug,
  BarChart2,
  AlertTriangle,
  FileText,
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
  Activity,
  Users,
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
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8081';
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

// 4 Steps per brief
const steps = [
  {
    number: '01',
    icon: Plug,
    title: 'Connect work tools',
    subtitle: 'Connect',
    description:
      'Approve the specific calendar and collaboration sources required for the agreed risk question.',
    details: [
      'Google Calendar',
      'Outlook Calendar',
      'Slack',
      'Microsoft Teams',
      'Google Chat, where enabled',
      'Email metadata only when explicitly scoped',
    ],
    privacyNote: 'SignalTrue does not read message content or private conversations.',
  },
  {
    number: '02',
    icon: BarChart2,
    title: "Build each team's baseline",
    subtitle: 'Baseline',
    description:
      'SignalTrue learns the normal rhythm for each team: meeting load, focus availability, after-hours work, response delays, collaboration patterns, and management capacity.',
    note: 'A qualified baseline normally needs 3–4 weeks, sufficient mapped coverage and at least five active people. Some indicators require eight.',
  },
  {
    number: '03',
    icon: AlertTriangle,
    title: 'Observe pressure changes',
    subtitle: 'Observe',
    description:
      'SignalTrue flags material changes for investigation only after coverage, baseline maturity and group thresholds pass.',
    examples: [
      'Manager overload',
      'Meeting pressure',
      'Focus loss',
      'Response pressure',
      'Recovery risk',
      'Execution drag',
    ],
  },
  {
    number: '04',
    icon: FileText,
    title: 'Consult, control, and review',
    subtitle: 'Act safely',
    description:
      'Health & Safety reviews the evidence with workers, records an owned control and measures the same indicator again.',
    details: [
      'Current value, baseline and confidence',
      'Worker and manager context',
      'Named control owner and review date',
      '14-day and 28-day review',
      'Executive decision brief',
    ],
  },
];

const HowItWorksPage = () => {
  const location = useLocation();

  useEffect(() => {
    trackEvent('how_it_works_viewed');
  }, []);

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const element = document.getElementById(location.hash.slice(1));
        element?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageMeta
        title="How SignalTrue Works | Metadata-Only Team Signals"
        description="Learn how SignalTrue connects work tools, builds team baselines, observes workload risk, and recommends actions without reading message content."
        path="/how-it-works"
      />
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-white border-b border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-4">
                How it works
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6 text-[#0F172A]">
                From work-pattern evidence{' '}
                <span className="text-brand">to a reviewed preventive action.</span>
              </h1>
              <p className="text-lg text-[#334155] max-w-xl mx-auto mb-8">
                SignalTrue uses metadata from work tools to observe team-level changes in meetings,
                uninterrupted calendar availability, response pressure, recovery patterns, and
                management capacity. No message content. No individual scoring. No surveillance.
              </p>
              <Button asChild variant="hero" size="xl">
                <Link to="/contact" onClick={() => trackEvent('demo_cta_click')}>
                  Request a risk review
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-y border-[#E2E8F0] bg-white py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-10 max-w-3xl">
                <p className="mb-3 text-sm font-bold uppercase tracking-wider text-brand">
                  Implementation contract
                </p>
                <h2 className="text-3xl font-bold text-[#0F172A]">
                  Everyone knows what must be true before a signal is used.
                </h2>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                {[
                  [
                    'Purpose',
                    'Health & Safety defines the risk question, in-scope teams and prohibited uses.',
                  ],
                  [
                    'Permissions',
                    'IT approves minimum metadata permissions and confirms source ownership.',
                  ],
                  [
                    'Readiness',
                    'SignalTrue reports coverage, baseline maturity and suppression before interpretation.',
                  ],
                  [
                    'Review',
                    'Workers verify context; an operational owner implements and reviews the control.',
                  ],
                ].map(([title, copy]) => (
                  <div key={title} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                    <h3 className="font-bold text-[#0F172A]">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#475569]">{copy}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-6 md:flex md:items-center md:justify-between md:gap-6">
                <div>
                  <h3 className="font-bold text-brand-hover">
                    See deliverables, ownership and pilot success criteria
                  </h3>
                  <p className="mt-2 text-sm text-[#475569]">
                    The client success process covers the complete journey from scope to executive
                    review.
                  </p>
                </div>
                <Button asChild className="mt-4 shrink-0 md:mt-0">
                  <Link to="/client-success">View client success process</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 5-Step Process Section */}
        <section className="py-24 bg-[#F8FAFC]">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="relative flex gap-8 pb-20 last:pb-0 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {index < steps.length - 1 && (
                    <div className="absolute left-8 top-20 bottom-0 w-px bg-gradient-to-b from-brand/30 to-[#E2E8F0]" />
                  )}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-[#DBEAFE] border border-[#DBEAFE] flex items-center justify-center">
                      <span className="text-xl font-display font-bold text-brand-hover">
                        {step.number}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 pt-2">
                    <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-2">
                      {step.subtitle}
                    </p>
                    <div className="flex items-center gap-3 mb-3">
                      <step.icon className="w-6 h-6 text-brand" />
                      <h3 className="text-2xl font-display font-bold text-[#0F172A]">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-lg text-[#334155] mb-4">{step.description}</p>
                    {step.privacyNote && (
                      <p className="text-sm text-[#047857] mb-4 font-medium">{step.privacyNote}</p>
                    )}
                    {step.note && <p className="text-sm text-[#475569] italic mb-4">{step.note}</p>}
                    <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0]">
                      {step.details && (
                        <div className="grid sm:grid-cols-2 gap-3">
                          {step.details.map((detail, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-[#047857] flex-shrink-0" />
                              <span className="text-sm text-[#334155]">{detail}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {step.examples && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-[#475569] mb-3">
                            Signals detected:
                          </p>
                          <div className="grid sm:grid-cols-2 gap-3">
                            {step.examples.map((example, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-[#92400E] flex-shrink-0" />
                                <span className="text-sm text-[#334155]">{example}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy Reinforcement */}
        <section className="py-20 bg-[#ECFDF5] border-y border-[#A7F3D0]">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#A7F3D0] mb-6">
                  <Shield className="w-4 h-4 text-[#047857]" />
                  <span className="text-sm font-medium text-[#047857]">
                    Privacy by architecture
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-[#064E3B]">
                  What the evidence cannot tell you
                </h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-white border border-[#A7F3D0] text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#FEE2E2] mx-auto mb-4 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-[#B91C1C]" />
                  </div>
                  <h3 className="font-display font-semibold text-[#0F172A] mb-2">
                    No Message Reading
                  </h3>
                  <p className="text-sm text-[#475569]">
                    We never access email content, chat messages, or document text.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-white border border-[#A7F3D0] text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#FEE2E2] mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#B91C1C]" />
                  </div>
                  <h3 className="font-display font-semibold text-[#0F172A] mb-2">
                    No Individual Scoring
                  </h3>
                  <p className="text-sm text-[#475569]">
                    No performance ratings, productivity scores, or individual profiles.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-white border border-[#A7F3D0] text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#FEE2E2] mx-auto mb-4 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-[#B91C1C]" />
                  </div>
                  <h3 className="font-display font-semibold text-[#0F172A] mb-2">
                    No Surveillance
                  </h3>
                  <p className="text-sm text-[#475569]">
                    We don't track individuals or monitor private activity. Ever.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Free Diagnostic Strip */}
        <section className="py-14 bg-[#EFF6FF] border-b border-[#DBEAFE]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold text-brand uppercase tracking-wide mb-3">
                See it for your organization
              </p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0F172A] mb-3">
                Which psychosocial risk concern should you investigate first?
              </h2>
              <p className="text-[#334155] mb-8 max-w-xl mx-auto">
                Take the free diagnostic. 8 questions. 7 minutes. No integrations needed.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild variant="hero" size="lg">
                  <Link to="/drift-diagnostic">
                    Take the free diagnostic
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild variant="hero-outline" size="lg">
                  <Link to="/contact" onClick={() => trackEvent('demo_cta_click')}>
                    Request a workplace risk review
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-[#475569] mt-4">
                No personal data. No message content. Anonymous result.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-white border-t border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6 text-[#0F172A]">
                See how work patterns become early warning signals.
              </h2>
              <Button asChild variant="hero" size="xl">
                <Link to="/contact" onClick={() => trackEvent('demo_cta_click')}>
                  Request a risk review
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorksPage;
