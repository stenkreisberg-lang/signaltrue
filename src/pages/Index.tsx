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
        title="SignalTrue | Verify Whether Workplace Controls Actually Worked"
        description="Compare work before and after a change, check whether improvement was sustained, and investigate possible workload migration with team-level metadata."
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
