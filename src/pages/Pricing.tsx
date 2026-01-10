import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, HelpCircle, X } from "lucide-react";

const plans = [
  {
    name: "Team Intelligence",
    description: "For HR teams managing tactical work health",
    price: "€99",
    period: "/month",
    highlight: false,
    features: [
      "Weekly team health reports",
      "Monthly HR reports (aggregated metrics)",
      "Tactical AI recommendations (7-14 day horizon)",
      "Max 3 actions per report",
      "Manager and HR admin access",
      "Email + Slack notifications",
      "Unlimited employees",
    ],
    notIncluded: [
      "No industry benchmarks",
      "No strategic synthesis",
    ],
    cta: "Start Trial",
    link: "https://app.signaltrue.ai/register?plan=team",
  },
  {
    name: "Leadership Intelligence",
    description: "For executives making organizational decisions",
    price: "€199",
    period: "/month",
    highlight: true,
    features: [
      "Everything in Team Intelligence, plus:",
      "Monthly leadership reports (CEO/Board only)",
      "Strategic AI synthesis (60-120 day horizon)",
      "Organizational trajectory analysis",
      "Industry benchmarks & peer comparison",
      "Structural risk identification",
      "Leadership decision prompts",
      "No individual names in reports",
      "Unlimited employees",
    ],
    notIncluded: [],
    cta: "Start Trial",
    link: "https://app.signaltrue.ai/register?plan=leadership",
  },
  {
    name: "Organizational Intelligence",
    description: "Enterprise-grade with custom models",
    price: "Custom",
    period: "",
    highlight: false,
    features: [
      "Everything in Leadership Intelligence, plus:",
      "Board-level quarterly reviews",
      "Custom AI models & prompts",
      "Custom thresholds & alerts",
      "Unlimited leadership roles",
      "Dedicated success manager",
      "SLA guarantees",
      "On-premise deployment option",
    ],
    notIncluded: [],
    cta: "Contact Sales",
    link: "mailto:sales@signaltrue.com?subject=Organizational Intelligence Inquiry",
  },
];

const faqs = [
  {
    question: "Why power-based pricing?",
    answer: "SignalTrue pricing controls who sees what, what level of synthesis exists, and whether insights are tactical or strategic. Pay for the authority level you need, not the number of employees.",
  },
  {
    question: "What's the difference between Tactical and Strategic AI?",
    answer: "Tactical AI (Team plan) provides 7-14 day action recommendations for HR and managers. Strategic AI (Leadership plan) synthesizes 60-120 day organizational patterns and decision prompts for CEOs and Board members.",
  },
  {
    question: "Can HR see the Leadership reports?",
    answer: "No. Leadership reports are strictly separated and only accessible to CEO/BOARD roles. This ensures strategic synthesis stays confidential while HR gets tactical insights for their work.",
  },
  {
    question: "Are individual names ever shown in reports?",
    answer: "Team Intelligence shows aggregated metrics only. Leadership Intelligence validates that zero individual names appear in CEO/Board reports. All insights are pattern-based, not person-based.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes. You can upgrade or downgrade at any time. Upgrades unlock new features immediately. Downgrades take effect at your next billing cycle with appropriate access revocation.",
  },
];

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-20" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Pricing
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                Pay for <span className="text-gradient">power, not volume</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                SignalTrue pricing controls <strong>who sees what</strong>, <strong>what level of synthesis exists</strong>, and <strong>whether insights are tactical or strategic</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
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
                    onClick={() => window.location.href = plan.link}
                  >
                    {plan.cta}
                    {plan.highlight && <ArrowRight className="w-4 h-4 ml-2" />}
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
              <Button variant="hero" size="xl" onClick={() => window.location.href = 'mailto:sales@signaltrue.com'}>
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
