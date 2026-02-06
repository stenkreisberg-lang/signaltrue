import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { CheckCircle, ArrowRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 * 
 * Pricing Page (per spec):
 * Purpose: Anchor price to risk avoided, not features.
 * 
 * Pricing Philosophy: Pricing reflects the cost of late detection.
 * One missed signal often costs more than a year of prevention.
 * 
 * Tiers (outcome-first, not feature-first):
 * - Visibility: Early system signals
 * - Prevention: Trend tracking + alerts
 * - Resilience: Executive summaries + intervention guidance
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

// Pricing tiers per spec - outcomes first
const tiers = [
  {
    name: "Visibility",
    outcome: "See early system signals",
    description: "Know when drift begins before it becomes a problem.",
    price: "€99",
    period: "/month",
    highlight: false,
    features: [
      "Weekly behavioral drift reports",
      "Team-level pattern detection",
      "Focus fragmentation signals",
      "Meeting overload indicators",
      "After-hours drift tracking",
    ],
  },
  {
    name: "Prevention",
    outcome: "Track trends and get alerts",
    description: "Catch emerging patterns and act before they escalate.",
    price: "€199",
    period: "/month",
    highlight: true,
    features: [
      "Everything in Visibility, plus:",
      "Trend tracking over time",
      "Automated drift alerts",
      "Baseline deviation notifications",
      "Monthly leadership summaries",
      "Industry benchmarks",
    ],
  },
  {
    name: "Resilience",
    outcome: "Guide interventions with executive insight",
    description: "Full organizational intelligence for sustainable execution.",
    price: "Custom",
    period: "",
    highlight: false,
    features: [
      "Everything in Prevention, plus:",
      "Executive quarterly summaries",
      "Intervention recommendations",
      "Outcome tracking on actions",
      "Custom signal models",
      "Dedicated success manager",
    ],
  },
];

const Pricing = () => {
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
                Pricing
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                Pricing Based on{" "}
                <span className="text-gradient">Risk Prevented</span>
              </h1>
              
              {/* Pricing Philosophy Block - per spec */}
              <div className="mt-8 p-6 rounded-2xl bg-background/50 border border-border/50 max-w-2xl mx-auto">
                <p className="text-lg text-foreground">
                  SignalTrue pricing reflects the <strong>cost of late detection</strong>.
                </p>
                <p className="text-muted-foreground mt-2">
                  One missed signal often costs more than a year of prevention.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards - Outcomes first, not features */}
        <section className="py-20 lg:py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {tiers.map((tier, index) => (
                <div 
                  key={index}
                  className={`relative rounded-2xl p-8 animate-slide-up ${
                    tier.highlight 
                      ? 'bg-card border-2 border-primary shadow-glow'
                      : 'bg-card border border-border/50'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {tier.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-2xl font-display font-bold text-foreground mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-lg text-primary font-medium mb-2">
                      {tier.outcome}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tier.description}
                    </p>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-display font-bold text-foreground">
                      {tier.price}
                    </span>
                    <span className="text-muted-foreground">{tier.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link 
                    to="/contact" 
                    onClick={() => trackEvent('early_signal_preview_requested')}
                  >
                    <Button 
                      variant={tier.highlight ? "cta" : "outline"}
                      className="w-full"
                      size="lg"
                    >
                      Request Early Signal Preview
                      {tier.highlight && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy note */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 mb-6">
                <Shield className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">All plans include privacy by architecture</span>
              </div>
              <p className="text-muted-foreground">
                No message content access. No individual scoring. Aggregated system-level patterns only.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-30" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
                The cost of late detection is always higher.
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                See what behavioral drift looks like in your organization before it becomes an outcome problem.
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

export default Pricing;
