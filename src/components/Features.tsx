import { 
  AlertTriangle,
  Clock, 
  Hourglass, 
  Zap, 
  Users2,
  ArrowDownRight
} from "lucide-react";

/*
 * CATEGORY REPOSITIONING NOTE:
 * This is not a visual polish task.
 * This is a category repositioning.
 * Each card must include: Failure mode title, short explanation, "Leads to:" consequence.
 * Avoid tool-specific wording (Slack-only bias).
 */

const failureModes = [
  {
    icon: Clock,
    title: "Meeting overload",
    description: "When decisions turn into recurring meetings instead of resolved outcomes.",
    leadsTo: "Slower execution, hidden burnout, decision fatigue",
  },
  {
    icon: Hourglass,
    title: "Recovery erosion",
    description: "When buffer time between demands disappears from calendars and workflows.",
    leadsTo: "Accumulated exhaustion, declining quality, quiet quitting",
  },
  {
    icon: AlertTriangle,
    title: "Coordination strain",
    description: "When teams spend more time aligning than delivering actual work.",
    leadsTo: "Execution bottlenecks, frustrated high performers, attrition risk",
  },
  {
    icon: Zap,
    title: "Response pressure",
    description: "When expected response times compress beyond sustainable levels.",
    leadsTo: "Constant context-switching, shallow work, missed signals",
  },
  {
    icon: Users2,
    title: "Load imbalance",
    description: "When some team members absorb disproportionate coordination burden.",
    leadsTo: "Single points of failure, resentment, sudden departures",
  },
  {
    icon: ArrowDownRight,
    title: "Execution drag",
    description: "When work velocity slows despite stable or increasing effort.",
    leadsTo: "Deadline pressure, compensating behaviors, systemic decline",
  },
];

const Features = () => {
  return (
    <section id="product" className="py-20 lg:py-24 bg-secondary/20">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Signals
          </p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Failure modes of modern work
          </h2>
          <p className="text-muted-foreground">
            These patterns often precede burnout, attrition, and execution breakdown. 
            SignalTrue detects them at system level before they become crises.
          </p>
        </div>

        {/* Failure modes grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {failureModes.map((mode, index) => (
            <div 
              key={index}
              className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-card animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <mode.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold mb-2 text-foreground">
                {mode.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {mode.description}
              </p>
              <div className="pt-3 border-t border-border/50">
                <p className="text-sm">
                  <span className="text-warning font-medium">Leads to: </span>
                  <span className="text-muted-foreground">{mode.leadsTo}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
