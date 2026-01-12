import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import SocialProofStats from "../components/SocialProofStats";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import FitQuestionnaire from "../components/FitQuestionnaire";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";

// Analytics tracking function - can be connected to your analytics provider
const trackEvent = (eventName: string, data?: Record<string, unknown>) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${eventName}`, data);
  }
  
  // TODO: Connect to your analytics provider (e.g., Segment, Mixpanel, Google Analytics)
  // Example: window.analytics?.track(eventName, data);
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <SocialProofStats />
        <Features />
        <HowItWorks />
        <FitQuestionnaire onTrackEvent={trackEvent} />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
