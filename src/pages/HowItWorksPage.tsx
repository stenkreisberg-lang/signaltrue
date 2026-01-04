import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
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
    title: "Connect Your Tools",
    description: "Securely connect Slack and Google Calendar. SignalTrue uses OAuth — we never see your passwords.",
    details: [
      "5-minute setup with OAuth",
      "No IT involvement needed",
      "Works with existing permissions",
      "Add more tools anytime",
    ],
  },
  {
    number: "02",
    icon: Brain,
    title: "AI Learns Your Baselines",
    description: "Our AI analyzes 2-4 weeks of team patterns to understand what 'healthy' looks like for your unique organization.",
    details: [
      "Custom baselines per team",
      "No generic benchmarks",
      "Adapts to your culture",
      "Learns seasonal patterns",
    ],
  },
  {
    number: "03",
    icon: Bell,
    title: "Get Proactive Alerts",
    description: "Receive actionable alerts when patterns shift. Know which teams need support before problems escalate.",
    details: [
      "Email + Slack alerts",
      "Severity-based routing",
      "Actionable recommendations",
      "Snooze or escalate options",
    ],
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Track & Improve",
    description: "Monitor how your interventions impact team health over time. Build data-driven people strategies.",
    details: [
      "Before/after comparisons",
      "Intervention tracking",
      "ROI reporting",
      "Executive dashboards",
    ],
  },
];

const integrations = [
  { name: "Slack", description: "Communication patterns & response times" },
  { name: "Google Calendar", description: "Meeting load & focus time" },
  { name: "Microsoft Teams", description: "Coming soon" },
  { name: "Outlook Calendar", description: "Coming soon" },
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
                How It Works
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                From setup to insight in{" "}
                <span className="text-gradient">under a week</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                No complex implementation. No training required. Just connect your tools 
                and start getting insights.
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
                Simple OAuth connections. No API keys or IT support needed.
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
                  Built on Trust
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
                    No Individual Tracking
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We never identify individual employees. All signals are aggregated at the team level.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    No Message Reading
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We analyze patterns and metadata only. We never read the content of any messages.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    Transparent to Employees
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Employees can see exactly what data is collected. We encourage transparency announcements.
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
                See SignalTrue in action
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Book a personalized demo and we'll show you exactly how it works with your tools.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="hero" size="xl">
                  Book a Demo
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button variant="hero-outline" size="xl">
                  View Pricing
                </Button>
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
