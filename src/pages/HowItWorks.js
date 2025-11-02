import React from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';

function HowItWorks() {
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
            <Link to="/login" style={styles.loginBtn}>Login</Link>
          </div>
        </div>
      </nav>

      <section style={styles.hero}>
        <div style={styles.container}>
          <h1 style={styles.heroTitle}>How Our Workforce Insights Engine™ Works</h1>
          <p style={styles.heroSubtitle}>
            The technology behind SignalTrue's proactive burnout detection and team health insights.
          </p>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Fast, Frictionless & Hassle-Free Implementation</h2>
          <p style={styles.introText}>
            Getting started with SignalTrue requires no invasive integrations, confidential data access,
            or time from your IT department. Most companies are fully set up in under 5 minutes.
          </p>

          <div style={styles.stepsGrid}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <h3 style={styles.stepTitle}>Connect Your Tools</h3>
              <p style={styles.stepText}>
                One-click OAuth integration with Slack, Microsoft Teams, Google Calendar, and Outlook.
                We only request read-only permissions for metadata analysis.
              </p>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <h3 style={styles.stepTitle}>Initial Analysis</h3>
              <p style={styles.stepText}>
                Our AI begins analyzing patterns immediately. Within 24 hours, you'll see your first insights
                and burnout risk scores for your team.
              </p>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <h3 style={styles.stepTitle}>Continuous Monitoring</h3>
              <p style={styles.stepText}>
                SignalTrue continuously updates insights in real-time, sending proactive alerts when risk
                scores change or concerning patterns emerge.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>The Secret to Our Algorithm</h2>
          <p style={styles.introText}>
            SignalTrue's proprietary Workforce Insights Engine™ continuously processes behavioral signals
            to unlock valuable workforce trends and employee-specific burnout risk predictions.
          </p>

          <div style={styles.dataSourcesGrid}>
            <div style={styles.dataSource}>
              <div style={styles.dataIcon}>💬</div>
              <h3 style={styles.dataTitle}>Communication Data</h3>
              <p style={styles.dataText}>
                We analyze message frequency, response times, sentiment patterns, and participation rates
                without reading private message content. Sentiment is calculated using linguistic metadata only.
              </p>
              <ul style={styles.dataList}>
                <li>Message timing patterns</li>
                <li>Response rate trends</li>
                <li>Sentiment scoring (content-agnostic)</li>
                <li>Channel participation metrics</li>
                <li>After-hours activity detection</li>
              </ul>
            </div>

            <div style={styles.dataSource}>
              <div style={styles.dataIcon}>📅</div>
              <h3 style={styles.dataTitle}>Calendar Data</h3>
              <p style={styles.dataText}>
                Calendar analysis provides insights into meeting load, focus time, and schedule fragmentation.
                We analyze event metadata only—never reading event titles or descriptions.
              </p>
              <ul style={styles.dataList}>
                <li>Meeting hours per week</li>
                <li>Focus time availability</li>
                <li>Calendar fragmentation</li>
                <li>After-hours meetings</li>
                <li>Meeting participant patterns</li>
              </ul>
            </div>

            <div style={styles.dataSource}>
              <div style={styles.dataIcon}>🤝</div>
              <h3 style={styles.dataTitle}>Collaboration Patterns</h3>
              <p style={styles.dataText}>
                Network analysis reveals collaboration strength, cross-team relationships, and isolation risks.
                All comparisons are anonymized to protect individual privacy.
              </p>
              <ul style={styles.dataList}>
                <li>Peer interaction frequency</li>
                <li>Cross-functional collaboration</li>
                <li>Social network position</li>
                <li>Team cohesion metrics</li>
                <li>Isolation indicators</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Privacy & Security First</h2>
          <p style={styles.introText}>
            SignalTrue is designed with privacy at its core. We analyze behavioral patterns and metadata
            without accessing private content.
          </p>

          <div style={styles.privacyGrid}>
            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>🔒</div>
              <h3 style={styles.privacyTitle}>Content-Agnostic Analysis</h3>
              <p style={styles.privacyText}>
                We never read message content or event details. Sentiment analysis uses linguistic patterns
                and metadata only, ensuring complete privacy.
              </p>
            </div>

            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>🛡️</div>
              <h3 style={styles.privacyTitle}>Enterprise Security</h3>
              <p style={styles.privacyText}>
                SOC 2 Type II compliant infrastructure with end-to-end encryption, role-based access controls,
                and regular security audits.
              </p>
            </div>

            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>✅</div>
              <h3 style={styles.privacyTitle}>GDPR & CCPA Compliant</h3>
              <p style={styles.privacyText}>
                Full compliance with global privacy regulations. Team members can request data deletion
                at any time through self-service controls.
              </p>
            </div>

            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>👤</div>
              <h3 style={styles.privacyTitle}>Anonymized Benchmarks</h3>
              <p style={styles.privacyText}>
                All peer comparisons and benchmarks are fully anonymized. Individual data is never
                shared in aggregate reports.
              </p>
            </div>

            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>🔐</div>
              <h3 style={styles.privacyTitle}>Read-Only Access</h3>
              <p style={styles.privacyText}>
                We only request read-only OAuth permissions. SignalTrue cannot send messages, modify
                calendars, or access confidential files.
              </p>
            </div>

            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>🎯</div>
              <h3 style={styles.privacyTitle}>Role-Based Visibility</h3>
              <p style={styles.privacyText}>
                Managers see insights for direct reports only. HR sees aggregated trends without
                individual details unless authorized.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>What We Don't Track</h2>
          <p style={styles.introText}>
            SignalTrue willfully ignores demographic data and sensitive personal information to reduce
            discriminatory biases and enable equitable team health management for all employees.
          </p>

          <div style={styles.exclusionGrid}>
            <div style={styles.exclusionCard}>❌ Gender</div>
            <div style={styles.exclusionCard}>❌ Ethnicity</div>
            <div style={styles.exclusionCard}>❌ Age</div>
            <div style={styles.exclusionCard}>❌ Message Content</div>
            <div style={styles.exclusionCard}>❌ Event Titles/Details</div>
            <div style={styles.exclusionCard}>❌ File Contents</div>
          </div>
        </div>
      </section>

      <section style={{...styles.section, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white'}}>
        <div style={styles.container}>
          <h2 style={{...styles.sectionTitle, color: 'white'}}>Ready to See It in Action?</h2>
          <p style={{...styles.introText, color: 'rgba(255,255,255,0.9)', marginBottom: '2rem'}}>
            Experience the power of AI-driven team health insights.
          </p>
          <Link to="/contact" style={{...styles.primaryBtn, background: 'white', color: '#6366f1'}}>Request A Demo</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
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
  loginBtn: { padding: '0.5rem 1.5rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' },
  hero: { padding: '5rem 2rem', background: 'linear-gradient(to bottom, #f9fafb, white)', textAlign: 'center' },
  container: { maxWidth: '1200px', margin: '0 auto' },
  heroTitle: { fontSize: '3rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' },
  heroSubtitle: { fontSize: '1.25rem', color: '#6b7280', marginBottom: '2.5rem', maxWidth: '800px', margin: '0 auto 2.5rem', lineHeight: 1.6 },
  primaryBtn: { padding: '0.875rem 2rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '1rem', display: 'inline-block' },
  section: { padding: '5rem 2rem' },
  sectionTitle: { fontSize: '2.5rem', fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: '1.5rem' },
  introText: { fontSize: '1.125rem', color: '#6b7280', lineHeight: 1.7, maxWidth: '900px', margin: '0 auto 3rem', textAlign: 'center' },
  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', marginTop: '3rem' },
  step: { textAlign: 'center' },
  stepNumber: { width: '80px', height: '80px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: '700', margin: '0 auto 1.5rem' },
  stepTitle: { fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' },
  stepText: { color: '#6b7280', lineHeight: 1.7 },
  dataSourcesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginTop: '3rem' },
  dataSource: { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '2rem' },
  dataIcon: { fontSize: '3rem', marginBottom: '1rem' },
  dataTitle: { fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' },
  dataText: { color: '#6b7280', lineHeight: 1.6, marginBottom: '1.5rem' },
  dataList: { color: '#6b7280', paddingLeft: '1.5rem', lineHeight: 1.8 },
  privacyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '3rem' },
  privacyCard: { background: '#f9fafb', borderRadius: '12px', padding: '2rem' },
  privacyIcon: { fontSize: '3rem', marginBottom: '1rem' },
  privacyTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' },
  privacyText: { color: '#6b7280', lineHeight: 1.6 },
  exclusionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '3rem' },
  exclusionCard: { background: 'white', border: '2px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', fontSize: '1.125rem', fontWeight: '600', color: '#ef4444' },
  // Footer styles moved to shared SiteFooter component
};

export default HowItWorks;
