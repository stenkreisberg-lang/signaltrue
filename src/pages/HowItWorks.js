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
          <h1 style={styles.heroTitle}>How SignalTrue Works</h1>
          <p style={styles.heroSubtitle}>
            8 signals. Drift explainability. Micro-playbooks. Privacy-first architecture. See team health in 48 hours.
          </p>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Fast, Frictionless & Hassle-Free Setup</h2>
          <p style={styles.introText}>
            OAuth with Slack, Google, Microsoft. Tokens encrypted (AES-256). Regional data residency (EU/US). Team-level aggregation by default. No IT department needed. Most companies are live in 5 minutes.
          </p>

          <div style={styles.stepsGrid}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <h3 style={styles.stepTitle}>Connect Your Tools</h3>
              <p style={styles.stepText}>
                One-click OAuth with Slack, Google, Microsoft. Read-only metadata access. Tokens encrypted (AES-256-GCM) and stored with regional residency (EU/US). No invasive permissions.
              </p>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <h3 style={styles.stepTitle}>Baseline in 24 Hours</h3>
              <p style={styles.stepText}>
                Background jobs compute 7-day rolling baselines for 8 core metrics: sentiment, latency, meetings, after-hours, network, focus, recovery, Energy Index. Adaptive thresholds per team.
              </p>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <h3 style={styles.stepTitle}>Drift Alerts with Explainability</h3>
              <p style={styles.stepText}>
                When Energy Index dips &gt;15%, alerts fire with top 3 contributors (e.g., "tone ↓15%, meetings ↑22%") + micro-playbook recommendation. Alert frequency control: daily/weekly/off.
              </p>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>4</div>
              <h3 style={styles.stepTitle}>Measure Program Impact</h3>
              <p style={styles.stepText}>
                Tag interventions ("Wellness Week", "4-Day Pilot"), track before/after Energy Index, and prove ROI. Export CSV or pull via API for leadership dashboards.
              </p>
            </div>
          </div>
        </div>
          <h2 style={styles.sectionTitle}>8 Core Signals (Not 15+ Noisy Metrics)</h2>
          <p style={styles.introText}>
            SignalTrue tracks 8 proven high-impact metrics. We removed redundant and low-signal metrics (Meeting Accept Rate, Late/Missed Ratio, Message Volume, Negative Emotion Ratio, Polarity Stability, Cross-Team Interaction, Responsiveness Index). What remains: clarity.
          </p>

          <div style={styles.dataSourcesGrid}>
            <div style={styles.dataSource}>
              <div style={styles.dataIcon}>💬</div>
              <h3 style={styles.dataTitle}>Sentiment & Latency</h3>
              <p style={styles.dataText}>
                Sentiment average (tone), sentiment shift (day-to-day volatility), response median minutes, response latency trend. Metadata-only analysis—no content read.
              </p>
              <ul style={styles.dataList}>
                <li>Sentiment scoring (metadata, not content)</li>
                <li>Response timing patterns</li>
                <li>Tone shift detection (volatility)</li>
                <li>Adaptive baseline per team</li>
              </ul>
            </div>

            <div style={styles.dataSource}>
              <div style={styles.dataIcon}>📅</div>
              <h3 style={styles.dataTitle}>Meetings & Time</h3>
              <p style={styles.dataText}>
                Meeting load index (total hours weighted), after-hours rate (evenings/weekends), focus time ratio (uninterrupted blocks), recovery days (light-load days). Never reading event titles.
              </p>
              <ul style={styles.dataList}>
                <li>Meeting hours per week</li>
                <li>After-hours activity detection</li>
                <li>Focus time availability</li>
                <li>Recovery day tracking</li>
              </ul>
            </div>

            <div style={styles.dataSource}>
              <div style={styles.dataIcon}>🤝</div>
              <h3 style={styles.dataTitle}>Network & Energy</h3>
              <p style={styles.dataText}>
                Unique contacts (network breadth), network breadth change (isolation risk), Energy Index (0-100 auto-tuned composite). All comparisons team-aggregated for privacy.
              </p>
              <ul style={styles.dataList}>
                <li>Unique contact tracking</li>
                <li>Network breadth shifts</li>
                <li>Auto-tuned Energy Index (composite)</li>
                <li>Team-level aggregation</li>
              </ul>
            </div>
          </div><li>Team cohesion metrics</li>
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
          <h2 style={styles.sectionTitle}>Privacy & Security First</h2>
          <p style={styles.introText}>
            SignalTrue analyzes metadata only—never message content or event details. AES-256 encryption, regional data residency (EU/US), team-level aggregation by default. GDPR-ready from day one.
          </p>

          <div style={styles.privacyGrid}>
            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>�</div>
              <h3 style={styles.privacyTitle}>Metadata-Only Analysis</h3>
              <p style={styles.privacyText}>
                We never read message content or calendar event details. Sentiment uses linguistic patterns (metadata), not content. Complete privacy.
              </p>
            </div>d regular security audits.
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
