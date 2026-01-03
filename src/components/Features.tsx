import { 
  Shield, 
  Zap, 
  BarChart3, 
  MessageSquareWarning, 
  CalendarClock,
  Users2
} from "lucide-react";

const features = [
  {
    icon: MessageSquareWarning,
    title: "Communication Health",
    description: "Detect fragmentation, urgency spikes, and coordination bottlenecks across team channels.",
  },
  {
    icon: CalendarClock,
    title: "Workload Patterns",
    description: "Track meeting density, after-hours work, and focus time erosion automatically.",
  },
  {
    icon: BarChart3,
    title: "Team Comparisons",
    description: "Benchmark teams against healthy baselines and identify which need intervention first.",
  },
  {
    icon: Zap,
    title: "Early Warning System",
    description: "Get alerts 2-4 weeks before burnout symptoms become visible to managers.",
  },
  {
    icon: Shield,
    title: "Privacy by Design",
    description: "No individual tracking. No message content reading. Only anonymized team-level signals.",
  },
  {
    icon: Users2,
    title: "Works for Any Team",
    description: "Flat teams, hierarchies, remote or hybrid — SignalTrue adapts to your structure.",
  },
];

const Features = () => {
  return (
    <section id="product" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            What SignalTrue Detects
          </p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Early warning signs that matter to HR
          </h2>
          <p className="text-muted-foreground">
            We translate complex behavioral data into actionable insights you can act on today.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-card animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
