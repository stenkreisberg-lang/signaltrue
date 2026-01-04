import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { CheckCircle, ArrowRight, HelpCircle } from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "For small teams getting started with team health monitoring",
    price: "€99",
    period: "/month",
    highlight: false,
    features: [
      "Up to 50 employees",
      "Slack integration",
      "Weekly health reports",
      "Email alerts",
      "Basic dashboards",
      "Email support",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Professional",
    description: "For growing organizations that need deeper insights",
    price: "€199",
    period: "/month",
    highlight: true,
    features: [
      "Up to 250 employees",
      "Slack + Google Calendar",
      "Real-time monitoring",
      "Custom alert thresholds",
      "Team comparison benchmarks",
      "API access",
      "Priority support",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    description: "For large organizations with advanced security needs",
    price: "Custom",
    period: "",
    highlight: false,
    features: [
      "Unlimited employees",
      "All integrations",
      "Predictive analytics",
      "Custom reporting",
      "SSO & SCIM",
      "Dedicated CSM",
      "SLA guarantee",
      "On-premise option",
    ],
    cta: "Contact Sales",
  },
];

const faqs = [
  {
    question: "How does the free trial work?",
    answer: "You get 14 days of full access to all features in your chosen plan. No credit card required. Cancel anytime with no obligation.",
  },
  {
    question: "What data do you collect?",
    answer: "We only collect team-level behavioral patterns from Slack and Calendar. We never read message content or track individuals. All data is anonymized and aggregated.",
  },
  {
    question: "Is SignalTrue GDPR compliant?",
    answer: "Yes. We're fully GDPR compliant with data processing agreements, EU data residency options, and the right to deletion for all data.",
  },
  {
    question: "Can I change plans later?",
    answer: "Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.",
  },
  {
    question: "Do you offer discounts for non-profits?",
    answer: "Yes! Non-profits and educational institutions get 30% off all plans. Contact us to apply the discount.",
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
                Simple, transparent{" "}
                <span className="text-gradient">pricing</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Start free, scale as you grow. All plans include a 14-day free trial 
                with no credit card required.
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
                  </ul>

                  <Button 
                    variant={plan.highlight ? "cta" : "outline"} 
                    className="w-full"
                    size="lg"
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
                Still have questions?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Our team is happy to walk you through SignalTrue and answer any questions.
              </p>
              <Button variant="hero" size="xl">
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
