import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Focus, TrendingDown } from 'lucide-react';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 *
 * Team Analytics Page (per spec):
 * Purpose: Show analytical depth without "analytics tool" framing.
 *
 * Title: What Teams Absorb Before They Break
 *
 * Sections:
 * - System Load
 * - Attention Fragmentation
 * - Execution Pressure
 *
 * Explain patterns, not charts.
 */

// Analytics tracking
const trackEvent = (eventName: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName);
  }
};

// Team analytics sections per spec
const analyticsPatterns = [
  {
    icon: Zap,
    title: 'System Load',
    description: 'How much coordination overhead does the team absorb?',
    whatWeObserve: [
      'Meeting hours as percentage of work time',
      'Back-to-back meeting patterns',
      'Cross-team coordination requirements',
      'Communication volume trends',
    ],
    whyItMatters:
      "High system load forces work into evenings and weekends. It's the invisible tax on execution that surveys don't capture.",
  },
  {
    icon: Focus,
    title: 'Attention Fragmentation',
    description: 'How often is deep work interrupted?',
    whatWeObserve: [
      'Focus time availability per week',
      'Context switching frequency',
      'Uninterrupted work blocks',
      'Notification and message patterns',
    ],
    whyItMatters:
      'Fragmented attention degrades quality and increases stress. People work longer hours but produce less value.',
  },
  {
    icon: TrendingDown,
    title: 'Execution Pressure',
    description: 'Is effort translating into forward motion?',
    whatWeObserve: [
      'Delivery pace relative to effort',
      'Blocked work patterns',
      'After-hours activity trends',
      'Sprint completion vs. overtime correlation',
    ],
    whyItMatters:
      'When effort stays high but execution slows, the team is compensating for structural problems. This predicts burnout and attrition.',
  },
];

const TeamAnalyticsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-20" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Team Analytics
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                What Teams Absorb <span className="text-gradient">Before They Break</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
                SignalTrue reveals the hidden patterns that predict team strain, without invading
                privacy or tracking individuals.
              </p>
              <Link to="/contact" onClick={() => trackEvent('early_signal_preview_requested')}>
                <Button variant="hero" size="xl">
                  See These Signals Early
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Analytics Patterns Section */}
        <section className="py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto space-y-12">
              {analyticsPatterns.map((pattern, index) => (
                <div
                  key={index}
                  className="p-8 lg:p-10 rounded-2xl bg-card border border-border/50 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start gap-6">
                    <div className="p-4 rounded-2xl bg-primary/10 flex-shrink-0">
                      <pattern.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-display font-bold text-foreground mb-2">
                        {pattern.title}
                      </h3>
                      <p className="text-lg text-muted-foreground mb-6">{pattern.description}</p>

                      <div className="grid md:grid-cols-2 gap-8">
                        <div>
                          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                            What we observe
                          </p>
                          <ul className="space-y-2">
                            {pattern.whatWeObserve.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-muted-foreground">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                            Why it matters
                          </p>
                          <p className="text-muted-foreground">{pattern.whyItMatters}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How This Is Different */}
        <section className="py-20 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
                Patterns, Not Surveillance
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                SignalTrue explains patterns at the team and system level. We never surface
                individual names, read message content, or score productivity.
              </p>
              <div className="inline-flex items-center gap-4 p-4 rounded-xl bg-success/10 border border-success/20">
                <span className="text-success font-medium">
                  Privacy is enforced by architecture, not policy.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-30" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
                See These Signals Early
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Request a preview to see what team patterns look like in your organization.
              </p>
              <Link to="/contact" onClick={() => trackEvent('early_signal_preview_requested')}>
                <Button variant="hero" size="xl">
                  Request Early Signal Preview
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

export default TeamAnalyticsPage;
