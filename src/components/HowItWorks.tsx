import { Activity, BarChart2, AlertCircle, TrendingUp } from "lucide-react";

/*
 * CATEGORY REPOSITIONING NOTE:
 * This is not a visual polish task.
 * This is a category repositioning.
 * Renamed steps per spec: Expose, Establish, Detect, Intervene
 */

const steps = [
  {
    number: "01",
    icon: Activity,
    title: "Expose how work behaves",
    description: "Connect your collaboration tools. SignalTrue reads behavioral patterns, not content.",
  },
  {
    number: "02",
    icon: BarChart2,
    title: "Establish system baselines",
    description: "Each team gets a baseline built from their own patterns, not generic benchmarks.",
  },
  {
    number: "03",
    icon: AlertCircle,
    title: "Detect meaningful drift",
    description: "Signals trigger when patterns deviate in ways that predict organizational strain.",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Intervene and measure impact",
    description: "Take targeted action and track whether signals improve, stabilize, or continue drifting.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Expose. Baseline. Detect. Intervene.
          </h2>
          <p className="text-muted-foreground">
            A signal-based workflow for organizational health that leadership can actually use.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="group relative animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-border to-transparent -translate-x-4" />
              )}
              
              <div className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-card h-full">
                {/* Number badge */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-5xl font-display font-bold text-secondary">
                    {step.number}
                  </span>
                  <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>

                <h3 className="text-xl font-display font-semibold mb-3 text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
