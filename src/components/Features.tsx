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
    title: "Meeting Load and Fragmentation",
    description: "See when meeting volume and back-to-back scheduling start squeezing execution time.",
  },
  {
    icon: CalendarClock,
    title: "After-hours Load",
    description: "Track late-night and weekend activity trends that often precede sustained burnout risk.",
  },
  {
    icon: Shield,
    title: "Focus Time Erosion",
    description: "Detect shrinking uninterrupted blocks during working hours before delivery slows down.",
  },
  {
    icon: Zap,
    title: "Response Drag",
    description: "Spot rising response times that signal overload or breakdowns in coordination.",
  },
  {
    icon: Users2,
    title: "Participation Drift",
    description: "Identify drops in team contribution patterns and uneven load distribution at team level.",
  },
  {
    icon: BarChart3,
    title: "Team Comparisons",
    description: "Prioritize support by showing which teams deviate most from their own baselines.",
  },
];

const Features = () => {
  return (
    <section id="product" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Signals
          </p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Leading indicators HR can act on
          </h2>
          <p className="text-muted-foreground">
            We measure team-level patterns only. No individual dashboards. No message content.
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
