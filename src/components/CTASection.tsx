import { Button } from "../components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";

const benefits = [
  "Setup in minutes",
  "Team-level signals only",
  "No message content access",
  "GDPR-first approach",
];

const CTASection = () => {
  return (
    <section className="py-24 bg-hero-gradient relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-glow opacity-30" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="container mx-auto px-6 relative">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
            Protect performance without{" "}
            <span className="text-gradient">breaking trust</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Get team-level early warnings, guide practical interventions, 
            and show outcomes leadership can understand.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Button variant="hero" size="xl">
              Get a Demo
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="hero-outline" size="xl">
              View Product
            </Button>
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
