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
    title: 'No content reading',
    description: 'No message text, email bodies, documents, or meeting recordings.',
  },
  {
    icon: XCircle,
    title: 'No individual scoring',
    description: 'No productivity ratings, rankings, or personal profiles.',
  },
  {
    icon: Shield,
    title: 'Team-level only',
    description: 'Insights are aggregated so leaders see patterns, not personal blame.',
  },
];

const PrivacySection = () => {
  return (
    <section id="privacy" className="py-16 lg:py-20 bg-brand-softer border-y border-brand-soft">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-brand-soft mb-6">
              <Lock className="w-4 h-4 text-brand" />
              <span className="text-caption font-medium text-brand">Privacy by design</span>
            </div>
            <h2 className="text-section font-display font-bold mb-4 text-[#0F172A]">
              Patterns, not people.
            </h2>
            <p className="text-body text-brand max-w-2xl mx-auto">
              SignalTrue is designed to show team pressure without exposing private conversations or
              individual productivity.
            </p>
          </div>

          {/* Privacy constraints */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {privacyConstraints.map((item, index) => (
              <div
                key={index}
                className="p-6 rounded-container bg-white border border-brand-soft text-center"
              >
                <div className="w-12 h-12 rounded-container bg-brand-soft mx-auto mb-4 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-brand" />
                </div>
                <h3 className="font-display font-semibold text-[#0F172A] mb-2">{item.title}</h3>
                <p className="text-caption text-[#475569]">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Trust statement */}
          <div className="p-6 lg:p-8 rounded-container bg-white border border-brand-soft text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-brand" />
              <span className="font-display font-semibold text-[#0F172A]">What we analyze</span>
            </div>
            <p className="text-[#334155] max-w-2xl mx-auto">
              Meeting counts. Response time patterns. Calendar density. Focus-time availability.
              After-hours patterns. Interaction volume. management capacity. Team-level work
              rhythms.{' '}
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
