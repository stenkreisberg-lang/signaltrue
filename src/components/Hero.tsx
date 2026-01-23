import { Button } from "../components/ui/button";
import { ArrowRight, Shield, Users, Lock, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import DriftAlertCard from "./DriftAlertCard";

/*
 * CATEGORY REPOSITIONING NOTE:
 * This is not a visual polish task.
 * This is a category repositioning.
 * If a section feels "empty", "safe", or "generic", it's wrong.
 * Optimize for clarity and conviction over minimalism.
 */

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
            {/* Trust badges - Updated for signal intelligence positioning */}
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Work Signal Intelligence</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Lock className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-medium text-muted-foreground">No message content access</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Shield className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-medium text-muted-foreground">System-level, not individual</span>
              </div>
            </div>

            {/* Main headline - New copy per spec */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
              You don't lose people first.
              <br />
              <span className="text-gradient">You lose signals.</span>
            </h1>

            {/* Subheadline - New copy per spec */}
            <p className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
              Most burnout, attrition, and execution breakdowns start silently.
              SignalTrue detects organizational drift early by reading how work actually happens.
            </p>

            {/* CTA buttons - Updated with outcome-focused language */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link to="/product">
                <Button variant="hero" size="xl">
                  See your organizational signals
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button variant="hero-outline" size="xl">
                  How it works
                </Button>
              </Link>
            </div>

            {/* Social proof - Updated messaging */}
            <div className="pt-8 border-t border-border/50">
              <p className="text-sm font-semibold text-foreground mb-2">
                An early-warning system for organizational drift.
              </p>
              <p className="text-sm text-muted-foreground">
                No surveys. No content analysis. No individual scoring.
              </p>
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
