import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { 
  ArrowRight,
  Activity,
  Shield,
  Zap,
  Mail
} from "lucide-react";

/*
 * CATEGORY REPOSITIONING NOTE:
 * This is not a visual polish task.
 * This is a category repositioning.
 * Replace generic mission copy with conviction.
 * No HR buzzwords.
 */

// 3 beliefs only per spec - no HR buzzwords
const beliefs = [
  {
    icon: Activity,
    title: "Signals beat opinions",
    description: "Behavioral patterns predict organizational strain earlier and more reliably than surveys or intuition.",
  },
  {
    icon: Shield,
    title: "Trust enables insight",
    description: "Privacy-first architecture earns the trust that makes meaningful organizational visibility possible.",
  },
  {
    icon: Zap,
    title: "Early action beats recovery",
    description: "Detecting drift early costs less and preserves more than managing the consequences of breakdown.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section - Updated per spec */}
        <section className="py-20 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-20" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                About
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                We build early-warning systems for{" "}
                <span className="text-gradient">modern work</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                SignalTrue detects organizational drift by reading behavioral work patterns—without surveillance, 
                surveys, or individual scoring.
              </p>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-20 lg:py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Why we built SignalTrue
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-8">
                Organizations go blind before they break down
              </h2>
              <div className="space-y-6 text-lg text-muted-foreground">
                <p>
                  Burnout, attrition, and execution breakdowns don't happen suddenly. 
                  They emerge from patterns that were visible long before anyone spoke up—
                  coordination overload, response pressure, recovery erosion.
                </p>
                <p>
                  The signals are there. In meeting loads. In after-hours patterns. In how work 
                  actually flows versus how everyone assumes it flows.
                </p>
                <p className="text-foreground font-medium">
                  SignalTrue was built to detect those signals at system level, before they become 
                  expensive crises.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section - 3 beliefs only per spec */}
        <section className="py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Our principles
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold">
                What we believe
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {beliefs.map((belief, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-2xl bg-card border border-border/50 text-center animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <belief.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    {belief.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {belief.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section - Updated with outcome-focused language */}
        <section id="contact" className="py-20 lg:py-24 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-30" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
                See how drift shows up in your organization
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                We'll walk you through signals, privacy architecture, and the intervention workflow.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Link to="/product">
                  <Button variant="hero" size="xl">
                    See your organizational signals
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/how-it-works">
                  <Button variant="hero-outline" size="xl">
                    View signal workflow
                  </Button>
                </Link>
              </div>
              <div className="pt-8 border-t border-border/50 mt-8">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Mail className="w-5 h-5" />
                  <a href="mailto:hello@signaltrue.ai" className="text-lg hover:text-foreground transition-colors">
                    hello@signaltrue.ai
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Terms Section */}
        <section id="terms" className="py-16 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-display font-bold mb-6">Terms of Service</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  By using SignalTrue, you agree to our terms of service. We provide system-level signal intelligence
                  to help organizations detect early warning signs of organizational drift.
                </p>
                <p>
                  For complete terms and legal documentation, please contact us at{" "}
                  <a href="mailto:legal@signaltrue.ai" className="text-primary hover:underline">
                    legal@signaltrue.ai
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
