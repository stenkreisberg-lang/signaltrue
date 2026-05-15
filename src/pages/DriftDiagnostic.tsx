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
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-white border-b border-[#E2E8F0] overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#DBEAFE] opacity-20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-[#EFF6FF] opacity-30 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] shadow-sm">
                <Lock className="w-3.5 h-3.5 text-[#047857]" />
                <span className="text-xs font-medium text-[#334155]">No personal data</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] shadow-sm">
                <Shield className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span className="text-xs font-medium text-[#334155]">Anonymous assessment</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] shadow-sm">
                <Activity className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span className="text-xs font-medium text-[#334155]">7–10 minutes</span>
              </div>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6 text-[#0F172A]">
              Free Behavioral Drift <span className="text-[#1D4ED8]">Diagnostic</span>
            </h1>

            <p className="text-lg sm:text-xl text-[#334155] max-w-2xl mx-auto mb-8 leading-relaxed">
              Detect coordination drift before it shows up in surveys, exits, or missed results.
              This diagnostic flags system-level risk patterns—not individual performance.
            </p>

            {/* Primary CTA */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
              <a href="/drift/run.html">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Start diagnostic
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
              <Link to="/product">
                <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                  Learn about SignalTrue
                </Button>
              </Link>
            </div>

            <p className="text-sm text-[#475569] max-w-lg mx-auto">
              No personal data. No message content. This diagnostic is about system patterns—not
              surveillance.
            </p>
          </div>
        </div>
      </section>

      {/* What You'll Learn Section */}
      <section className="py-20 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-center mb-4 text-[#0F172A]">
              What You'll Learn
            </h2>
            <p className="text-[#475569] text-center mb-12 max-w-2xl mx-auto">
              In just 8 questions, you'll get a clear picture of coordination strain patterns in
              your organization.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center mb-4">
                  <BarChart3 className="w-5 h-5 text-[#1D4ED8]" />
                </div>
                <h3 className="font-semibold mb-2 text-[#0F172A]">Drift Score (0–100)</h3>
                <p className="text-sm text-[#475569]">
                  A quantified risk profile based on meeting load, response pressure, and recovery
                  gaps.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center mb-4">
                  <Activity className="w-5 h-5 text-[#1D4ED8]" />
                </div>
                <h3 className="font-semibold mb-2 text-[#0F172A]">Risk Category</h3>
                <p className="text-sm text-[#475569]">
                  Stable, Early Drift, Active Drift, or Critical Drift—with context on what each
                  means.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5 text-[#92400E]" />
                </div>
                <h3 className="font-semibold mb-2 text-[#0F172A]">Key Findings</h3>
                <p className="text-sm text-[#475569]">
                  Specific patterns driving your score—meeting pressure, focus fragmentation,
                  urgency culture.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why This Matters Section */}
      <section className="py-20 bg-white border-b border-[#E2E8F0]">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-center mb-12 text-[#0F172A]">
              Why This Matters
            </h2>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#DBEAFE] flex items-center justify-center">
                  <span className="text-[#1E3A8A] font-bold text-sm">1</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-[#0F172A]">
                    Burnout doesn't start with feelings
                  </h3>
                  <p className="text-[#334155]">
                    It starts with small behavioral shifts—meeting creep, faster response
                    expectations, disappearing recovery time. These patterns become visible in
                    behavior before people can name them in surveys.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#DBEAFE] flex items-center justify-center">
                  <span className="text-[#1E3A8A] font-bold text-sm">2</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-[#0F172A]">
                    Surveys often look "fine" until they don't
                  </h3>
                  <p className="text-[#334155]">
                    By the time engagement scores drop, the damage is done. Leading indicators show
                    up in coordination patterns weeks or months before survey results change.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#DBEAFE] flex items-center justify-center">
                  <span className="text-[#1E3A8A] font-bold text-sm">3</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-[#0F172A]">
                    System-level problems need system-level visibility
                  </h3>
                  <p className="text-[#334155]">
                    Individual interventions can't fix structural drift. You need to see the
                    patterns at team level to know what to change—meeting design, response norms,
                    recovery buffers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#0F172A]">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-display font-bold mb-4 text-white">
              Ready to see your drift profile?
            </h2>
            <p className="text-[#CBD5E1] mb-8">
              Takes 7–10 minutes. No integrations required. Get your results immediately.
            </p>

            <a href="/drift/run.html">
              <Button variant="hero" size="xl">
                Start diagnostic
                <ArrowRight className="w-5 h-5" />
              </Button>
            </a>

            <p className="text-sm text-[#94A3B8] mt-6">
              Prefer zero integrations? Start with the diagnostic first. If you want to validate
              with real behavioral signals, SignalTrue can run a 3–4 week baseline calibration.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DriftDiagnostic;
