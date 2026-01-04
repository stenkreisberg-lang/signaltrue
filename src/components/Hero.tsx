import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Users, Lock } from "lucide-react";
import DriftAlertCard from "./DriftAlertCard";

const Hero = () => {
  return (
    <section className="relative min-h-screen bg-hero-gradient overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-glow opacity-50" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-glow opacity-30" />
      
      <div className="container mx-auto px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left content */}
          <div className="animate-slide-up">
            {/* Trust badges - Moved UP as recommended */}
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Lock className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-medium text-muted-foreground">Privacy-first</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Team-level signals</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Shield className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-medium text-muted-foreground">GDPR Compliant</span>
              </div>
            </div>

            {/* Main headline - HR-friendly language */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
              Know which teams are heading toward{" "}
              <span className="text-gradient">burnout</span>
              <br />
              <span className="text-muted-foreground">before they quit.</span>
            </h1>

            {/* Subheadline - Clear value proposition */}
            <p className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
              SignalTrue detects early warning signs from Slack and calendars — 
              giving HR leaders the insights to prevent turnover and protect team performance.
            </p>

            {/* CTA buttons - Clear hierarchy */}
            <div className="flex flex-wrap gap-4 mb-12">
              <Button variant="hero" size="xl">
                Book a Demo
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="hero-outline" size="xl">
                Watch 2-min Overview
              </Button>
            </div>

            {/* Social proof - Companies */}
            <div className="pt-8 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
                Trusted by HR teams at
              </p>
              <div className="flex flex-wrap items-center gap-8 opacity-60">
                {["Stripe", "Notion", "Linear", "Vercel", "Figma"].map((company) => (
                  <span key={company} className="text-lg font-display font-semibold text-foreground/70">
                    {company}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right content - Alert card */}
          <div className="relative animate-slide-in-right" style={{ animationDelay: "0.2s" }}>
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl blur-2xl" />
            <DriftAlertCard />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
