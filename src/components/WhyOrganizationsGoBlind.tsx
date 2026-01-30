import { ArrowRight, Layers } from "lucide-react";

/*
 * CATEGORY KING POSITIONING:
 * "The Enemy" section - establishes what we're against
 * Enemies: Lagging surveys, engagement theater, monitoring tools
 */

const laggingIndicators = [
  "Engagement surveys",
  "Annual reviews",
  "Manager gut feeling",
  "Exit interviews",
];

const earlyBehavioralSignals = [
  "Meeting fragmentation",
  "After-hours creep",
  "Response pressure",
  "Recovery collapse",
];

const WhyOrganizationsGoBlind = () => {
  return (
    <section id="the-enemy" className="py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section headline */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-center mb-6">
            The problem isn't motivation.
            <br />
            <span className="text-gradient">It's invisible drift.</span>
          </h2>

          {/* Enemy explanation */}
          <p className="text-xl text-muted-foreground text-center max-w-3xl mx-auto mb-12 lg:mb-16">
            Most organizations rely on lagging signals. Engagement surveys, annual reviews, and gut feeling tell you what already happened. By the time burnout is visible, the damage is done.
          </p>

          {/* Two-column POV Block */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-12">
            {/* LEFT COLUMN – LAGGING INDICATORS */}
            <div className="p-6 lg:p-8 rounded-2xl bg-secondary/30 border border-border/50">
              <h3 className="text-lg font-display font-semibold text-muted-foreground uppercase tracking-wider mb-6">
                What most organizations measure
              </h3>
              <ul className="space-y-4 mb-6">
                {laggingIndicators.map((item, index) => (
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
                Lagging. Opinion-based. Already too late.
              </p>
            </div>

            {/* RIGHT COLUMN – EARLY BEHAVIORAL SIGNALS */}
            <div className="p-6 lg:p-8 rounded-2xl bg-primary/5 border border-primary/20">
              <h3 className="text-lg font-display font-semibold text-primary uppercase tracking-wider mb-6">
                What SignalTrue detects
              </h3>
              <ul className="space-y-4 mb-6">
                {earlyBehavioralSignals.map((item, index) => (
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
                Leading. Behavioral. Actionable before crisis.
              </p>
            </div>
          </div>

          {/* Bridge Paragraph */}
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-xl lg:text-2xl text-foreground font-medium leading-relaxed">
              SignalTrue exists to replace lagging indicators with early, behavioral evidence and clear intervention paths.
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
