import { Target } from 'lucide-react';

const JTBDSection = () => {
  return (
    <section id="jtbd" className="py-16 lg:py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] mx-auto mb-8 flex items-center justify-center">
            <Target className="w-8 h-8 text-[#1D4ED8]" />
          </div>

          {/* Eyebrow */}
          <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-4">
            Why SignalTrue
          </p>

          {/* Title */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-8 text-[#0F172A]">
            Leaders hire SignalTrue to reduce late surprises.
          </h2>

          {/* The Job */}
          <div className="p-8 lg:p-10 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm">
            <p className="text-xl lg:text-2xl text-[#0F172A] leading-relaxed font-medium">
              SignalTrue helps leadership see when the organization is becoming unsustainable{' '}
              <strong className="text-[#1D4ED8]">early enough</strong> to fix the system before
              people burn out or leave.
            </p>
          </div>

          {/* Supporting context */}
          <p className="text-lg text-[#334155] mt-8 max-w-2xl mx-auto">
            Not engagement scores. Not productivity metrics. Not sentiment analysis.
            <br />
            <strong className="text-[#0F172A]">Early workload risk warning.</strong>
          </p>
        </div>
      </div>
    </section>
  );
};

export default JTBDSection;
