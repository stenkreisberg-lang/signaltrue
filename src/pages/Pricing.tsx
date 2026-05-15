import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { CheckCircle, ArrowRight, Shield, Loader2 } from 'lucide-react';

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 *
 * Pricing Page (per spec):
 * Purpose: Anchor price to risk avoided, not features.
 *
 * Pricing Philosophy: Pricing reflects the cost of late detection.
 * One missed signal often costs more than a year of prevention.
 *
 * Tiers (outcome-first, not feature-first):
 * - Visibility: Early system signals
 * - Prevention: Trend tracking + alerts
 * - Resilience: Executive summaries + intervention guidance
 */

// Analytics tracking
const trackEvent = (eventName: string) => {
  if (
    typeof window !== 'undefined' &&
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  ) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', eventName);
  }
  try {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    fetch(`${apiUrl}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, timestamp: new Date().toISOString() }),
    }).catch(() => {
      /* Silently fail for analytics */
    });
  } catch {
    /* Silently fail for analytics */
  }
};

// Pricing tiers per spec
const tiers = [
  {
    name: 'Workload Scan',
    planKey: null,
    outcome: 'A focused 3–4 week calibration before committing to ongoing use.',
    description:
      'Best for small teams or organizations that want a clear picture before buying an always-on system.',
    price: 'Custom pilot price',
    period: '',
    highlight: false,
    features: [
      '3–4 week baseline period',
      'Team-level work-pattern analysis',
      'Manager load overview',
      'Meeting overload findings',
      'Focus fragmentation findings',
      'Response pressure findings',
      'Recovery risk findings',
      'Executive summary',
      'Recommended actions',
      'Follow-up review call',
    ],
    cta: 'Request scan',
  },
  {
    name: 'Team Signals',
    planKey: 'interpretation',
    outcome: 'Weekly visibility into work-system pressure with practical recommendations.',
    description: 'Best for HR, People Ops, and team leaders who need ongoing visibility.',
    price: '€99',
    period: '/month',
    highlight: false,
    features: [
      'Weekly team reports',
      'Manager Load Signal',
      'Meeting Overload Signal',
      'Focus Fragmentation Signal',
      'Responsiveness Pressure Signal',
      'Recovery Risk Signal',
      'Intervention notes',
      'Email alerts',
      'Metadata-only reporting',
      'Team-level privacy rules',
    ],
    cta: 'Request demo',
  },
  {
    name: 'Leadership Signals',
    planKey: 'visibility',
    outcome: 'Organizational visibility across multiple teams.',
    description: 'Best for executives and leadership teams who need cross-team insight.',
    price: '€199',
    period: '/month',
    highlight: true,
    features: [
      'Everything in Team Signals, plus:',
      'Monthly leadership report',
      'Organizational risk summary',
      'Cross-team comparison',
      'Manager capacity view',
      'Execution Drag Signal',
      'Priority action list',
      'Before-and-after intervention tracking',
      'Leadership review notes',
      'Board-ready summary',
    ],
    cta: 'Request demo',
  },
  {
    name: 'Enterprise',
    planKey: null,
    outcome: 'Custom security, compliance, integration, and reporting.',
    description: 'Best for larger organizations with advanced requirements.',
    price: 'Custom',
    period: '',
    highlight: false,
    features: [
      'Everything in Leadership Signals, plus:',
      'Custom integrations',
      'Custom thresholds',
      'SSO, if required',
      'Advanced access controls',
      'Dedicated onboarding',
      'Custom reporting structure',
      'Data retention controls',
      'Security review support',
      'Quarterly leadership review',
    ],
    cta: 'Contact sales',
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  /**
   * Handles plan selection:
   * - Logged-in users  → call checkout API → redirect to Stripe
   * - Unauthenticated  → /register?plan=<planKey> (Register will trigger checkout after signup)
   * - Resilience (custom) → /contact
   */
  const handleCheckout = async (planKey: string | null) => {
    if (!planKey) {
      navigate('/contact');
      return;
    }
    setCheckoutError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      navigate(`/register?plan=${planKey}`);
      return;
    }
    setLoadingPlan(planKey);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const res = await fetch(`${apiUrl}/api/billing/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Checkout failed');
      window.location.href = data.url;
    } catch (err: unknown) {
      setCheckoutError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-white border-b border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold text-[#1D4ED8] uppercase tracking-wider mb-4">
                Pricing
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6 text-[#0F172A]">
                Pricing that matches how ready{' '}
                <span className="text-[#1D4ED8]">you are to act.</span>
              </h1>
              <p className="text-xl text-[#334155] max-w-2xl mx-auto mb-6">
                Use SignalTrue as an always-on early warning system or start with a focused workload
                scan to see where pressure is building.
              </p>
              <div className="mt-6 p-6 rounded-2xl bg-[#F1F5F9] border border-[#E2E8F0] max-w-2xl mx-auto">
                <p className="text-lg text-[#0F172A] font-medium">
                  Start with visibility. Continue with action.
                </p>
                <p className="text-[#475569] mt-2">
                  Start with a workload scan. See where pressure is building, then decide whether
                  SignalTrue should stay on continuously.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-20 lg:py-24 bg-[#F8FAFC]">
          <div className="container mx-auto px-6">
            {checkoutError && (
              <div className="max-w-xl mx-auto mb-8 p-4 rounded-lg bg-[#FEE2E2] border border-[#B91C1C]/20 text-[#B91C1C] text-sm text-center">
                {checkoutError}
              </div>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
              {tiers.map((tier, index) => {
                const isLoading = loadingPlan === tier.planKey;
                return (
                  <div
                    key={index}
                    className={`relative rounded-2xl p-8 animate-slide-up bg-white ${
                      tier.highlight
                        ? 'border-2 border-[#1D4ED8] shadow-[0_20px_40px_rgba(15,23,42,0.08)]'
                        : 'border border-[#E2E8F0] shadow-[0_8px_24px_rgba(15,23,42,0.04)]'
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {tier.highlight && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="px-4 py-1.5 rounded-full bg-[#1D4ED8] text-white text-sm font-medium">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-2xl font-display font-bold text-[#0F172A] mb-2">
                        {tier.name}
                      </h3>
                      <p className="text-base text-[#1D4ED8] font-medium mb-2">{tier.outcome}</p>
                      <p className="text-sm text-[#475569]">{tier.description}</p>
                    </div>

                    <div className="mb-6">
                      <span className="text-4xl font-display font-bold text-[#0F172A]">
                        {tier.price}
                      </span>
                      <span className="text-[#475569]">{tier.period}</span>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-[#047857] flex-shrink-0" />
                          <span className="text-sm text-[#334155]">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={tier.highlight ? 'cta' : 'outline'}
                      className="w-full"
                      size="lg"
                      disabled={!!loadingPlan}
                      onClick={() => {
                        trackEvent('pricing_cta_clicked');
                        handleCheckout(tier.planKey);
                      }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Redirecting to checkout…
                        </>
                      ) : (
                        <>
                          {tier.cta}
                          {tier.highlight && <ArrowRight className="w-4 h-4 ml-2" />}
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Free Diagnostic nudge */}
        <section className="py-10 bg-white border-t border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0]">
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm font-semibold text-[#047857] uppercase tracking-wide mb-1">
                  Not sure yet?
                </p>
                <p className="text-[#0F172A] font-medium">Take the free diagnostic first.</p>
                <p className="text-sm text-[#334155] mt-1">
                  8 questions. 7 minutes. Get your organization's drift score instantly — no
                  integrations, no commitment.
                </p>
              </div>
              <Link to="/drift-diagnostic" className="flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#047857] text-[#047857] hover:bg-[#D1FAE5] whitespace-nowrap"
                >
                  Free diagnostic →
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Trust Strip */}
        <section className="py-16 bg-white border-y border-[#E2E8F0]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D1FAE5] border border-[#A7F3D0] mb-6">
                <Shield className="w-4 h-4 text-[#047857]" />
                <span className="text-sm font-medium text-[#047857]">
                  All plans are team-level by architecture
                </span>
              </div>
              <p className="text-[#475569]">
                No message content access. No individual scoring. Aggregated reports only. Your
                privacy rules apply.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-[#F8FAFC]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6 text-[#0F172A]">
                Not sure which plan fits?
              </h2>
              <p className="text-lg text-[#334155] mb-8 max-w-xl mx-auto">
                Start with a workload scan. See where pressure is building, then decide whether
                SignalTrue should stay on continuously.
              </p>
              <Link to="/contact" onClick={() => trackEvent('demo_requested')}>
                <Button variant="hero" size="xl">
                  Request demo
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
