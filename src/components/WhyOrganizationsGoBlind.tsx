import { XCircle } from 'lucide-react';

const laggingIndicators = [
  { name: 'Engagement surveys', problem: 'Measure opinions after pressure is already visible.' },
  { name: 'Performance reviews', problem: 'Arrive too late to catch daily execution drag.' },
  { name: 'Exit interviews', problem: 'Explain the problem after the person has already left.' },
  {
    name: 'Wellbeing programs',
    problem: 'Help people cope, but rarely show what work patterns created the pressure.',
  },
];

const WhyOrganizationsGoBlind = () => {
  return (
    <section id="the-problem" className="py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
              The Problem
            </p>
          </div>

          {/* Section headline */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-center mb-6">
            Most companies see the damage too late.
          </h2>

          <div className="max-w-3xl mx-auto text-center mb-12 lg:mb-16 space-y-4">
            <p className="text-xl text-muted-foreground">
              Leaders often see burnout, missed deadlines, or resignations only after the pressure
              has been building for weeks.
            </p>
          </div>

          {/* Enemy Tools Grid */}
          <div className="grid sm:grid-cols-2 gap-4 lg:gap-6 mb-12 max-w-4xl mx-auto">
            {laggingIndicators.map((item, index) => (
              <div key={index} className="p-6 rounded-2xl bg-secondary/30 border border-border/50">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <XCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground mb-1">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.problem}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Highlight box */}
          <div className="max-w-3xl mx-auto text-center p-6 lg:p-8 rounded-2xl bg-destructive/5 border border-destructive/20">
            <p className="text-lg lg:text-xl text-foreground font-medium">
              The warning signs usually appear earlier.
            </p>
            <p className="text-muted-foreground mt-2">
              Meeting overload, lost focus time, after-hours work, manager bottlenecks, and slow
              coordination.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyOrganizationsGoBlind;
