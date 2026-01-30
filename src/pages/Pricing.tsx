import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { CheckCircle, ArrowRight, HelpCircle, X, Gift, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../utils/api";

/*
 * CATEGORY KING POSITIONING:
 * Pricing reflects decision scope, not surveillance.
 * Plans scale by number of teams under active drift management 
 * and decision authority, not by tracking intensity.
 */

const plans = [
  {
    name: "Detect",
    planId: "visibility",
    description: "Detect behavioral drift at team level",
    subtitle: "Early warning on team patterns",
    price: "€99",
    period: "/month",
    highlight: false,
    features: [
      "Weekly drift detection reports",
      "Team-level pattern analysis",
      "Baseline deviation alerts",
      "Manager and HR admin access",
      "Email notifications",
      "Unlimited team members",
    ],
    notIncluded: [
      "No causal explanation",
      "No intervention tracking",
    ],
    cta: "Start Free Trial",
    isCheckout: true,
  },
  {
    name: "Explain + Act",
    planId: "interpretation",
    description: "Understand causes and take action",
    subtitle: "Causal explanation and intervention recommendations",
    price: "€199",
    period: "/month",
    highlight: true,
    features: [
      "Everything in Detect, plus:",
      "Causal driver attribution",
      "Intervention recommendations",
      "Expected effect estimates",
      "Monthly leadership summaries",
      "Industry benchmarks",
      "Structural risk identification",
      "No individual names in reports",
    ],
    notIncluded: [],
    cta: "Start Free Trial",
    isCheckout: true,
  },
  {
    name: "Measure + Learn",
    planId: "enterprise",
    description: "Prove what worked and improve over time",
    subtitle: "Full outcome measurement and learning loop",
    price: "Custom",
    period: "",
    highlight: false,
    features: [
      "Everything in Explain + Act, plus:",
      "Intervention outcome tracking",
      "Before/after effect measurement",
      "Continuous learning from results",
      "Board-level quarterly reviews",
      "Custom signal models",
      "Dedicated success manager",
      "SLA guarantees",
    ],
    notIncluded: [],
    cta: "Contact Sales",
    isCheckout: false,
    link: "mailto:sales@signaltrue.ai?subject=Measure + Learn Plan Inquiry",
  },
];

const faqs = [
  {
    question: "Why this pricing model?",
    answer: "SignalTrue pricing reflects decision scope, not surveillance intensity. Pay for the level of causal insight and intervention support you need, not the number of employees being monitored.",
  },
  {
    question: "What's the difference between plan levels?",
    answer: "Detect finds drift. Explain + Act tells you why and what to do. Measure + Learn proves what worked. Each level deepens your ability to make evidence-backed decisions.",
  },
  {
    question: "Can HR see the Leadership reports?",
    answer: "No. Leadership reports are strictly separated and only accessible to CEO/BOARD roles. This ensures strategic synthesis stays confidential while HR gets tactical insights for their work.",
  },
  {
    question: "Are individual names ever shown in reports?",
    answer: "Never. All plans show aggregated signals only. All insights are pattern-based, not person-based.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes. You can upgrade or downgrade at any time. Upgrades unlock new features immediately. Downgrades take effect at your next billing cycle.",
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  
  const handlePlanClick = async (plan: typeof plans[0]) => {
    // For enterprise/contact sales
    if (plan.link) {
      if (plan.link.startsWith('mailto:')) {
        window.location.href = plan.link;
      } else {
        navigate(plan.link);
      }
      return;
    }
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    
    if (!token) {
      // Not logged in - redirect to register with plan
      navigate(`/register?plan=${plan.planId}`);
      return;
    }
    
    // User is logged in - create checkout session
    if (plan.isCheckout) {
      try {
        setLoading(plan.planId);
        const response = await api.post('/billing/create-checkout-session', {
          plan: plan.planId,
        });
        
        if (response.data.url) {
          window.location.href = response.data.url;
        }
      } catch (error: any) {
        console.error('Checkout error:', error);
        // If billing not configured, redirect to register
        if (error.response?.status === 503) {
          navigate(`/register?plan=${plan.planId}`);
        } else {
          alert('Unable to start checkout. Please try again.');
        }
      } finally {
        setLoading(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-20" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              {/* Trial Banner */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/30 text-success mb-6">
                <Gift className="w-4 h-4" />
                <span className="font-medium">First month free. No credit card required.</span>
              </div>
              
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Pricing
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                Pay for <span className="text-gradient">clarity, not headcount</span>
              </h1>
              
              {/* Pricing Philosophy Block - per spec */}
              <div className="mt-8 p-6 rounded-2xl bg-background/50 border border-border/50 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Eye className="w-5 h-5 text-primary" />
                  <span className="font-display font-semibold text-foreground">Pricing Philosophy</span>
                </div>
                <p className="text-muted-foreground">
                  SignalTrue pricing reflects <strong className="text-foreground">clarity and early insight</strong>, not headcount monitoring. 
                  Each plan answers: <em>What level of organizational clarity does this unlock?</em>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-20 lg:py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            {/* Trial info note above cards */}
            <div className="max-w-6xl mx-auto mb-8">
              <p className="text-center text-sm text-muted-foreground">
                Includes full dashboard access and first monthly report. Payment required to continue insights and recommendations.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan, index) => (
                <div 
                  key={index}
                  className={`relative rounded-2xl p-8 animate-slide-up ${
                    plan.highlight 
                      ? 'bg-card border-2 border-primary shadow-glow'
                      : 'bg-card border border-border/50'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {plan.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-display font-bold text-foreground mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-display font-bold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                    {plan.notIncluded.map((feature, i) => (
                      <li key={`not-${i}`} className="flex items-center gap-3 opacity-50">
                        <X className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    variant={plan.highlight ? "cta" : "outline"}
                    className="w-full"
                    size="lg"
                    onClick={() => handlePlanClick(plan)}
                    disabled={loading === plan.planId}
                  >
                    {loading === plan.planId ? 'Loading...' : plan.cta}
                    {plan.highlight && !loading && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                FAQ
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                Frequently asked questions
              </h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-6">
              {faqs.map((faq, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-2xl bg-card border border-border/50"
                >
                  <div className="flex items-start gap-4">
                    <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-display font-semibold text-foreground mb-2">
                        {faq.question}
                      </h3>
                      <p className="text-muted-foreground">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-30" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
                Ready to see your organizational signals?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Request a demo to see how SignalTrue turns coordination patterns into actionable signals.
              </p>
              <Button variant="hero" size="xl" onClick={() => window.location.href = 'mailto:sales@signaltrue.ai'}>
                Schedule a Call
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
