import { ArrowRight, Layers, XCircle } from "lucide-react";

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 * 
 * "The Enemy" section - per spec:
 * Enemy = Lagging people analytics:
 * - Engagement surveys
 * - Performance reviews
 * - Exit interviews
 * - Wellbeing scores
 * 
 * These tools describe damage after it happens.
 */

const laggingIndicators = [
  { name: "Engagement surveys", problem: "Measure opinion, not behavior" },
  { name: "Performance reviews", problem: "Annual snapshots, not real-time signals" },
  { name: "Exit interviews", problem: "Post-mortem, not prevention" },
  { name: "Wellbeing scores", problem: "Self-reported, easily gamed" },
];

const WhyOrganizationsGoBlind = () => {
  return (
    <section id="the-problem" className="py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section headline - per spec */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-center mb-6">
            The Problem With How Teams
            <br />
            <span className="text-gradient">Are Measured Today</span>
          </h2>

          {/* Enemy explanation - per spec */}
          <div className="max-w-3xl mx-auto text-center mb-12 lg:mb-16 space-y-6">
            <p className="text-xl text-muted-foreground">
              Leaders rely on tools that only show outcomes. Burnout becomes visible only after it's costly.
            </p>
            <p className="text-xl text-muted-foreground">
              <strong className="text-foreground">Pressure accumulates quietly in systems, not surveys.</strong>
            </p>
          </div>

          {/* Enemy Tools Grid */}
          <div className="grid sm:grid-cols-2 gap-4 lg:gap-6 mb-12 max-w-4xl mx-auto">
            {laggingIndicators.map((item, index) => (
              <div 
                key={index}
                className="p-6 rounded-2xl bg-secondary/30 border border-border/50"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <XCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground mb-1">
                      {item.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.problem}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary statement */}
          <div className="max-w-3xl mx-auto text-center p-6 lg:p-8 rounded-2xl bg-destructive/5 border border-destructive/20">
            <p className="text-lg lg:text-xl text-foreground font-medium">
              These tools describe damage <em>after</em> it happens.
            </p>
            <p className="text-muted-foreground mt-2">
              By the time surveys show disengagement or exit interviews reveal burnout, the structural damage is already done.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyOrganizationsGoBlind;
