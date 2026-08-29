import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import CustomerBand from '../components/CustomerBand';
import WhyOrganizationsGoBlind from '../components/WhyOrganizationsGoBlind';
import JTBDSection from '../components/JTBDSection';
import PromisedLand from '../components/PromisedLand';
import PrivacySection from '../components/PrivacySection';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';

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
      <PageMeta
        title="SignalTrue | Work-Pattern Evidence Between Psychosocial Risk Assessments"
        description="See when work starts changing with continuous, team-level evidence—without reading message bodies, diagnosing workers or scoring individual productivity."
        path="/"
      />
      <Navbar />
      <main>
        <Hero />
        <CustomerBand />
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
