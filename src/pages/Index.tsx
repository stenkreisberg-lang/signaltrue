import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import WhyOrganizationsGoBlind from "../components/WhyOrganizationsGoBlind";
import SocialProofStats from "../components/SocialProofStats";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";

/*
 * CATEGORY REPOSITIONING NOTE:
 * This is not a visual polish task.
 * This is a category repositioning.
 * If a section feels "empty", "safe", or "generic", it's wrong.
 * Optimize for clarity and conviction over minimalism.
 * 
 * CRITICAL: No empty sections. No large unexplained gaps.
 * Every section must move the user's belief forward.
 */

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        {/* CRITICAL FIX: Fill the gap below hero - mandatory per spec */}
        <WhyOrganizationsGoBlind />
        <SocialProofStats />
        <Features />
        <HowItWorks />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
