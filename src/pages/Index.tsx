import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import WhyOrganizationsGoBlind from "../components/WhyOrganizationsGoBlind";
import HowItWorks from "../components/HowItWorks";
import WhoThisIsFor from "../components/WhoThisIsFor";
import TrustSection from "../components/TrustSection";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";

/*
 * CATEGORY KING POSITIONING:
 * SignalTrue is a Causal Drift & Intervention Engine for Knowledge Work.
 * 
 * Flow: Hero → Enemy (The Problem) → How It Works → Who This Is For → Trust → CTA
 * 
 * Every section answers: What decision does this enable? What risk does this reduce?
 */

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <WhyOrganizationsGoBlind />
        <HowItWorks />
        <WhoThisIsFor />
        <TrustSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
