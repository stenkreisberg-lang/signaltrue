import React from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';

export default function Terms() {
  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <Link to="/" style={styles.logoLink}>
            <img src="/logo-icon.svg" alt="SignalTrue" style={styles.logoImg} />
            <span style={styles.logoText}>SignalTrue</span>
          </Link>
          <div style={styles.navLinks}>
            <Link to="/product" style={styles.navLink}>Product</Link>
            <Link to="/pricing" style={styles.navLink}>Pricing</Link>
            <Link to="/about" style={styles.navLink}>About</Link>
            <Link to="/contact" style={styles.navLink}>Contact</Link>
          </div>
        </div>
      </nav>

      <header style={styles.header}> 
        <div style={styles.container}> 
          <h1 style={styles.title}>Terms of Service</h1>
          <p style={styles.subtitle}>Effective date: November 1, 2025</p>
        </div>
      </header>

      <main style={styles.section}> 
        <div style={styles.container}> 
          <div style={styles.card}> 
            <Section title="1) Agreement">
              <p>
                These Terms of Service ("Terms") govern your access to and use of SignalTrue's software, services, and websites (collectively, the "Services"). By using the Services, you agree to these Terms.
              </p>
            </Section>

            <Section title="2) Our Services">
              <p>
                SignalTrue analyzes communication and scheduling signals to help organizations monitor team wellness and performance rhythms. We provide directional insights and trend indicators that support healthy, sustainable work practices.
              </p>
            </Section>

            <Section title="3) Privacy-first Insights (No Exact Employer Data Disclosure)">
              <ul>
                <li>Per-person indicators are directional only (e.g., "up" or "down" compared to their own prior period) — not raw message counts, verbatim content, or exact employer-specific metrics.</li>
                <li>We do not disclose exact data values attributable to any employer, team, or individual. Organizational views are aggregated and privacy-preserving.</li>
                <li>Individual feedback focuses on trend movement and high-level categories (e.g., burnout risk rising/falling) without exposing granular message content or precise volumes.</li>
                <li>Cross-employer comparisons are never disclosed.</li>
              </ul>
            </Section>

            <Section title="4) Customer Data & Permissions">
              <ul>
                <li>You represent that you have obtained all necessary permissions to connect data sources (e.g., Slack, calendars).</li>
                <li>Customer Data remains yours. You grant SignalTrue a limited license to process it solely to provide and improve the Services.</li>
                <li>We may generate Aggregated/De-Identified data to enhance models and benchmarks, never to identify a person or employer.</li>
              </ul>
            </Section>

            <Section title="5) Data Security">
              <ul>
                <li>We apply industry-standard security measures to protect Customer Data.</li>
                <li>You are responsible for securing access tokens and restricting access to authorized users.</li>
              </ul>
            </Section>

            <Section title="6) Acceptable Use">
              <ul>
                <li>No attempts to re-identify, decompile, or extract raw message content beyond intended outputs.</li>
                <li>No use to make employment decisions without appropriate human review and lawful basis.</li>
                <li>No misuse, abuse, or disruption of the Services or underlying integrations.</li>
              </ul>
            </Section>

            <Section title="7) Subscriptions, Trials, Billing">
              <ul>
                <li>Paid plans auto-renew unless canceled per your billing settings.</li>
                <li>Trials may require a valid payment method and convert to paid at period end unless canceled.</li>
                <li>Fees are non-refundable except where required by law.</li>
              </ul>
            </Section>

            <Section title="8) Intellectual Property">
              <ul>
                <li>SignalTrue owns the Services and all related IP. These Terms grant no rights except as expressly stated.</li>
                <li>Customer Data is owned by you. Aggregated/De-Identified outputs derived from it may be used to improve the Services.</li>
              </ul>
            </Section>

            <Section title="9) Confidentiality">
              <ul>
                <li>Each party agrees to protect the other's confidential information and use it only as necessary to perform these Terms.</li>
              </ul>
            </Section>

            <Section title="10) Disclaimers">
              <ul>
                <li>The Services provide insights and recommendations for informational purposes only.</li>
                <li>We do not guarantee outcomes, and outputs may contain errors or be incomplete.</li>
              </ul>
            </Section>

            <Section title="11) Limitation of Liability">
              <ul>
                <li>To the maximum extent permitted by law, SignalTrue is not liable for indirect or consequential damages.</li>
                <li>Our total liability is limited to fees paid in the 12 months prior to the claim.</li>
              </ul>
            </Section>

            <Section title="12) Termination">
              <ul>
                <li>You may stop using the Services at any time. We may suspend or terminate access for violations of these Terms.</li>
                <li>Upon termination, your right to access the Services ends, but sections intended to survive will remain in effect.</li>
              </ul>
            </Section>

            <Section title="13) Modifications">
              <p>
                We may update these Terms from time to time. We will post the updated Terms with a new effective date. Continued use of the Services after changes means you accept the updated Terms.
              </p>
            </Section>

            <Section title="14) Contact">
              <p>
                Questions about these Terms? Contact us at support@signaltrue.com.
              </p>
            </Section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={styles.sectionBlock}>
      <h2 style={styles.h2}>{title}</h2>
      <div style={styles.content}>{children}</div>
    </section>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'white' },
  nav: { background: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 100 },
  navContent: { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoLink: { display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' },
  logoImg: { height: '32px', width: '32px' },
  logoText: { fontSize: '1.25rem', fontWeight: '700', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  navLinks: { display: 'flex', gap: '2rem', alignItems: 'center' },
  navLink: { color: '#4b5563', textDecoration: 'none', fontWeight: '500' },

  header: { padding: '4rem 2rem', background: 'linear-gradient(to bottom, #f9fafb, white)', textAlign: 'center' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  title: { fontSize: '2.5rem', fontWeight: '800', color: '#111827', marginBottom: '0.5rem' },
  subtitle: { fontSize: '1rem', color: '#6b7280' },

  section: { padding: '2rem' },
  card: { background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '2rem', boxShadow: '0 8px 20px rgba(0,0,0,0.04)' },
  sectionBlock: { marginBottom: '1.75rem' },
  h2: { fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.75rem' },
  content: { color: '#4b5563', lineHeight: 1.7 },

  // Footer styles moved to SiteFooter component
};
