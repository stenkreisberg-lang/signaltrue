import { AlertTriangle, TrendingUp, Clock, Activity } from 'lucide-react';

const DriftAlertCard = () => {
  return (
    <div className="relative bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)] animate-float">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse-slow" />
            <span className="text-xs font-medium text-[#92400E]">Early workload risk signal</span>
          </div>
          <h3 className="text-xl font-display font-bold text-[#0F172A]">
            Team: Product &amp; Engineering
          </h3>
          <p className="text-sm text-[#475569] mt-1">
            Risk level: Rising • Team-level signals only
          </p>
        </div>
        <div className="p-2 rounded-lg bg-[#FEF3C7]">
          <AlertTriangle className="w-5 h-5 text-[#92400E]" />
        </div>
      </div>

      {/* Signals detected */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F8FAFC]">
          <div className="p-2 rounded-lg bg-[#FEF3C7]">
            <Activity className="w-4 h-4 text-[#92400E]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#0F172A]">Meeting load increasing</p>
          </div>
          <span className="text-sm font-semibold text-[#92400E]">Rising</span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F8FAFC]">
          <div className="p-2 rounded-lg bg-[#FEF3C7]">
            <Clock className="w-4 h-4 text-[#92400E]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#0F172A]">Focus time decreasing</p>
          </div>
          <span className="text-sm font-semibold text-[#92400E]">-28%</span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F8FAFC]">
          <div className="p-2 rounded-lg bg-[#FEE2E2]">
            <TrendingUp className="w-4 h-4 text-[#B91C1C]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#0F172A]">After-hours work rising</p>
          </div>
          <span className="text-sm font-semibold text-[#B91C1C]">+35%</span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F8FAFC]">
          <div className="p-2 rounded-lg bg-[#FEE2E2]">
            <Activity className="w-4 h-4 text-[#B91C1C]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#0F172A]">Manager calendar overload</p>
          </div>
          <span className="text-sm font-semibold text-[#B91C1C]">Critical</span>
        </div>
      </div>

      {/* Recommended action */}
      <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE]">
        <p className="text-sm font-medium text-[#0F172A] mb-1">Recommended action</p>
        <p className="text-sm text-[#334155] leading-relaxed">
          Review recurring meetings, protect focus blocks, and check whether managers have become
          decision bottlenecks.
        </p>
      </div>
    </div>
  );
};

export default DriftAlertCard;
