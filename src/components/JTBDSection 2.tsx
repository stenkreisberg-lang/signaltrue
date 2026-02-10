import { Target } from 'lucide-react';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 *
 * JTBD Section (per spec):
 * Title: Leaders Hire SignalTrue To Do One Thing
 *
 * Copy: Detect when the organization is becoming unsustainable early enough
 * to fix the system before people burn out or leave.
 */

const JTBDSection = () => {
  return (
    <section id="jtbd" className="py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-8 flex items-center justify-center">
            <Target className="w-8 h-8 text-primary" />
          </div>

          {/* Title */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-8">
            Leaders Hire SignalTrue
            <br />
            <span className="text-gradient">To Do One Thing</span>
          </h2>

          {/* The Job */}
          <div className="p-8 lg:p-10 rounded-2xl bg-card border border-border/50">
            <p className="text-xl lg:text-2xl text-foreground leading-relaxed font-medium">
              Detect when the organization is becoming unsustainable
              <strong className="text-primary"> early enough </strong>
              to fix the system before people burn out or leave.
            </p>
          </div>

          {/* Supporting context */}
          <p className="text-lg text-muted-foreground mt-8 max-w-2xl mx-auto">
            Not engagement scores. Not productivity metrics. Not sentiment analysis.
            <br />
            <strong className="text-foreground">Early structural warning.</strong>
          </p>
        </div>
      </div>
    </section>
  );
};

export default JTBDSection;
