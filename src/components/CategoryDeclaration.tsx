import { Activity, Eye, Shield, Lock } from "lucide-react";

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 * 
 * Category Definition (per spec):
 * Behavioral Drift Intelligence detects early systemic strain in organizations 
 * by analyzing behavioral metadata from work systems, revealing overload, 
 * fragmentation, and execution risk before burnout, disengagement, or attrition occur.
 */

const CategoryDeclaration = () => {
  return (
    <section id="category" className="py-16 lg:py-20 bg-secondary/20">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section headline */}
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
              A New Category
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold">
              Introducing <span className="text-gradient">Behavioral Drift Intelligence</span>
            </h2>
          </div>

          {/* Category Definition Block - Bold, Boxed per spec */}
          <div className="p-8 lg:p-10 rounded-2xl bg-primary/5 border-2 border-primary/30 mb-10">
            <p className="text-lg lg:text-xl text-foreground leading-relaxed text-center font-medium">
              <strong>Behavioral Drift Intelligence</strong> detects early system-level strain 
              by observing how work actually happens across calendars, collaboration tools, and workflows.
            </p>
            <div className="flex flex-wrap justify-center gap-6 mt-8 pt-6 border-t border-primary/20">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-muted-foreground">No content</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-muted-foreground">No individuals</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-muted-foreground">No surveillance</span>
              </div>
            </div>
          </div>

          {/* What this means */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-card border border-border/50 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                System-Level Signals
              </h3>
              <p className="text-sm text-muted-foreground">
                Patterns emerge from how work flows, not from watching individuals.
              </p>
            </div>
            
            <div className="p-6 rounded-xl bg-card border border-border/50 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                Early Detection
              </h3>
              <p className="text-sm text-muted-foreground">
                See strain weeks before surveys, performance drops, or resignations.
              </p>
            </div>
            
            <div className="p-6 rounded-xl bg-card border border-border/50 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                Structural Action
              </h3>
              <p className="text-sm text-muted-foreground">
                Fix systems, not people. Address root causes, not symptoms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoryDeclaration;
