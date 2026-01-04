const benefits = [
  {
    title: "A simple team health snapshot across the organization",
  },
  {
    title: "The top signals that changed vs each team's baseline",
  },
  {
    title: "Recommended interventions managers can execute",
  },
  {
    title: "Before/after tracking to show whether changes worked",
  },
];

const SocialProofStats = () => {
  return (
    <section className="py-20 bg-secondary/30 border-y border-border/50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-4">
            What you get each week
          </h2>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div 
              key={index} 
              className="text-center animate-slide-up p-6 rounded-2xl bg-card border border-border/50"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <p className="text-sm text-muted-foreground leading-relaxed">
                {benefit.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofStats;
