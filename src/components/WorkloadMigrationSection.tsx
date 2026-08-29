import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';

const WorkloadMigrationSection = () => (
  <section className="bg-[#F8FAFC] py-16 lg:py-20">
    <div className="container mx-auto px-6">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="mb-4 text-sm font-bold uppercase tracking-wider text-brand">
            Workload migration
          </p>
          <h2 className="mb-5 text-3xl font-bold text-[#0F172A] sm:text-4xl">
            Less activity in one place does not always mean less demand.
          </h2>
          <p className="text-lg leading-relaxed text-[#475569]">
            SignalTrue compares related channels, times and teams. When the intended measure
            improves but demand rises elsewhere, it raises a question for workers and leaders to
            investigate—not an automatic conclusion.
          </p>
        </div>

        <div
          className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
          aria-label="Example showing meeting demand reducing while chat and another team's demand increase"
        >
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#047857]">Intended</p>
              <p className="mt-2 font-bold text-[#0F172A]">Recurring meetings</p>
              <p className="mt-3 flex items-center gap-2 text-2xl font-bold text-[#0F172A]">
                <ArrowDown className="h-5 w-5 text-[#047857]" aria-hidden="true" /> −31%
              </p>
            </div>
            <ArrowRight
              className="mx-auto h-6 w-6 rotate-90 text-brand sm:rotate-0"
              aria-hidden="true"
            />
            <div className="space-y-3">
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
                <p className="text-sm font-bold text-[#0F172A]">Chat demand</p>
                <p className="mt-1 flex items-center gap-2 font-bold text-[#0F172A]">
                  <ArrowUpRight className="h-4 w-4 text-[#92400E]" aria-hidden="true" /> +22%
                </p>
              </div>
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
                <p className="text-sm font-bold text-[#0F172A]">Adjacent team demand</p>
                <p className="mt-1 flex items-center gap-2 font-bold text-[#0F172A]">
                  <ArrowUpRight className="h-4 w-4 text-[#92400E]" aria-hidden="true" /> +44%
                </p>
              </div>
            </div>
          </div>
          <p className="mt-5 border-t border-[#E2E8F0] pt-4 text-sm font-semibold text-[#334155]">
            Question raised: was the underlying demand reduced, or did its route change?
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default WorkloadMigrationSection;
