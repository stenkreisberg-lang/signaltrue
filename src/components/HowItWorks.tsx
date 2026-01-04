import { Link2, Brain, Bell, TrendingUp } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Link2,
    title: "Connect your tools",
    description: "Connect Slack or Teams and your calendar using OAuth. We never see your passwords.",
  },
  {
    number: "02",
    icon: Brain,
    title: "Establish a baseline",
    description: "SignalTrue builds a baseline for each team so changes are measured against what is normal for them.",
  },
  {
    number: "03",
    icon: Bell,
    title: "Review signals",
    description: "See which teams shifted, what changed, and where the risk is building.",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Take action and track impact",
    description: "Choose an intervention, assign an owner, and track whether signals improve over time.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Detect. Diagnose. Intervene. Measure.
          </h2>
          <p className="text-muted-foreground">
            A repeatable team health workflow HR and managers can actually run.
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
