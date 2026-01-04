import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { CheckCircle, ArrowRight, HelpCircle } from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "For small pilots getting started with team health signals",
    price: "€99",
    period: "/month",
    highlight: false,
    features: [
      "Up to 50 employees",
      "Slack integration",
      "Weekly signals and reports",
      "Email alerts",
      "Basic dashboards",
      "Email support",
    ],
    cta: "Start Pilot",
  },
  {
    name: "Professional",
    description: "For growing organizations that need deeper signals and comparisons",
    price: "€199",
    period: "/month",
    highlight: true,
    features: [
      "Up to 250 employees",
      "Slack + Google Calendar",
      "Weekly signals and trend monitoring",
      "Custom alert thresholds",
      "Team comparisons",
      "API access",
      "Priority support",
    ],
    cta: "Start Pilot",
  },
  {
    name: "Enterprise",
    description: "For larger organizations with advanced security and rollout needs",
    price: "Custom",
    period: "",
    highlight: false,
    features: [
      "Unlimited employees",
      "All integrations available",
      "Custom reporting",
      "SSO & SCIM",
      "Dedicated support",
      "SLA options",
      "On-premise option",
    ],
    cta: "Contact Sales",
  },
];

const faqs = [
  {
    question: "Do you track individuals?",
    answer: "No. SignalTrue shows team-level analytics only and enforces minimum team-size thresholds.",
  },
  {
    question: "Do you read message content?",
    answer: "No. We analyze patterns and metadata, not message content.",
  },
  {
    question: "What data do you collect?",
    answer: "Team-level collaboration and calendar patterns needed to compute signals like meeting load, after-hours activity, focus time, and response trends.",
  },
  {
    question: "Is SignalTrue GDPR compliant?",
    answer: "SignalTrue is built for GDPR-first organizations. We provide clear data processing terms and deletion controls.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes. You can upgrade or downgrade at any time. Changes apply from the next billing cycle.",
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
                Pricing that scales with rollout,{" "}
                <span className="text-gradient">not surveillance</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Start with a pilot, then expand. All plans include privacy-first team-level analytics.
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

        {/* Pilot Recommendation Section */}
        <section className="py-16 bg-secondary/10">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-display font-bold mb-4">
                Recommended pilot approach
              </h2>
              <p className="text-lg text-muted-foreground">
                Most teams start with a 4-week pilot across 2 to 4 teams to establish baselines 
                and test interventions with measurable outcomes.
              </p>
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
                Need help choosing a plan?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                We'll recommend a pilot size and rollout approach based on your tools and org structure.
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
