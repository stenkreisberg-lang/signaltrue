import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { 
  Clock, 
  Users, 
  Zap, 
  Moon,
  ArrowRight,
  XCircle,
} from "lucide-react";

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 * 
 * Product Page (per spec):
 * Purpose: Translate category into tangible capability.
 * 
 * Opening: From Invisible Strain to Visible Signals
 * 
 * Signals Explained:
 * - Focus Fragmentation
 * - Meeting Overload
 * - Execution Drag
 * - After-Hours Drift
 * 
 * What This Is NOT (explicit)
 */

// Analytics tracking
const trackEvent = (eventName: string) => {
  if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', eventName);
  }
  try {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    fetch(`${apiUrl}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, timestamp: new Date().toISOString() }),
    }).catch(() => { /* Silently fail for analytics */ });
  } catch { /* Silently fail for analytics */ }
};

// 4 Signal types per spec
const signals = [
  {
    icon: Clock,
    name: "Focus Fragmentation",
    whatItMeans: "Deep work time is being eroded by meetings, interruptions, and context switching.",
    whyItMatters: "Fragmented focus leads to lower quality output and increased stress, even when hours worked stay constant.",
    whatLeadersCanChange: "Protect focus blocks, consolidate meetings, reduce synchronous communication requirements.",
  },
  {
    icon: Users,
    name: "Meeting Overload",
    whatItMeans: "Calendar density exceeds sustainable thresholds for knowledge work.",
    whyItMatters: "Excessive meetings crowd out actual work, forcing it into evenings and weekends.",
    whatLeadersCanChange: "Audit recurring meetings, implement meeting-free days, reduce default meeting lengths.",
  },
  {
    icon: Zap,
    name: "Execution Drag",
    whatItMeans: "Work is taking longer despite effort levels remaining high.",
    whyItMatters: "Slowing execution often signals coordination problems, unclear priorities, or hidden blockers.",
    whatLeadersCanChange: "Clarify priorities, reduce approval layers, address coordination bottlenecks.",
  },
  {
    icon: Moon,
    name: "After-Hours Drift",
    whatItMeans: "Work is creeping into evenings and weekends at unsustainable rates.",
    whyItMatters: "After-hours work predicts burnout and attrition, often before people complain.",
    whatLeadersCanChange: "Redistribute workload, adjust expectations, address capacity gaps.",
  },
];

// What this is NOT per spec
const whatThisIsNot = [
  "Not performance monitoring",
  "Not sentiment analysis",
  "Not productivity scoring",
  "Not individual tracking",
  "Not keystroke logging",
  "Not screen recording",
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
                From Invisible Strain to{" "}
                <span className="text-gradient">Visible Signals</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                SignalTrue translates behavioral patterns into early warning signals that leaders can act on 
                before strain becomes visible in performance, engagement, or attrition.
              </p>
            </div>
          </div>
        </section>

        {/* Signals Explained Section */}
        <section className="py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                The Signals We Detect
              </h2>
              <p className="text-muted-foreground">
                Each signal type includes: what it means, why it matters, and what leaders can change structurally.
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
                          <p className="text-muted-foreground">
                            {signal.whatItMeans}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                            Why it matters
                          </p>
                          <p className="text-muted-foreground">
                            {signal.whyItMatters}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                            What leaders can change
                          </p>
                          <p className="text-muted-foreground">
                            {signal.whatLeadersCanChange}
                          </p>
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
                  What This Is <span className="text-destructive">NOT</span>
                </h2>
                <p className="text-lg text-muted-foreground">
                  SignalTrue is designed so that surveillance is architecturally impossible.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                  <strong>What we are:</strong> A system-level early warning layer that helps leaders 
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
                See Early Signals in Your Org
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Request a preview to see what these signals look like in your organization.
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
