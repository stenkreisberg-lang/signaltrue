import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { 
  ArrowRight,
  Activity,
  Shield,
  Eye,
} from "lucide-react";

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 * 
 * About Page (per spec):
 * Purpose: Credibility + philosophical alignment.
 * 
 * Opening: Why SignalTrue Exists
 * Copy: Burnout is not a motivation problem. It's a system problem that goes unseen for too long.
 * 
 * Belief System:
 * - Signals beat surveys
 * - Systems shape behavior
 * - Early truth enables better leadership
 * 
 * Founding Insight: Explain why existing tools fail leaders.
 * No bios first. Belief first.
 */

// Analytics tracking
const trackEvent = (eventName: string) => {
  if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', eventName);
  }
};

// Belief system per spec
const beliefs = [
  {
    icon: Activity,
    title: "Signals beat surveys",
    description: "Behavioral patterns reveal truth faster and earlier than self-reported opinions. By the time surveys show a problem, the damage is done.",
  },
  {
    icon: Eye,
    title: "Systems shape behavior",
    description: "People respond to structural conditions. Fix the system, and behavior follows. Motivational talks don't fix overload.",
  },
  {
    icon: Shield,
    title: "Early truth enables better leadership",
    description: "Leaders who see strain early can act structurally. Leaders who see it late can only react to consequences.",
  },
];

const About = () => {
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
                Why SignalTrue Exists
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                Burnout is not a motivation problem.{" "}
                <span className="text-gradient">It's a system problem.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                One that goes unseen for too long because the tools we rely on only show us outcomes, not causes.
              </p>
            </div>
          </div>
        </section>

        {/* Founding Insight Section */}
        <section className="py-20 lg:py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                The founding insight
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-8">
                Why existing tools fail leaders
              </h2>
              <div className="space-y-6 text-lg text-muted-foreground">
                <p>
                  Engagement surveys tell you how people felt last quarter. Exit interviews tell you why someone left. 
                  Performance reviews tell you who's struggling after the struggle has become visible.
                </p>
                <p>
                  All of these tools describe damage <em>after</em> it happens. By the time leaders see the signal, 
                  the structural conditions that caused it have been in place for months.
                </p>
                <p className="text-foreground font-medium border-l-4 border-primary pl-6">
                  SignalTrue was built to detect behavioral drift early, so leaders can fix systems 
                  before they break people.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Belief System Section */}
        <section className="py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                What we believe
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold">
                Our Belief System
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {beliefs.map((belief, index) => (
                <div 
                  key={index}
                  className="p-8 rounded-2xl bg-card border border-border/50 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 mb-6 flex items-center justify-center">
                    <belief.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-4">
                    {belief.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {belief.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-30" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
                See early signals in your organization
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Request a preview to understand what behavioral drift looks like in your context.
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

export default About;
