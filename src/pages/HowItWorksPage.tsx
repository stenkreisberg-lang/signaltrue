import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import {
  Plug,
  BarChart2,
  AlertTriangle,
  FileText,
  TrendingUp,
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

// 4 Steps per brief
const steps = [
  {
    number: '01',
    icon: Plug,
    title: 'Connect work tools',
    subtitle: 'Connect',
    description: 'Connect calendars and collaboration tools where work patterns already exist.',
    details: [
      'Google Calendar',
      'Outlook Calendar',
      'Slack',
      'Microsoft Teams',
      'Google Chat',
      'Email metadata where appropriate',
    ],
    privacyNote: 'SignalTrue does not read message content or private conversations.',
  },
  {
    number: '02',
    icon: BarChart2,
    title: "Build each team's baseline",
    subtitle: 'Baseline',
    description:
      'SignalTrue learns the normal rhythm for each team: meeting load, focus availability, after-hours work, response delays, collaboration patterns, and manager load.',
    note: 'A signal only matters when it changes from normal.',
  },
  {
    number: '03',
    icon: AlertTriangle,
    title: 'Detect pressure changes',
    subtitle: 'Detect',
    description:
      'SignalTrue flags early changes that suggest manager overload, meeting pressure, focus loss, response pressure, recovery risk, or execution drag.',
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
    title: 'Report, act, and track',
    subtitle: 'Report',
    description:
      'Leaders receive a weekly report showing what changed, which teams are under pressure, what risk is growing, what to fix next, and whether previous actions helped.',
    details: [
      'What changed',
      'Which teams are under pressure',
      'What risk is growing',
      'What to fix next',
      'Whether previous actions helped',
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
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-white border-b border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-4">
                How it works
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6 text-[#0F172A]">
                How SignalTrue detects pressure{' '}
                <span className="text-[#1D4ED8]">without watching people.</span>
              </h1>
              <p className="text-lg text-[#334155] max-w-xl mx-auto mb-8">
                SignalTrue uses metadata from work tools to detect team-level changes in meetings,
                focus time, response pressure, recovery patterns, and manager load. No message
                content. No individual scoring. No surveillance.
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
                    <div className="absolute left-8 top-20 bottom-0 w-px bg-gradient-to-b from-[#1D4ED8]/30 to-[#E2E8F0]" />
                  )}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-[#DBEAFE] border border-[#DBEAFE] flex items-center justify-center">
                      <span className="text-xl font-display font-bold text-[#1E3A8A]">
                        {step.number}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 pt-2">
                    <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-2">
                      {step.subtitle}
                    </p>
                    <div className="flex items-center gap-3 mb-3">
                      <step.icon className="w-6 h-6 text-[#1D4ED8]" />
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
                  What We Never Do
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
              <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wide mb-3">
                See it for your organization
              </p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0F172A] mb-3">
                Is manager overload already slowing your team?
              </h2>
              <p className="text-[#334155] mb-8 max-w-xl mx-auto">
                Take the free diagnostic. 8 questions. 7 minutes. No integrations needed.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/drift-diagnostic">
                  <Button variant="hero" size="lg">
                    Take the free diagnostic
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/contact" onClick={() => trackEvent('demo_requested')}>
                  <Button variant="hero-outline" size="lg">
                    Request a full demo
                  </Button>
                </Link>
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

export default HowItWorksPage;
