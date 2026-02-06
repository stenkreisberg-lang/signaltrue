import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import WhyOrganizationsGoBlind from "../components/WhyOrganizationsGoBlind";
import CategoryDeclaration from "../components/CategoryDeclaration";
import JTBDSection from "../components/JTBDSection";
import PromisedLand from "../components/PromisedLand";
import PrivacySection from "../components/PrivacySection";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";

/*
 * CATEGORY: BEHAVIORAL DRIFT INTELLIGENCE
 * 
 * Homepage Flow (per spec):
 * 1. Hero - Category creation + conviction in <10 seconds
 * 2. Problem (Enemy) - The Problem With How Teams Are Measured Today
 * 3. Category Declaration - Introducing Behavioral Drift Intelligence
 * 4. JTBD - Leaders Hire SignalTrue To Do One Thing
 * 5. Promised Land - What Changes When You See Drift Early
 * 6. Privacy - Privacy Is the Constraint
 * 7. Final CTA - You Don't Need Another Survey. You Need Earlier Truth.
 */

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <WhyOrganizationsGoBlind />
        <CategoryDeclaration />
        <JTBDSection />
        <PromisedLand />
        <PrivacySection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
