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
    icon: UserCheck,
    name: 'Manager Load Signal',
    whatItMeans:
      'Managers are becoming overloaded by meetings, interruptions, decision requests, and shrinking focus time.',
    whyItMatters:
      'When managers overload, they become bottlenecks. Teams wait longer for decisions, coaching disappears, and strategic work gets pushed into evenings.',
    whatLeadersCanChange:
      'Reduce manager meeting load. Delegate decision rights. Clarify escalation paths. Protect at least two manager focus blocks per week.',
  },
  {
    icon: Users,
    name: 'Meeting Overload Signal',
    whatItMeans:
      'Meetings are taking too much time, creating too many handoffs, or crowding out real work.',
    whyItMatters:
      'People say they are busy all day but still cannot finish important work. Low-value meetings are the cost, not meetings themselves.',
    whatLeadersCanChange:
      'Audit recurring meetings. Cancel status-only calls. Shorten default meeting lengths. Require clear owners for decision meetings.',
  },
  {
    icon: Clock,
    name: 'Focus Fragmentation Signal',
    whatItMeans:
      'Uninterrupted work time is disappearing and people are constantly switching between tasks, meetings, and messages.',
    whyItMatters:
      'Work quality drops, delivery slows, and people feel they never get deep work done. People do not need only fewer hours — they need usable hours.',
    whatLeadersCanChange:
      'Create team-wide focus windows. Group meetings into fewer blocks. Move non-urgent updates to async channels. Reduce ad hoc meeting slots.',
  },
  {
    icon: Zap,
    name: 'Responsiveness Pressure Signal',
    whatItMeans:
      'Expected response speed keeps increasing and teams have fallen into constant reply mode.',
    whyItMatters:
      'When everything feels urgent, people stop prioritising. Constant response pressure creates stress, interrupts real work, and weakens async confidence.',
    whatLeadersCanChange:
      'Define response expectations by channel. Separate urgent from non-urgent work. Protect async decision rules. Reduce "just checking" follow-ups.',
  },
  {
    icon: Moon,
    name: 'Recovery Risk Signal',
    whatItMeans:
      'Recovery windows are shrinking and people are carrying work into evenings, weekends, or repeated high-pressure periods.',
    whyItMatters:
      'Short pressure spikes are normal. Sustained recovery loss is different. That is when people stop resetting and exhaustion compounds.',
    whatLeadersCanChange:
      'Identify why daytime work is blocked. Reduce meeting compression. Pause non-essential work. Review whether pressure is temporary or structural.',
  },
  {
    icon: RefreshCw,
    name: 'Execution Drag Signal',
    whatItMeans: 'Several signals are combining and the work system is starting to slow delivery.',
    whyItMatters:
      'Teams can look busy and still become slower. Execution drag shows when the system consumes energy faster than it creates progress.',
    whatLeadersCanChange:
      'Run a work-system review. Identify the top 3 friction points. Assign owners. Set a corrective action. Review improvement in 2 weeks.',
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
                Product
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                Early warning signals from the way{' '}
                <span className="text-gradient">work actually happens.</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                SignalTrue detects hidden work-system friction from meetings, focus time, response
                pressure, after-hours patterns, and manager load, without reading messages or
                tracking individual productivity.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
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
                  What SignalTrue does not do
                </h2>
                <p className="text-lg text-muted-foreground">
                  SignalTrue shows system pressure, not personal blame.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
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
                  SignalTrue shows system pressure, not personal blame. That difference matters.
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
                See the signals your current tools are hiding.
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Request a demo and see how SignalTrue detects manager overload, meeting friction,
                focus loss, and response pressure.
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
