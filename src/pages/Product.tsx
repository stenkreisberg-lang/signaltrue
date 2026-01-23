import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import DriftAlertCard from "../components/DriftAlertCard";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { 
  Shield, 
  Zap, 
  BarChart3, 
  AlertTriangle, 
  Clock,
  Users2,
  ArrowRight,
  CheckCircle,
  Eye,
  Lock,
  LineChart,
  XCircle
} from "lucide-react";

/*
 * CATEGORY REPOSITIONING NOTE:
 * This is not a visual polish task.
 * This is a category repositioning.
 * If a section feels "empty", "safe", or "generic", it's wrong.
 * Optimize for clarity and conviction over minimalism.
 */

// Grouped signals into system categories per spec
const signalCategories = [
  {
    category: "Coordination Strain",
    signals: [
      {
        icon: Clock,
        title: "Meeting overload",
        description: "When meeting volume and back-to-back scheduling squeeze execution time.",
      },
      {
        icon: Users2,
        title: "Participation imbalance",
        description: "When coordination burden concentrates on specific team members.",
      },
    ],
  },
  {
    category: "Execution Friction",
    signals: [
      {
        icon: Zap,
        title: "Response pressure",
        description: "Rising response expectations that signal unsustainable pace.",
      },
      {
        icon: BarChart3,
        title: "Velocity drag",
        description: "Slowing delivery despite stable or increasing effort.",
      },
    ],
  },
  {
    category: "Recovery Erosion",
    signals: [
      {
        icon: AlertTriangle,
        title: "After-hours drift",
        description: "Expanding work patterns that erode recovery time.",
      },
      {
        icon: Shield,
        title: "Focus time loss",
        description: "Shrinking uninterrupted blocks during working hours.",
      },
    ],
  },
];

const capabilities = [
  {
    icon: Eye,
    title: "Signals without surveillance",
    description: "See system-level patterns without reading messages or tracking individuals.",
    features: ["Aggregated team signals only", "No message content access", "Minimum team-size thresholds", "Employee-friendly transparency"],
  },
  {
    icon: LineChart,
    title: "Baseline deviation and trend detection",
    description: "SignalTrue flags meaningful shifts versus each team's baseline, then tracks trends over time.",
    features: ["Baselines per team", "Trend analysis and alerts", "Change detection vs baseline", "Seasonality-aware patterns"],
  },
  {
    icon: Lock,
    title: "Privacy-first architecture",
    description: "Designed for GDPR-first organizations with clear data handling and access controls.",
    features: ["Encryption in transit and at rest", "Role-based access", "Data retention and deletion controls", "SSO/SCIM available"],
  },
];

// Privacy "We do NOT" list per spec
const privacyPromises = [
  "Read messages or communications content",
  "Analyze sentiment or language",
  "Score individuals or create individual profiles",
  "Track location or device activity",
  "Share data with third parties",
];

const Product = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section - Updated per spec */}
        <section className="py-20 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-20" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                The Product
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                Work Signal Intelligence.{" "}
                <span className="text-gradient">System-level insight, not surveillance.</span>
              </h1>
              
              {/* Definition Block per spec */}
              <div className="max-w-2xl mx-auto mt-8 p-6 rounded-2xl bg-background/50 border border-border/50">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">What SignalTrue is</h3>
                  <p className="text-foreground">
                    An early-warning system that detects organizational drift by analyzing behavioral work patterns.
                  </p>
                </div>
                <div className="pt-4 border-t border-border/50">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">What SignalTrue is not</h3>
                  <div className="flex flex-wrap justify-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">Not surveys</span>
                    <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">Not surveillance</span>
                    <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">Not individual scoring</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Alert Preview - mid-page framed per spec */}
            <div className="max-w-xl mx-auto mt-12">
              <p className="text-center text-sm text-muted-foreground mb-4">
                <span className="text-primary font-medium">Live signal example:</span> Trend-based, aggregated, non-individual
              </p>
              <DriftAlertCard />
            </div>
          </div>
        </section>

        {/* Signals Grid - Grouped by system categories per spec */}
        <section className="py-20 lg:py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Signals
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                What SignalTrue measures
              </h2>
              <p className="text-muted-foreground">
                Signals are grouped by system-level categories. No tool-specific bias. No individual metrics.
              </p>
            </div>

            <div className="space-y-12 max-w-5xl mx-auto">
              {signalCategories.map((category, catIndex) => (
                <div key={catIndex}>
                  <h3 className="text-xl font-display font-semibold text-primary mb-6 text-center">
                    {category.category}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    {category.signals.map((signal, sigIndex) => (
                      <div 
                        key={sigIndex}
                        className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-card animate-slide-up"
                        style={{ animationDelay: `${(catIndex * 2 + sigIndex) * 0.05}s` }}
                      >
                        <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                          <signal.icon className="w-6 h-6 text-primary" />
                        </div>
                        <h4 className="text-lg font-display font-semibold mb-2 text-foreground">
                          {signal.title}
                        </h4>
                        <p className="text-muted-foreground leading-relaxed">
                          {signal.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy Section - "Signals without surveillance" per spec */}
        <section className="py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                  Privacy
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  Signals without surveillance
                </h2>
              </div>

              {/* Explicit "We do NOT" list per spec */}
              <div className="p-8 rounded-2xl bg-secondary/30 border border-border/50 mb-12">
                <h3 className="text-lg font-display font-semibold text-foreground mb-6 text-center">
                  We do NOT:
                </h3>
                <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {privacyPromises.map((promise, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                      <span className="text-foreground">{promise}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Capabilities */}
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
          </div>
        </section>

        {/* CTA Section - Updated with outcome-focused language per spec */}
        <section className="py-20 lg:py-24 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-30" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
                See how drift shows up in your organization
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                We'll walk you through signals, privacy architecture, and the intervention workflow.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/how-it-works">
                  <Button variant="hero" size="xl">
                    View signal workflow
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

export default Product;
