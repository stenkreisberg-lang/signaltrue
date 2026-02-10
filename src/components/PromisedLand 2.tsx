import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 *
 * Promised Land Section (per spec):
 * Title: What Changes When You See Drift Early
 *
 * Bullets:
 * - Fewer surprise exits
 * - Earlier leadership decisions
 * - Structural fixes instead of motivational talks
 * - Sustainable execution under pressure
 */

const promisedLandBenefits = [
  {
    title: 'Fewer surprise exits',
    description: 'See attrition risk before resignations appear on your desk.',
  },
  {
    title: 'Earlier leadership decisions',
    description: 'Act when systems show strain, not when people break.',
  },
  {
    title: 'Structural fixes instead of motivational talks',
    description: 'Address root causes in workflows, not symptoms in individuals.',
  },
  {
    title: 'Sustainable execution under pressure',
    description: 'Maintain performance without burning out your best people.',
  },
];

const PromisedLand = () => {
  return (
    <section id="promised-land" className="py-16 lg:py-20 bg-secondary/20">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 mb-6">
              <Sparkles className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">The Promised Land</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold">
              What Changes When You
              <br />
              <span className="text-gradient">See Drift Early</span>
            </h2>
          </div>

          {/* Benefits grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {promisedLandBenefits.map((benefit, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-card border border-border/50 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-success/10 flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-12 text-center">
            <p className="text-xl text-foreground font-medium">
              Leaders see early truth, act structurally, and preserve execution capacity
              <span className="text-primary"> before human cost appears.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromisedLand;
