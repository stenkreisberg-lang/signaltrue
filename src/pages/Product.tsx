import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DriftAlertCard from "@/components/DriftAlertCard";
import { Button } from "@/components/ui/button";
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
    title: "Communication Health",
    description: "Detect fragmentation, urgency spikes, and coordination bottlenecks across team channels.",
  },
  {
    icon: CalendarClock,
    title: "Workload Patterns",
    description: "Track meeting density, after-hours work, and focus time erosion automatically.",
  },
  {
    icon: BarChart3,
    title: "Team Comparisons",
    description: "Benchmark teams against healthy baselines and identify which need intervention first.",
  },
  {
    icon: Zap,
    title: "Early Warning System",
    description: "Get alerts 2-4 weeks before burnout symptoms become visible to managers.",
  },
  {
    icon: Shield,
    title: "Privacy by Design",
    description: "No individual tracking. No message content reading. Only anonymized team-level signals.",
  },
  {
    icon: Users2,
    title: "Works for Any Team",
    description: "Flat teams, hierarchies, remote or hybrid — SignalTrue adapts to your structure.",
  },
];

const capabilities = [
  {
    icon: Eye,
    title: "Visibility Without Surveillance",
    description: "See team health patterns without reading messages or tracking individuals. Privacy-first design that employees can trust.",
    features: ["Team-level signals only", "No message content access", "Anonymized data aggregation", "Employee-friendly transparency"],
  },
  {
    icon: LineChart,
    title: "Predictive Analytics",
    description: "Our AI learns what healthy looks like for your organization and flags deviations before they become problems.",
    features: ["Custom baselines per team", "Trend analysis over time", "Risk scoring algorithms", "Seasonal pattern recognition"],
  },
  {
    icon: Lock,
    title: "Enterprise-Grade Security",
    description: "SOC 2 Type II certified with GDPR compliance. Your data stays secure and under your control.",
    features: ["SOC 2 Type II certified", "GDPR compliant", "Data residency options", "SSO integration"],
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
                Team health insights that{" "}
                <span className="text-gradient">HR can trust</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                SignalTrue connects to your existing tools and surfaces early warning signs 
                of burnout, disengagement, and team dysfunction.
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
                What SignalTrue Detects
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                Early warning signs that matter to HR
              </h2>
              <p className="text-muted-foreground">
                We translate complex behavioral data into actionable insights you can act on today.
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
                Capabilities
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
                Ready to see SignalTrue in action?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Book a personalized demo and see how we can help protect your teams.
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

export default Product;
