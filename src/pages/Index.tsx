import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import CustomerBand from '../components/CustomerBand';
import WhyOrganizationsGoBlind from '../components/WhyOrganizationsGoBlind';
import VerificationProcess from '../components/VerificationProcess';
import WorkloadMigrationSection from '../components/WorkloadMigrationSection';
import PrivacySection from '../components/PrivacySection';
import SampleReportSection from '../components/SampleReportSection';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';
import PageMeta from '../components/PageMeta';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="SignalTrue | Psychosocial Control Effectiveness Evidence"
        description="Psychosocial assessment found the risk. SignalTrue helps WHS teams review whether an implemented control changed the work, whether the effect lasted and whether pressure moved elsewhere."
        path="/"
      />
      <Navbar />
      <main>
        <Hero />
        {/* Owner-approved customer/prospect/pilot proof. Do not remove without explicit approval. */}
        <CustomerBand />
        <WhyOrganizationsGoBlind />
        <VerificationProcess />
        <WorkloadMigrationSection />
        <PrivacySection />
        <SampleReportSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
