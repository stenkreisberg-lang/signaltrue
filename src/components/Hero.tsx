import { Button } from "../components/ui/button";
import { ArrowRight, Shield, Users, Lock } from "lucide-react";
import { Link } from "react-router-dom";
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
            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Team-level analytics</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Lock className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-medium text-muted-foreground">No message content access</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Shield className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-medium text-muted-foreground">GDPR-first</span>
              </div>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
              See which teams are drifting toward{" "}
              <span className="text-gradient">overload</span>
              <br />
              <span className="text-muted-foreground">before it becomes attrition.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
              SignalTrue turns collaboration and calendar patterns into team-level signals. 
              HR can spot meeting overload, after-hours creep, and coordination drag early, 
              then guide managers to intervene and track recovery.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4 mb-12">
              <Link to="/register">
                <Button variant="hero" size="xl">
                  Get a Demo
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button variant="hero-outline" size="xl">
                  See How It Works
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="pt-8 border-t border-border/50">
              <p className="text-sm font-semibold text-foreground mb-2">
                Designed for HR teams who need leading indicators, not another survey.
              </p>
              <p className="text-sm text-muted-foreground">
                Works best for organizations using Slack or Teams plus Google or Outlook calendars.
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
