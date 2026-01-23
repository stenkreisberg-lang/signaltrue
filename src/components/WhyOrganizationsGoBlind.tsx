import { ArrowRight, Layers } from "lucide-react";

/*
 * CATEGORY REPOSITIONING NOTE:
 * This is not a visual polish task.
 * This is a category repositioning.
 * If a section feels "empty", "safe", or "generic", it's wrong.
 * Optimize for clarity and conviction over minimalism.
 * 
 * Purpose: Reframe the problem before showing product or metrics.
 */

const oldWorldItems = [
  "Engagement surveys",
  "Manager intuition",
  "Output metrics",
  "Retrospectives",
];

const newRealityItems = [
  "Coordination overload",
  "Response pressure",
  "Execution drag",
  "Recovery loss",
];

const WhyOrganizationsGoBlind = () => {
  return (
    <section id="why-organizations-go-blind" className="py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section headline */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-center mb-12 lg:mb-16">
            Most organizational risk never shows up in dashboards.
          </h2>

          {/* Two-column POV Block */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-12">
            {/* LEFT COLUMN – OLD WORLD */}
            <div className="p-6 lg:p-8 rounded-2xl bg-secondary/30 border border-border/50">
              <h3 className="text-lg font-display font-semibold text-muted-foreground uppercase tracking-wider mb-6">
                What leaders think they're measuring
              </h3>
              <ul className="space-y-4 mb-6">
                {oldWorldItems.map((item, index) => (
                  <li 
                    key={index}
                    className="flex items-center gap-3 text-lg text-foreground/70"
                  >
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground italic border-t border-border/50 pt-4">
                Lagging. Opinion-based. Polite.
              </p>
            </div>

            {/* RIGHT COLUMN – NEW REALITY */}
            <div className="p-6 lg:p-8 rounded-2xl bg-primary/5 border border-primary/20">
              <h3 className="text-lg font-display font-semibold text-primary uppercase tracking-wider mb-6">
                What actually predicts breakdown
              </h3>
              <ul className="space-y-4 mb-6">
                {newRealityItems.map((item, index) => (
                  <li 
                    key={index}
                    className="flex items-center gap-3 text-lg text-foreground font-medium"
                  >
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-primary/80 italic border-t border-primary/20 pt-4">
                Leading. Behavioral. Invisible until it's expensive.
              </p>
            </div>
          </div>

          {/* Bridge Paragraph */}
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed">
              Modern work leaves signals long before people speak up.
              <br />
              <span className="text-foreground font-medium">
                SignalTrue exists to detect those signals early, without reading messages or tracking individuals.
              </span>
            </p>
          </div>

          {/* Optional Abstract Diagram */}
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 p-6 rounded-2xl bg-secondary/20 border border-border/30">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-muted">
                  <Layers className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Work tools</span>
              </div>
              
              <ArrowRight className="w-5 h-5 text-border rotate-90 sm:rotate-0" />
              
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <span className="text-primary font-bold text-xs">S</span>
                  </div>
                </div>
                <span className="text-sm font-medium text-primary">Signal layer</span>
              </div>
              
              <ArrowRight className="w-5 h-5 text-border rotate-90 sm:rotate-0" />
              
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-accent/10">
                  <div className="w-5 h-5 rounded-full border-2 border-accent flex items-center justify-center">
                    <span className="text-accent text-xs">!</span>
                  </div>
                </div>
                <span className="text-sm font-medium text-accent">Early warning</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyOrganizationsGoBlind;
