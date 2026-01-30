import { Button } from "../components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

/*
 * CATEGORY KING POSITIONING:
 * Decision-oriented CTAs. No vanity language.
 */

const benefits = [
  "No surveys required",
  "Causal explanation, not correlation",
  "No message content access",
  "Measured intervention impact",
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
            Detect drift early.{" "}
            <span className="text-gradient">Prove what works.</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Stop relying on lagging surveys. Get behavioral evidence and clear intervention paths, with measured impact.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link to="/how-it-works">
              <Button variant="hero" size="xl">
                See how drift is detected
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="hero-outline" size="xl">
                Talk to us
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
