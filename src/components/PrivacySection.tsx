import { Shield, Lock, Eye, XCircle } from 'lucide-react';

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
    title: 'No message reading',
    description: 'We never access email content, chat messages, or document text.',
  },
  {
    icon: XCircle,
    title: 'No individual scoring',
    description: 'No performance ratings, productivity scores, or individual profiles.',
  },
  {
    icon: Shield,
    title: 'Aggregated patterns only',
    description: 'All insights are system-level. Individual data is never surfaced.',
  },
];

const PrivacySection = () => {
  return (
    <section id="privacy" className="py-16 lg:py-20 bg-[#ECFDF5] border-y border-[#A7F3D0]">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#A7F3D0] mb-6">
              <Lock className="w-4 h-4 text-[#047857]" />
              <span className="text-sm font-medium text-[#047857]">Privacy by architecture</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 text-[#064E3B]">
              Privacy Is the Constraint
            </h2>
            <p className="text-lg text-[#047857] max-w-2xl mx-auto">
              SignalTrue is designed so that surveillance is architecturally impossible, not just
              policy-prohibited.
            </p>
          </div>

          {/* Privacy constraints */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {privacyConstraints.map((item, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-white border border-[#A7F3D0] text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-[#D1FAE5] mx-auto mb-4 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-[#047857]" />
                </div>
                <h3 className="font-display font-semibold text-[#0F172A] mb-2">{item.title}</h3>
                <p className="text-sm text-[#475569]">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Trust statement */}
          <div className="p-6 lg:p-8 rounded-2xl bg-white border border-[#A7F3D0] text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-[#047857]" />
              <span className="font-display font-semibold text-[#0F172A]">What we analyze</span>
            </div>
            <p className="text-[#334155] max-w-2xl mx-auto">
              Meeting counts. Response time patterns. Calendar density. Focus-time availability.
              After-hours patterns. Interaction volume. Manager load. Team-level work rhythms.{' '}
              <strong className="text-[#0F172A]">
                Metadata only. Never content. Never individuals.
              </strong>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrivacySection;
