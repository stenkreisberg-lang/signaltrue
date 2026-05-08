import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { Clock, Users, Zap, Moon, RefreshCw, UserCheck, ArrowRight, XCircle } from 'lucide-react';

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

// 6 Signal types per spec
const signals = [
  {
    icon: Clock,
    name: 'Focus Loss',
    whatItMeans: 'Teams are losing protected time for deep work, planning, and decision-making.',
    whyItMatters:
      'When focus time disappears, execution quality drops and people compensate through longer working hours.',
    whatLeadersCanChange:
      'Protect focus blocks. Reduce low-value meetings. Set clearer async communication expectations. Review manager meeting load.',
  },
  {
    icon: Users,
    name: 'Meeting Overload',
    whatItMeans: 'Calendar density increases beyond what teams can sustain.',
    whyItMatters:
      'Too many meetings reduce delivery capacity, increase context switching, and hide coordination problems.',
    whatLeadersCanChange:
      'Audit recurring meetings. Remove low-value syncs. Shorten default meeting length. Create meeting-free focus windows.',
  },
  {
    icon: Zap,
    name: 'Execution Drag',
    whatItMeans:
      'Work is moving slower because decisions, responses, and coordination take longer.',
    whyItMatters:
      'Execution drag quietly increases cost. Projects take longer, managers become bottlenecks, and teams need more effort to make the same progress.',
    whatLeadersCanChange:
      'Clarify decision ownership. Reduce approval loops. Review manager bottlenecks. Create clearer response expectations.',
  },
  {
    icon: Moon,
    name: 'After-Hours Creep',
    whatItMeans: 'Work is spreading into evenings and weekends.',
    whyItMatters:
      'After-hours work predicts recovery risk. If it continues, teams may compensate with exhaustion instead of sustainable capacity.',
    whatLeadersCanChange:
      'Review workload balance. Reduce unnecessary urgency. Protect recovery time. Adjust capacity plans.',
  },
  {
    icon: UserCheck,
    name: 'Manager Load',
    whatItMeans: 'Managers carry too much meeting, coordination, and communication pressure.',
    whyItMatters:
      'When managers are overloaded, decisions slow down and teams wait longer for clarity.',
    whatLeadersCanChange:
      'Reduce manager meeting load. Delegate decision rights. Clarify escalation paths. Protect manager focus time.',
  },
  {
    icon: RefreshCw,
    name: 'Repeated Pressure Patterns',
    whatItMeans: 'The same risk signals appear week after week.',
    whyItMatters:
      'One bad week may be normal. Repeated strain is a warning sign that the work system is becoming unsustainable.',
    whatLeadersCanChange:
      'Treat repeated signals as structural issues. Assign an owner. Set a corrective action. Review trend after two weeks.',
  },
];

// What this is NOT per spec
const whatThisIsNot = [
  'Not performance monitoring',
  'Not sentiment analysis',
  'Not productivity scoring',
  'Not individual tracking',
  'Not keylogging',
  'Not screen recording',
  'Not message analysis',
  'Not employee ranking',
];

const Product = () => {
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
                The Product
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                From invisible workload strain to{' '}
                <span className="text-gradient">visible risk signals</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                SignalTrue turns calendar, meeting, and communication metadata into early warning
                signals that leaders can act on before pressure becomes visible in performance,
                engagement, or attrition.
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

        {/* Signals Explained Section */}
        <section className="py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                The signals we detect
              </h2>
              <p className="text-muted-foreground">
                Each signal helps reveal whether work is becoming heavier, slower, or harder to
                sustain.
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-8">
              {signals.map((signal, index) => (
                <div
                  key={index}
                  className="p-8 rounded-2xl bg-card border border-border/50 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start gap-6">
                    <div className="p-4 rounded-2xl bg-primary/10 flex-shrink-0">
                      <signal.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-display font-bold text-foreground mb-4">
                        {signal.name}
                      </h3>
                      <div className="grid md:grid-cols-3 gap-6">
                        <div>
                          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                            What it means
                          </p>
                          <p className="text-muted-foreground">{signal.whatItMeans}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                            Why it matters
                          </p>
                          <p className="text-muted-foreground">{signal.whyItMatters}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                            What leaders can change
                          </p>
                          <p className="text-muted-foreground">{signal.whatLeadersCanChange}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What This Is NOT Section */}
        <section className="py-20 lg:py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  What this is not
                </h2>
                <p className="text-lg text-muted-foreground">
                  SignalTrue is designed to make surveillance impossible.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {whatThisIsNot.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-card border border-destructive/20 flex items-center gap-3"
                  >
                    <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    <span className="text-foreground font-medium">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-6 rounded-2xl bg-success/5 border border-success/20 text-center">
                <p className="text-lg text-foreground">
                  <strong>What we are:</strong> a team-level early warning layer that helps leaders
                  fix structural problems before people break.
                </p>
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
                See early signals in your organization
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Request a preview to see what workload risk could look like in your context.
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

export default Product;
