import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff,
  CheckCircle,
  XCircle,
  ArrowRight,
  Users,
  Database,
  FileText
} from "lucide-react";

/*
 * CATEGORY KING POSITIONING:
 * Privacy is enforced, not promised.
 * This page must demonstrate architectural privacy, not marketing claims.
 */

// What we use
const whatWeUse = [
  {
    icon: Database,
    title: "Calendar metadata",
    description: "Meeting times, durations, and participant counts. Never meeting content or notes.",
  },
  {
    icon: FileText,
    title: "Communication timing patterns",
    description: "When messages are sent, response intervals, channel activity levels. Never message content.",
  },
  {
    icon: Users,
    title: "Aggregated behavioral signals",
    description: "Team-level patterns only. Individual data is never exposed to managers.",
  },
];

// What we NEVER use
const whatWeNeverUse = [
  "Message content (Slack, email, chat)",
  "Email body text or subject lines",
  "Document content or file contents",
  "Emotional analysis or sentiment",
  "Individual performance scores visible to managers",
  "Location or device tracking",
  "Keystroke or screen monitoring",
  "Video or audio recording analysis",
];

// Employee transparency features
const employeeTransparency = [
  {
    title: "See what data is used",
    description: "Employees can view exactly which data sources contribute to team-level insights.",
  },
  {
    title: "See what is NOT used",
    description: "Clear documentation of data we explicitly do not collect or analyze.",
  },
  {
    title: "Understand the outputs",
    description: "Employees can see what insights are generated and how they're used at team level.",
  },
  {
    title: "Optional participation",
    description: "Organizations can configure employee opt-out for non-aggregate analysis.",
  },
];

const Trust = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-20" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 mb-6">
                <Shield className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">Privacy by architecture</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                Privacy is enforced,{" "}
                <span className="text-gradient">not promised.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                SignalTrue analyzes behavioral metadata, not message content. 
                No emotion inference. No individual scoring for managers. 
                Privacy is enforced at the architecture level.
              </p>
            </div>
          </div>
        </section>

        {/* What We Use Section */}
        <section className="py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                  What we use
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  Behavioral metadata only
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  We analyze patterns and timing, never content.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {whatWeUse.map((item, index) => (
                  <div 
                    key={index}
                    className="p-6 rounded-2xl bg-card border border-border/50"
                  >
                    <div className="p-3 rounded-xl bg-success/10 w-fit mb-4">
                      <item.icon className="w-6 h-6 text-success" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What We NEVER Use Section */}
        <section className="py-20 lg:py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20 mb-6">
                  <EyeOff className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Hard limits</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  What we never access
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  These are architectural constraints, not policy promises. 
                  The system cannot access this data.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-card border border-border/50">
                <div className="grid sm:grid-cols-2 gap-4">
                  {whatWeNeverUse.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Employee Transparency Section */}
        <section className="py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                  Employee transparency
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  Employees can see what we see
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Transparency builds trust. Employees can view exactly how their data contributes to team-level insights.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {employeeTransparency.map((item, index) => (
                  <div 
                    key={index}
                    className="p-6 rounded-2xl bg-card border border-border/50"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <h3 className="font-display font-semibold text-foreground">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground pl-8">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section className="py-20 lg:py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                  Technical architecture
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                  Privacy enforced at every layer
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-card border border-border/50 text-center">
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mx-auto mb-4">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Encryption</h3>
                  <p className="text-sm text-muted-foreground">
                    All data encrypted in transit (TLS 1.3) and at rest (AES-256).
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-card border border-border/50 text-center">
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mx-auto mb-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Aggregation thresholds</h3>
                  <p className="text-sm text-muted-foreground">
                    Minimum team sizes enforced. No individual-level signals exposed.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-card border border-border/50 text-center">
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mx-auto mb-4">
                    <Eye className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Role-based access</h3>
                  <p className="text-sm text-muted-foreground">
                    Hard permission boundaries between team, org, and HR access levels.
                  </p>
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
                Questions about privacy or compliance?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                We're happy to walk you through our architecture and answer any GDPR, SOC 2, or compliance questions.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/contact">
                  <Button variant="hero" size="xl">
                    Talk to us
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/how-it-works">
                  <Button variant="hero-outline" size="xl">
                    See how it works
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

export default Trust;
