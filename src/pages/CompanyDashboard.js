import React from 'react';
import { Link } from 'react-router-dom';

function CompanyDashboard() {
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
          <h1 style={styles.heroTitle}>Company-Wide Analytics Dashboard</h1>
          <p style={styles.heroSubtitle}>
            Understand organization-wide trends, benchmark departments, track engagement metrics,
            and reveal never-before-seen insights about your workforce.
          </p>
          <Link to="/contact" style={styles.primaryBtn}>Request A Demo</Link>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Workforce Insights for HR Business Intelligence</h2>
          <p style={styles.introText}>
            SignalTrue reveals never-before-seen insights about your organization. Our Workforce Insights Engine™
            serves as an innovative HR Business Intelligence platform delivering comprehensive understanding
            of current employees, trends, benchmarks, and historical outcomes.
          </p>

          <div style={styles.featuresGrid}>
            <div style={styles.featureCard}>
              <span style={styles.icon}>📊</span>
              <h3 style={styles.featureTitle}>Employee Engagement Trends</h3>
              <p style={styles.featureText}>Track team engagement across the organization over time with automated trend detection.</p>
            </div>
            <div style={styles.featureCard}>
              <span style={styles.icon}>🏢</span>
              <h3 style={styles.featureTitle}>Departmental Comparisons</h3>
              <p style={styles.featureText}>Compare burnout risk, engagement, and health metrics across departments and teams.</p>
            </div>
            <div style={styles.featureCard}>
              <span style={styles.icon}>📍</span>
              <h3 style={styles.featureTitle}>Geographic Segmentation</h3>
              <p style={styles.featureText}>Understand regional differences in work patterns, meeting culture, and team health.</p>
            </div>
            <div style={styles.featureCard}>
              <span style={styles.icon}>🔄</span>
              <h3 style={styles.featureTitle}>Internal Mobility Reports</h3>
              <p style={styles.featureText}>Track team member movement and collaboration patterns across the organization.</p>
            </div>
            <div style={styles.featureCard}>
              <span style={styles.icon}>📈</span>
              <h3 style={styles.featureTitle}>Historical Trends</h3>
              <p style={styles.featureText}>Analyze patterns over months and quarters to understand seasonal and long-term changes.</p>
            </div>
            <div style={styles.featureCard}>
              <span style={styles.icon}>🎯</span>
              <h3 style={styles.featureTitle}>Risk Analysis</h3>
              <p style={styles.featureText}>See which teams and departments have the highest burnout risk and need support.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Key Dashboard Insights</h2>
          
          <div style={styles.insightsList}>
            <div style={styles.insightRow}>
              <div style={styles.insightIcon}>⚠️</div>
              <div style={styles.insightContent}>
                <h3 style={styles.insightTitle}>Burnout Risk Overview</h3>
                <p style={styles.insightText}>Distribution of burnout risk across the company with breakdown by department, role, and tenure.</p>
              </div>
            </div>

            <div style={styles.insightRow}>
              <div style={styles.insightIcon}>💬</div>
              <div style={styles.insightContent}>
                <h3 style={styles.insightTitle}>Communication Health</h3>
                <p style={styles.insightText}>Company-wide sentiment trends, response time patterns, and after-hours activity levels.</p>
              </div>
            </div>

            <div style={styles.insightRow}>
              <div style={styles.insightIcon}>📅</div>
              <div style={styles.insightContent}>
                <h3 style={styles.insightTitle}>Meeting Culture Analysis</h3>
                <p style={styles.insightText}>Average meeting hours, focus time availability, and calendar health scores by team and department.</p>
              </div>
            </div>

            <div style={styles.insightRow}>
              <div style={styles.insightIcon}>🤝</div>
              <div style={styles.insightContent}>
                <h3 style={styles.insightTitle}>Collaboration Patterns</h3>
                <p style={styles.insightText}>Cross-functional collaboration strength, silo identification, and organizational network analysis.</p>
              </div>
            </div>

            <div style={styles.insightRow}>
              <div style={styles.insightIcon}>📉</div>
              <div style={styles.insightContent}>
                <h3 style={styles.insightTitle}>Retention Insights</h3>
                <p style={styles.insightText}>High-risk employee count, trend analysis, and early warning indicators by department.</p>
              </div>
            </div>

            <div style={styles.insightRow}>
              <div style={styles.insightIcon}>⏰</div>
              <div style={styles.insightContent}>
                <h3 style={styles.insightTitle}>Work-Life Balance Metrics</h3>
                <p style={styles.insightText}>Company-wide after-hours work patterns, weekend activity, and healthy boundary indicators.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Use Cases for Leadership & HR</h2>

          <div style={styles.useCases}>
            <div style={styles.useCase}>
              <h3 style={styles.useCaseTitle}>Executive Review</h3>
              <p style={styles.useCaseText}>Present workforce health metrics to leadership with clear visualizations and actionable insights.</p>
            </div>
            <div style={styles.useCase}>
              <h3 style={styles.useCaseTitle}>Departmental Planning</h3>
              <p style={styles.useCaseText}>Identify which departments need additional resources or intervention based on burnout and engagement data.</p>
            </div>
            <div style={styles.useCase}>
              <h3 style={styles.useCaseTitle}>Culture Initiatives</h3>
              <p style={styles.useCaseText}>Measure the impact of culture programs, wellness initiatives, and policy changes on team health.</p>
            </div>
            <div style={styles.useCase}>
              <h3 style={styles.useCaseTitle}>Strategic Workforce Planning</h3>
              <p style={styles.useCaseText}>Use trends and predictive insights to inform hiring, restructuring, and retention strategies.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{...styles.section, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white'}}>
        <div style={styles.container}>
          <h2 style={{...styles.sectionTitle, color: 'white'}}>Transform Your Workforce Insights</h2>
          <p style={{...styles.introText, color: 'rgba(255,255,255,0.9)', marginBottom: '2rem'}}>
            See the full picture of your organization's health.
          </p>
          <Link to="/contact" style={{...styles.primaryBtn, background: 'white', color: '#6366f1'}}>Request A Demo</Link>
        </div>
      </section>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerSection}>
            <h4 style={styles.footerHeading}>Product</h4>
            <Link to="/product" style={styles.footerLink}>Overview</Link>
            <Link to="/burnout-detection" style={styles.footerLink}>Burnout Detection</Link>
            <Link to="/team-analytics" style={styles.footerLink}>Team Analytics</Link>
            <Link to="/company-dashboard" style={styles.footerLink}>Company Dashboard</Link>
          </div>
          <div style={styles.footerSection}>
            <h4 style={styles.footerHeading}>Company</h4>
            <Link to="/about" style={styles.footerLink}>About</Link>
            <Link to="/pricing" style={styles.footerLink}>Pricing</Link>
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
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' },
  featureCard: { background: '#f9fafb', borderRadius: '12px', padding: '2rem', textAlign: 'center' },
  icon: { fontSize: '3rem', marginBottom: '1rem', display: 'block' },
  featureTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' },
  featureText: { color: '#6b7280', lineHeight: 1.6 },
  insightsList: { maxWidth: '900px', margin: '0 auto' },
  insightRow: { display: 'flex', gap: '1.5rem', marginBottom: '2rem', alignItems: 'flex-start' },
  insightIcon: { fontSize: '2.5rem', flexShrink: 0 },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' },
  insightText: { color: '#6b7280', lineHeight: 1.6 },
  useCases: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' },
  useCase: { background: '#f9fafb', borderRadius: '12px', padding: '2rem' },
  useCaseTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' },
  useCaseText: { color: '#6b7280', lineHeight: 1.6 },
  footer: { background: '#111827', color: 'white', padding: '4rem 2rem 2rem' },
  footerContent: { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3rem' },
  footerSection: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  footerHeading: { fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' },
  footerLink: { color: '#9ca3af', textDecoration: 'none', fontSize: '0.95rem' },
  footerBottom: { maxWidth: '1200px', margin: '0 auto', paddingTop: '2rem', borderTop: '1px solid #374151', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' },
};

export default CompanyDashboard;
