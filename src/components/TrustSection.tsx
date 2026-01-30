import { Shield, Lock, Eye, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/*
 * CATEGORY KING POSITIONING:
 * "Not surveillance. By design."
 * Privacy is enforced at architecture level, not promised in marketing.
 */

const TrustSection = () => {
  return (
    <section id="trust" className="py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 mb-6">
              <Shield className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">Privacy by architecture</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Not surveillance. By design.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              SignalTrue analyzes behavioral metadata, not message content. 
              No emotion inference. No individual scoring for managers. 
              Privacy is enforced at the architecture level—not promised in marketing.
            </p>
          </div>

          {/* Trust pillars */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="p-6 rounded-2xl bg-card border border-border/50 text-center">
              <div className="p-3 rounded-xl bg-success/10 w-fit mx-auto mb-4">
                <Lock className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No message content</h3>
              <p className="text-sm text-muted-foreground">
                We never read emails, Slack messages, or document content.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/50 text-center">
              <div className="p-3 rounded-xl bg-success/10 w-fit mx-auto mb-4">
                <Eye className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No emotion inference</h3>
              <p className="text-sm text-muted-foreground">
                No sentiment analysis, tone detection, or mood tracking.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/50 text-center">
              <div className="p-3 rounded-xl bg-success/10 w-fit mx-auto mb-4">
                <Shield className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No individual scoring</h3>
              <p className="text-sm text-muted-foreground">
                Managers see team patterns, never individual rankings.
              </p>
            </div>
          </div>

          {/* Link to full privacy page */}
          <div className="text-center">
            <Link 
              to="/trust" 
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
            >
              See how privacy is enforced
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
