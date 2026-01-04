import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { 
  ArrowRight,
  Heart,
  Target,
  Users
} from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "Trust and transparency",
    description: "Employees deserve clarity about what is collected and why.",
  },
  {
    icon: Target,
    title: "Action over dashboards",
    description: "Insights matter only if managers can use them to change outcomes.",
  },
  {
    icon: Users,
    title: "Privacy by design",
    description: "Team-level analytics only. No message content. No individual scoring.",
  },
];

const About = () => {
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
                About
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                We build team health tools that{" "}
                <span className="text-gradient">respect privacy</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                SignalTrue gives HR leading indicators of overload risk using team-level analytics, 
                without turning collaboration tools into surveillance.
              </p>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Why we built SignalTrue
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-8">
                Leading indicators for modern work
              </h2>
              <div className="space-y-6 text-lg text-muted-foreground">
                <p>
                  Teams drift into overload long before it shows up in engagement scores or exit interviews. 
                  The signals are often visible in meeting load, after-hours activity, and coordination friction. 
                  SignalTrue was built to make those patterns visible at team level, then guide action with a simple loop: 
                  Detect → Diagnose → Intervene → Measure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Our principles
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold">
                What we believe
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {values.map((value, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-2xl bg-card border border-border/50 text-center animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    {value.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {value.description}
                  </p>
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
                Talk to us
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                If you're exploring team-level leading indicators for HR, we'd love to show you how SignalTrue works.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="hero" size="xl">
                  Get a Demo
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button variant="hero-outline" size="xl">
                  See How It Works
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
