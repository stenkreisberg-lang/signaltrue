import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
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
          <h1 style={styles.title}>Privacy Policy</h1>
          <p style={styles.subtitle}>Effective date: November 1, 2025</p>
        </div>
      </header>

      <main style={styles.section}> 
        <div style={styles.container}> 
          <div style={styles.card}> 
            <Block title="Overview">
              <p>
                This Privacy Policy explains how SignalTrue ("we", "our", or "us") collects, uses, and protects information
                in connection with our services (the "Services"). Our design is privacy-first: individual outputs are directional
                (e.g., up/down trends) rather than disclosing exact values or raw message content. Organizational views are
                aggregated and privacy-preserving.
              </p>
            </Block>

            <Block title="Information We Collect">
              <ul>
                <li><b>Account & Organization Data</b>: name, email, organization name/slug, role, and settings you provide.</li>
                <li><b>Integration Data</b>: metadata from connected systems (e.g., Slack, calendars), such as timestamps and volumes.
                  We avoid storing raw message content by default and never expose verbatim content in outputs.</li>
                <li><b>Usage Data</b>: app interactions, device/browser information, and diagnostics to improve reliability.</li>
                <li><b>Billing Data</b>: payment method and subscription details are processed by our payment provider (e.g., Stripe).
                  We do not store full card numbers.</li>
              </ul>
            </Block>

            <Block title="How We Use Information">
              <ul>
                <li>Provide and improve the Services, including analytics, dashboards, and wellness insights.</li>
                <li>Generate <b>directional, per-person indicators</b> (e.g., measures trending up/down vs. prior periods).</li>
                <li>Create <b>aggregated</b> organizational views that do not reveal exact employer-specific metrics.</li>
                <li>Maintain security, prevent abuse, and ensure service reliability.</li>
                <li>Communicate important updates, feature changes, and support notices.</li>
              </ul>
            </Block>

            <Block title="No Exact Employer-Specific Disclosures">
              <ul>
                <li>No raw message content is exposed in outputs.</li>
                <li>No exact counts, verbatim content, or precise employer-specific metrics are disclosed to end users.</li>
                <li>Per-person outputs are directional (up/down) and comparative to the individual’s own prior baselines.</li>
                <li>No cross-employer comparisons are provided.</li>
              </ul>
            </Block>

            <Block title="Legal Bases (where applicable)">
              <ul>
                <li>Performance of a contract (to deliver the Services).</li>
                <li>Legitimate interests (to improve, secure, and provide insights responsibly).</li>
                <li>Consent (for optional features or data sources where required).</li>
                <li>Compliance with legal obligations.</li>
              </ul>
            </Block>

            <Block title="Data Sharing & Processors">
              <ul>
                <li><b>Service Providers</b>: we use trusted sub-processors for hosting, email, analytics, and payments (e.g., Stripe).
                  These parties are bound by confidentiality and data protection obligations.</li>
                <li><b>Legal & Safety</b>: we may disclose information if required by law or to protect rights, safety, or integrity of the Services.</li>
                <li>We do not sell personal information.</li>
              </ul>
            </Block>

            <Block title="Security">
              <ul>
                <li>Industry-standard technical and organizational measures are applied to protect information.</li>
                <li>Access is restricted to authorized personnel and secure authentication is enforced for integrations.</li>
              </ul>
            </Block>

            <Block title="Data Retention">
              <ul>
                <li>We retain information for as long as necessary to provide the Services and meet legal obligations.</li>
                <li>Aggregated/De-Identified data may be retained to improve models and benchmarks without identifying individuals or employers.</li>
              </ul>
            </Block>

            <Block title="Your Choices & Rights">
              <ul>
                <li>Access, correction, deletion: contact us to exercise rights under applicable laws.</li>
                <li>Integrations may be disconnected at any time by an authorized admin.</li>
                <li>Marketing communications: you can opt out via unsubscribe links in emails.</li>
              </ul>
            </Block>

            <Block title="International Transfers">
              <p>
                If information is transferred across borders, we use appropriate safeguards such as standard contractual clauses and
                data processing agreements with sub-processors.
              </p>
            </Block>

            <Block title="Children’s Data">
              <p>
                The Services are not directed to children under 16 and we do not knowingly collect their personal information.
              </p>
            </Block>

            <Block title="Changes to this Policy">
              <p>
                We may update this Privacy Policy from time to time. We will post the updated version with a new effective date.
              </p>
            </Block>

            <Block title="Contact Us">
              <p>
                Questions about this policy? Contact: privacy@signaltrue.com
              </p>
            </Block>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerSection}>
            <h4 style={styles.footerHeading}>Legal</h4>
            <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
            <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
          </div>
          <div style={styles.footerSection}>
            <h4 style={styles.footerHeading}>Company</h4>
            <Link to="/about" style={styles.footerLink}>About</Link>
            <Link to="/contact" style={styles.footerLink}>Contact</Link>
          </div>
        </div>
        <div style={styles.footerBottom}>
          <p>©2025 SignalTrue. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function Block({ title, children }) {
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

  footer: { background: '#111827', color: 'white', padding: '3rem 2rem 2rem', marginTop: '3rem' },
  footerContent: { maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2rem' },
  footerSection: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  footerHeading: { fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' },
  footerLink: { color: '#9ca3af', textDecoration: 'none', fontSize: '0.95rem' },
  footerBottom: { maxWidth: '1000px', margin: '0 auto', paddingTop: '2rem', borderTop: '1px solid #374151', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' },
};
