import { Shield, Lock, Eye, XCircle } from "lucide-react";

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 * 
 * Privacy Section (per spec):
 * Title: Privacy Is the Constraint
 * 
 * Bullets:
 * - No message reading
 * - No individual scoring
 * - Aggregated system-level patterns only
 */

const privacyConstraints = [
  {
    icon: XCircle,
    title: "No message reading",
    description: "We never access email content, chat messages, or document text.",
  },
  {
    icon: XCircle,
    title: "No individual scoring",
    description: "No performance ratings, productivity scores, or individual profiles.",
  },
  {
    icon: Shield,
    title: "Aggregated patterns only",
    description: "All insights are system-level. Individual data is never surfaced.",
  },
];

const PrivacySection = () => {
  return (
    <section id="privacy" className="py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 mb-6">
              <Lock className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">Privacy by architecture</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              Privacy Is the <span className="text-gradient">Constraint</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              SignalTrue is designed so that surveillance is architecturally impossible, not just policy-prohibited.
            </p>
          </div>

          {/* Privacy constraints */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {privacyConstraints.map((item, index) => (
              <div 
                key={index}
                className="p-6 rounded-2xl bg-card border border-border/50 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-success/10 mx-auto mb-4 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* Trust statement */}
          <div className="p-6 lg:p-8 rounded-2xl bg-success/5 border border-success/20 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-success" />
              <span className="font-display font-semibold text-foreground">What we see</span>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Meeting counts. Response timing. Calendar density. Focus time availability. 
              After-hours patterns. <strong className="text-foreground">Metadata only.</strong> Never content. Never individuals.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrivacySection;
