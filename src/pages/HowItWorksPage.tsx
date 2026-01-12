import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { 
  Link2, 
  Brain, 
  Bell, 
  TrendingUp, 
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
  BarChart3
} from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Link2,
    title: "Connect your tools",
    description: "Connect Slack or Teams and your calendar using OAuth. SignalTrue never sees your passwords.",
    details: [
      "Fast OAuth setup",
      "Works with existing permissions",
      "Add more tools anytime",
    ],
  },
  {
    number: "02",
    icon: Brain,
    title: "Establish baselines",
    description: "SignalTrue builds a baseline for each team so alerts are based on change, not generic benchmarks.",
    details: [
      "Baselines per team",
      "Trend comparison over time",
      "Adjusts as patterns evolve",
    ],
  },
  {
    number: "03",
    icon: Bell,
    title: "Detect meaningful shifts",
    description: "Signals trigger when patterns deviate from baseline in a way that often precedes overload, disengagement, or coordination breakdown.",
    details: [
      "Weekly signals",
      "Severity-based alerts",
      "Clear 'what changed' summaries",
    ],
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Intervene and measure",
    description: "Choose an intervention, assign an owner, and track before/after changes to prove impact.",
    details: [
      "Intervention tracking",
      "Before/after comparisons",
      "Executive-ready summaries",
    ],
  },
];

const integrations = [
  { name: "Slack", description: "Team-level collaboration patterns" },
  { name: "Google Calendar", description: "Meeting load and focus-time signals" },
  { name: "Microsoft Teams", description: "Planned" },
  { name: "Outlook Calendar", description: "Planned" },
];

const HowItWorksPage = () => {
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
                How it works
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                From setup to useful signals in{" "}
                <span className="text-gradient">7 days</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Connect your tools, establish team baselines, detect shifts, and measure whether interventions work.
              </p>
            </div>
          </div>
        </section>

        {/* Timeline Section */}
        <section className="py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              {steps.map((step, index) => (
                <div 
                  key={index}
                  className="relative flex gap-8 pb-16 last:pb-0 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Timeline line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-8 top-20 bottom-0 w-px bg-gradient-to-b from-primary/50 to-border" />
                  )}

                  {/* Step number */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <span className="text-xl font-display font-bold text-primary">{step.number}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-2">
                    <div className="flex items-center gap-3 mb-3">
                      <step.icon className="w-6 h-6 text-primary" />
                      <h3 className="text-2xl font-display font-bold text-foreground">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-lg text-muted-foreground mb-6">
                      {step.description}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {step.details.map((detail, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                          <span className="text-sm text-foreground">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Integrations
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                Works with tools you already use
              </h2>
              <p className="text-muted-foreground">
                Simple OAuth connections. No API keys required.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {integrations.map((integration, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-2xl bg-card border border-border/50 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <Link2 className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-1">
                    {integration.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                  Built on trust
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  Privacy is non-negotiable
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    Team-level only
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Signals are aggregated at team level with minimum thresholds.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    No message content access
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We analyze patterns and metadata only, never message content.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    Transparent rollout
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We provide employee-facing explanations so HR can launch with clarity and trust.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-30" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
                See the workflow in a real demo
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                We'll show you the signals, privacy model, and how interventions are tracked.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register">
                  <Button variant="hero" size="xl">
                    Get a Demo
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="hero-outline" size="xl">
                    View Pricing
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
};

export default HowItWorksPage;
