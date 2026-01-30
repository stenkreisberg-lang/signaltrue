import { Activity, ArrowRight, Shield, Lock, Users, Zap, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/**
 * DriftDiagnostic - Landing page for the free behavioral drift diagnostic
 * Route: /drift-diagnostic
 */
const DriftDiagnostic = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-glow opacity-40" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-glow opacity-25" />
        
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Lock className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-medium text-muted-foreground">No personal data</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Anonymous assessment</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Activity className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-medium text-muted-foreground">7-10 minutes</span>
              </div>
            </div>
            
            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
              Free Behavioral Drift Diagnostic
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Detect coordination drift before it shows up in surveys, exits, or missed results. 
              This diagnostic flags system-level risk patterns—not individual performance.
            </p>
            
            {/* Primary CTA */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <a href="/drift/run.html">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Start Diagnostic
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
              <Link to="/product">
                <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                  Learn about SignalTrue
                </Button>
              </Link>
            </div>
            
            {/* Privacy note */}
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              No personal data. No message content. This diagnostic is about system patterns—not surveillance.
            </p>
          </div>
        </div>
      </section>
      
      {/* What You'll Learn Section */}
      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-center mb-4">
              What You'll Learn
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              In just 8 questions, you'll get a clear picture of coordination strain patterns in your organization.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-secondary/30 border border-border/50">
                <BarChart3 className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Drift Score (0-100)</h3>
                <p className="text-sm text-muted-foreground">
                  A quantified risk profile based on meeting load, response pressure, and recovery gaps.
                </p>
              </div>
              
              <div className="p-6 rounded-2xl bg-secondary/30 border border-border/50">
                <Activity className="w-8 h-8 text-accent mb-4" />
                <h3 className="font-semibold mb-2">Risk Category</h3>
                <p className="text-sm text-muted-foreground">
                  Stable, Early Drift, Active Drift, or Critical Drift—with context on what each means.
                </p>
              </div>
              
              <div className="p-6 rounded-2xl bg-secondary/30 border border-border/50">
                <Zap className="w-8 h-8 text-warning mb-4" />
                <h3 className="font-semibold mb-2">Key Findings</h3>
                <p className="text-sm text-muted-foreground">
                  Specific patterns driving your score—meeting pressure, focus fragmentation, urgency culture.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Why This Matters Section */}
      <section className="py-20 border-t border-border/50 bg-secondary/10">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-center mb-12">
              Why This Matters
            </h2>
            
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Burnout doesn't start with feelings</h3>
                  <p className="text-muted-foreground">
                    It starts with small behavioral shifts—meeting creep, faster response expectations, disappearing recovery time. 
                    These patterns become visible in behavior before people can name them in surveys.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Surveys often look "fine" until they don't</h3>
                  <p className="text-muted-foreground">
                    By the time engagement scores drop, the damage is done. Leading indicators show up in coordination patterns 
                    weeks or months before survey results change.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">3</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">System-level problems need system-level visibility</h3>
                  <p className="text-muted-foreground">
                    Individual interventions can't fix structural drift. You need to see the patterns at team level 
                    to know what to change—meeting design, response norms, recovery buffers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-display font-bold mb-4">
              Ready to see your drift profile?
            </h2>
            <p className="text-muted-foreground mb-8">
              Takes 7-10 minutes. No integrations required. Get your results immediately.
            </p>
            
            <a href="/drift/run.html">
              <Button variant="hero" size="xl">
                Start Diagnostic
                <ArrowRight className="w-5 h-5" />
              </Button>
            </a>
            
            <p className="text-sm text-muted-foreground mt-6">
              Prefer zero integrations? Start with the diagnostic first. 
              If you want to validate with real behavioral signals, SignalTrue can run a 30-day baseline calibration.
            </p>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default DriftDiagnostic;
