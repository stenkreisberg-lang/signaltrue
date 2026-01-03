const stats = [
  {
    value: "83%",
    label: "of HR leaders say early warnings would have prevented their last regrettable departure",
  },
  {
    value: "42%",
    label: "average reduction in voluntary turnover for teams using SignalTrue",
  },
  {
    value: "14 days",
    label: "average lead time on burnout detection before visible symptoms",
  },
  {
    value: "< 5 min",
    label: "weekly time investment for team health monitoring",
  },
];

const SocialProofStats = () => {
  return (
    <section className="py-20 bg-secondary/30 border-y border-border/50">
      <div className="container mx-auto px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="text-center animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <p className="text-4xl lg:text-5xl font-display font-bold text-gradient mb-3">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofStats;
