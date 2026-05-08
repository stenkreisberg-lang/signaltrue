import { Activity, Eye, Shield, Lock } from 'lucide-react';

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
              <span className="text-gradient">Workload Risk Early Warning</span>
            </h2>
          </div>

          {/* Category Definition Block */}
          <div className="p-8 lg:p-10 rounded-2xl bg-primary/5 border-2 border-primary/30 mb-10">
            <p className="text-lg lg:text-xl text-foreground leading-relaxed text-center font-medium">
              SignalTrue detects early system-level strain by observing how work actually happens
              across calendars and communication patterns.
            </p>
            <div className="flex flex-wrap justify-center gap-6 mt-8 pt-6 border-t border-primary/20">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-muted-foreground">No content read</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-muted-foreground">
                  No individual ranking
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-muted-foreground">No surveillance</span>
              </div>
            </div>
          </div>

          {/* Three cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-card border border-border/50 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                System-level signals
              </h3>
              <p className="text-sm text-muted-foreground">
                Pattern changes from team work behavior, not from private conversations.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border/50 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">Early detection</h3>
              <p className="text-sm text-muted-foreground">
                See warning signs before they become burnout, missed execution, or resignations.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border/50 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">Structured action</h3>
              <p className="text-sm text-muted-foreground">
                Turn risk signals into clear actions for leadership and HR.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoryDeclaration;
