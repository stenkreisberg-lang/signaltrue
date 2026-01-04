import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import DriftAlertCard from "../components/DriftAlertCard";
import { Button } from "../components/ui/button";
import { 
  Shield, 
  Zap, 
  BarChart3, 
  MessageSquareWarning, 
  CalendarClock,
  Users2,
  ArrowRight,
  CheckCircle,
  Eye,
  Lock,
  LineChart
} from "lucide-react";

const features = [
  {
    icon: MessageSquareWarning,
    title: "Meeting Load and Fragmentation",
    description: "See when meeting volume and back-to-back scheduling start squeezing execution time.",
  },
  {
    icon: CalendarClock,
    title: "After-hours Load",
    description: "Track late-night and weekend activity trends that often precede sustained burnout risk.",
  },
  {
    icon: Shield,
    title: "Focus Time Erosion",
    description: "Detect shrinking uninterrupted blocks during working hours before delivery slows down.",
  },
  {
    icon: Zap,
    title: "Response Drag",
    description: "Spot rising response times that signal overload or breakdowns in coordination.",
  },
  {
    icon: Users2,
    title: "Participation Drift",
    description: "Identify drops in team contribution patterns and uneven load distribution at team level.",
  },
  {
    icon: BarChart3,
    title: "Team Comparisons",
    description: "Prioritize support by showing which teams deviate most from their own baselines.",
  },
];

const capabilities = [
  {
    icon: Eye,
    title: "Visibility without surveillance",
    description: "See team health patterns without reading messages or tracking individuals.",
    features: ["Team-level signals only", "No message content access", "Minimum team-size thresholds", "Employee-friendly transparency"],
  },
  {
    icon: LineChart,
    title: "Baseline deviation detection and trend alerts",
    description: "SignalTrue flags meaningful shifts versus each team's baseline, then tracks trends over time.",
    features: ["Baselines per team", "Trend analysis and alerts", "Change detection vs baseline", "Seasonality-aware patterns"],
  },
  {
    icon: Lock,
    title: "Security and compliance foundations",
    description: "Designed for GDPR-first organizations with clear data handling and access controls.",
    features: ["Encryption in transit and at rest", "Role-based access", "Data retention and deletion controls", "SSO/SCIM available"],
  },
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
            <div className="max-w-3xl mx-auto text-center mb-12">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                The Product
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                Team Health Intelligence.{" "}
                <span className="text-gradient">Built for HR. Safe for employees.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                SignalTrue connects to your existing tools and surfaces team-level signals 
                of overload risk and collaboration breakdown, then guides action with a 
                diagnose-and-measure workflow.
              </p>
            </div>

            {/* Live Alert Preview */}
            <div className="max-w-xl mx-auto">
              <DriftAlertCard />
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Signals
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                What SignalTrue measures
              </h2>
              <p className="text-muted-foreground">
                Every signal is explainable. No black-box individual scoring. No message content access.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-card animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-display font-semibold mb-2 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                How it helps
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                Built for HR, trusted by employees
              </h2>
            </div>

            <div className="space-y-12">
              {capabilities.map((cap, index) => (
                <div 
                  key={index}
                  className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-16 items-center`}
                >
                  <div className="flex-1 space-y-6">
                    <div className="p-4 rounded-2xl bg-primary/10 w-fit">
                      <cap.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                      {cap.title}
                    </h3>
                    <p className="text-lg text-muted-foreground">
                      {cap.description}
                    </p>
                    <ul className="space-y-3">
                      {cap.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex-1 w-full">
                    <div className="aspect-video rounded-2xl bg-card border border-border/50 flex items-center justify-center">
                      <cap.icon className="w-24 h-24 text-secondary" />
                    </div>
                  </div>
                </div>
              ))}
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
                Book a demo and we'll walk you through signals, privacy model, and the action workflow.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="hero" size="xl">
                  Get a Demo
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

export default Product;
