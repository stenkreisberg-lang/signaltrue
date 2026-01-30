import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import DriftAlertCard from "../components/DriftAlertCard";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { 
  Zap, 
  BarChart3, 
  ArrowRight,
  CheckCircle,
  XCircle,
  Target,
  TrendingUp
} from "lucide-react";

/*
 * CATEGORY KING POSITIONING:
 * A causal drift engine for modern teams.
 * Not monitoring. Not surveys. Causal drift management.
 */

// Core product sections per spec
const productSections = [
  {
    id: "baselines",
    icon: BarChart3,
    title: "Drift starts as deviation, not disaster.",
    description: "Every team has its own rhythm. SignalTrue learns normal work patterns and detects meaningful changes—not noise. This allows early intervention before overload, disengagement, or burnout become visible symptoms.",
    features: [
      "Adaptive baselines per team",
      "Seasonality-aware patterns",
      "Role-aware calibration",
      "Sustained deviation detection",
    ],
  },
  {
    id: "causal",
    icon: Target,
    title: "Knowing why matters more than knowing what.",
    description: "Most tools show correlations. SignalTrue estimates likely causes. We identify which behaviors and structural patterns are driving drift—so leaders can act with confidence instead of guesswork.",
    features: [
      "Driver attribution for each drift event",
      "Causal pattern recognition",
      "Ranked contributing factors",
      "Confidence scoring on explanations",
    ],
  },
  {
    id: "interventions",
    icon: Zap,
    title: "Clear actions, not vague advice.",
    description: "For every drift pattern, SignalTrue recommends concrete interventions: what to change, why it matters, what signal should improve, and how long it typically takes. Managers get a plan, not a dashboard.",
    features: [
      "Specific action recommendations",
      "Expected effect per intervention",
      "Feasibility and effort estimates",
      "Manager-ready language",
    ],
  },
  {
    id: "measurement",
    icon: TrendingUp,
    title: "Prove what worked.",
    description: "SignalTrue tracks whether interventions actually changed behavior. This creates a learning loop where decisions improve over time—and leadership actions are backed by evidence, not hope.",
    features: [
      "Before/after outcome tracking",
      "Effect size measurement",
      "Confidence intervals on results",
      "Continuous learning from outcomes",
    ],
  },
];

// Privacy "We do NOT" list per spec
const privacyPromises = [
  "Read messages or communications content",
  "Analyze sentiment or emotion",
  "Score individuals or create individual profiles",
  "Track location or device activity",
  "Share data with third parties",
];

const Product = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section - Category King positioning */}
        <section className="py-20 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-20" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                The Product
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                A causal drift engine{" "}
                <span className="text-gradient">for modern teams.</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                SignalTrue is not a monitoring tool and not a survey replacement. 
                It is a system for detecting behavioral drift, understanding its causes, 
                and correcting it with measured interventions.
              </p>

              {/* What SignalTrue is NOT */}
              <div className="flex flex-wrap justify-center gap-3">
                <span className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium">Not surveys</span>
                <span className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium">Not surveillance</span>
                <span className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium">Not engagement theater</span>
              </div>
            </div>

            {/* Live Alert Preview */}
            <div className="max-w-xl mx-auto mt-12">
              <p className="text-center text-sm text-muted-foreground mb-4">
                <span className="text-primary font-medium">Example drift alert:</span> Causal, actionable, measurable
              </p>
              <DriftAlertCard />
            </div>
          </div>
        </section>

        {/* Core Product Sections */}
        <section className="py-20 lg:py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto space-y-24">
              {productSections.map((section, index) => (
                <div 
                  key={section.id}
                  className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-16 items-center`}
                >
                  <div className="flex-1 space-y-6">
                    <div className="p-4 rounded-2xl bg-primary/10 w-fit">
                      <section.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                      {section.title}
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {section.description}
                    </p>
                    <ul className="space-y-3">
                      {section.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex-1 w-full">
                    <div className="aspect-video rounded-2xl bg-card border border-border/50 flex items-center justify-center">
                      <section.icon className="w-24 h-24 text-secondary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                  Privacy
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  Privacy is enforced, not promised.
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  SignalTrue analyzes behavioral metadata, not message content. 
                  Privacy is enforced at the architecture level.
                </p>
              </div>

              {/* Explicit "We do NOT" list */}
              <div className="p-8 rounded-2xl bg-secondary/30 border border-border/50">
                <h3 className="text-lg font-display font-semibold text-foreground mb-6 text-center">
                  We never:
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
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-30" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
                See how drift is detected in your organization
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                We'll walk you through causal drift detection, intervention recommendations, and outcome measurement.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/how-it-works">
                  <Button variant="hero" size="xl">
                    See how it works
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="hero-outline" size="xl">
                    Talk to us
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
