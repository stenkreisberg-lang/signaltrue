import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import WhyOrganizationsGoBlind from '../components/WhyOrganizationsGoBlind';
import JTBDSection from '../components/JTBDSection';
import PromisedLand from '../components/PromisedLand';
import PrivacySection from '../components/PrivacySection';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';

/*
 * Homepage flow per positioning brief:
 * 1. Hero – Detect manager overload before delivery slows down
 * 2. Problem – Teams rarely break suddenly. They slow down first.
 * 3. What SignalTrue detects
 * 4. What leaders can fix earlier
 * 5. Privacy by design
 * 6. Final CTA
 */

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <WhyOrganizationsGoBlind />
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
