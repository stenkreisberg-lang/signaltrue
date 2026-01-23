import { Button } from "../components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

/*
 * CATEGORY REPOSITIONING NOTE:
 * This is not a visual polish task.
 * Buttons must describe outcome, not action.
 * Remove: "Submit", "Get started", "Contact us"
 * Use: "See your organizational signals", "See how drift shows up", "View signal workflow"
 */

const benefits = [
  "No surveys required",
  "System-level signals only",
  "No message content access",
  "No individual scoring",
];

const CTASection = () => {
  return (
    <section className="py-20 lg:py-24 bg-hero-gradient relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-glow opacity-30" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="container mx-auto px-6 relative">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
            Detect organizational drift{" "}
            <span className="text-gradient">before it becomes expensive</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            See the signals that predict burnout, attrition, and execution breakdown—without surveillance or surveys.
          </p>

          {/* CTA buttons - Outcome-focused language */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
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

          {/* Benefits list */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm text-muted-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
