import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { 
  ArrowRight,
  Heart,
  Target,
  Users,
  Lightbulb,
  Award,
  MapPin
} from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "People First",
    description: "Technology should serve humans, not the other way around. We build tools that protect employee wellbeing.",
  },
  {
    icon: Target,
    title: "Actionable Insights",
    description: "Data is only valuable if you can act on it. Every alert comes with clear next steps.",
  },
  {
    icon: Users,
    title: "Privacy by Design",
    description: "We believe transparency builds trust. Our privacy-first approach is non-negotiable.",
  },
  {
    icon: Lightbulb,
    title: "Continuous Learning",
    description: "The nature of work keeps changing. Our AI evolves with your organization.",
  },
];

const team = [
  {
    name: "Sarah Chen",
    role: "CEO & Co-founder",
    bio: "Former VP of People at Stripe. 15 years in HR tech and organizational psychology.",
  },
  {
    name: "Marcus Johnson",
    role: "CTO & Co-founder",
    bio: "Ex-Google ML engineer. PhD in behavioral analytics from Stanford.",
  },
  {
    name: "Emily Rodriguez",
    role: "Head of Product",
    bio: "Previously led product at Culture Amp. Passionate about employee experience.",
  },
  {
    name: "David Kim",
    role: "Head of Customer Success",
    bio: "10+ years helping enterprise HR teams transform their people operations.",
  },
];

const milestones = [
  { year: "2021", event: "Founded in San Francisco" },
  { year: "2022", event: "Seed funding from Andreessen Horowitz" },
  { year: "2022", event: "First 50 enterprise customers" },
  { year: "2023", event: "Series A, expanded to 150 employees" },
  { year: "2024", event: "SOC 2 Type II certification" },
  { year: "2024", event: "1,000+ teams protected" },
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
                About Us
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                We're on a mission to{" "}
                <span className="text-gradient">end workplace burnout</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                SignalTrue was founded by HR leaders and AI engineers who saw firsthand 
                how preventable burnout was destroying great teams.
              </p>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Our Story
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-8">
                Born from frustration, built with purpose
              </h2>
              <div className="space-y-6 text-lg text-muted-foreground">
                <p>
                  In 2021, our founders watched helplessly as three high-performing teams 
                  at their company burned out in six months. The warning signs were there — 
                  in Slack patterns, in calendar overload, in response time degradation — 
                  but nobody was looking at the data.
                </p>
                <p>
                  By the time managers noticed something was wrong, it was too late. 
                  Top performers had already updated their LinkedIn profiles. Exit interviews 
                  revealed the same story: "I was drowning, but nobody noticed."
                </p>
                <p>
                  We knew there had to be a better way. What if HR could see the warning 
                  signs weeks before burnout hit? What if you could intervene while there 
                  was still time to help?
                </p>
                <p className="text-foreground font-medium">
                  That's why we built SignalTrue — to give HR the early warning system 
                  they need to protect their people.
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
                Our Values
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold">
                What we believe
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
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

        {/* Team Section */}
        <section className="py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Leadership
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                Meet the team
              </h2>
              <p className="text-muted-foreground">
                HR veterans and AI engineers united by a common mission.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {team.map((member, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-2xl bg-card border border-border/50 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-20 h-20 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-center mb-1">
                    {member.name}
                  </h3>
                  <p className="text-sm text-primary text-center mb-3">
                    {member.role}
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    {member.bio}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                Our Journey
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold">
                Key milestones
              </h2>
            </div>

            <div className="max-w-2xl mx-auto">
              {milestones.map((milestone, index) => (
                <div 
                  key={index}
                  className="flex gap-6 pb-8 last:pb-0"
                >
                  <div className="flex-shrink-0 w-16">
                    <span className="text-sm font-semibold text-primary">{milestone.year}</span>
                  </div>
                  <div className="relative flex-1 pb-8 last:pb-0">
                    {index < milestones.length - 1 && (
                      <div className="absolute left-0 top-2 bottom-0 w-px bg-border -ml-[25px]" />
                    )}
                    <div className="absolute w-2 h-2 rounded-full bg-primary -ml-[29px] mt-1.5" />
                    <p className="text-foreground">{milestone.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Location Section */}
        <section className="py-24 bg-secondary/20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-12 items-center">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                    Where We Work
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                    Remote-first, globally distributed
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Our team of 150+ works from 12 countries. We believe in the future of 
                    distributed work — and we use our own product to keep our teams healthy.
                  </p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span>HQ in San Francisco, CA</span>
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <div className="aspect-video rounded-2xl bg-card border border-border/50 flex items-center justify-center">
                    <Award className="w-24 h-24 text-secondary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-glow opacity-30" />
          <div className="container mx-auto px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
                Join us in protecting workplace wellbeing
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Whether you're an HR leader or want to join our team, we'd love to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="hero" size="xl">
                  Book a Demo
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button variant="hero-outline" size="xl">
                  View Careers
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
