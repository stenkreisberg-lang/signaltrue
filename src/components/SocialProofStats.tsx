/*
 * CATEGORY REPOSITIONING NOTE:
 * This is not a visual polish task.
 * This is a category repositioning.
 * Replace feature language with outcomes.
 * No percentages. No scores.
 */

const outcomes = [
  {
    title: "Early signals of coordination overload",
    description: "Detect when teams are spending more time coordinating than executing.",
  },
  {
    title: "Where recovery is disappearing",
    description: "See which teams have lost buffer time between demands.",
  },
  {
    title: "Where execution friction is accumulating",
    description: "Identify bottlenecks before they become visible blockers.",
  },
  {
    title: "Which teams are compensating instead of improving",
    description: "Spot patterns where effort masks systemic problems.",
  },
];

const SocialProofStats = () => {
  return (
    <section className="py-16 lg:py-20 bg-secondary/30 border-y border-border/50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Organizational Clarity
          </p>
          <h2 className="text-2xl sm:text-3xl font-display font-bold">
            What leaders actually see
          </h2>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {outcomes.map((outcome, index) => (
            <div 
              key={index} 
              className="animate-slide-up p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <h3 className="text-base font-display font-semibold text-foreground mb-2">
                {outcome.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {outcome.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofStats;
