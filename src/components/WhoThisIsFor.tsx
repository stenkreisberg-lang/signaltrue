import { Users, Briefcase, Building2 } from "lucide-react";

/*
 * CATEGORY KING POSITIONING:
 * Built for leaders who manage knowledge work.
 * Primary: Founders, Managers. Secondary: HR.
 */

const audiences = [
  {
    icon: Briefcase,
    title: "Founders managing growing teams",
    description: "Detect when scaling creates invisible coordination problems, before they slow you down.",
  },
  {
    icon: Users,
    title: "Managers responsible for performance",
    description: "Get early warning on team drift and clear actions you can take this week.",
  },
  {
    icon: Building2,
    title: "HR leaders supporting with evidence",
    description: "Help managers with behavioral data, not opinion surveys. See patterns without exposing individuals.",
  },
];

const WhoThisIsFor = () => {
  return (
    <section id="who-this-is-for" className="py-20 lg:py-24 bg-secondary/20">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Who this is for
          </p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Built for leaders who manage knowledge work.
          </h2>
        </div>

        {/* Audience grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {audiences.map((audience, index) => (
            <div 
              key={index}
              className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                <audience.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold mb-2 text-foreground">
                {audience.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {audience.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhoThisIsFor;
