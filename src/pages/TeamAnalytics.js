import React from 'react';
import { Link } from 'react-router-dom';

function TeamAnalytics() {
  return (
    <div style={styles.page}>
      {/* Navigation */}
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

      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.container}>
          <h1 style={styles.heroTitle}>
            Individual Team Member Analytics
          </h1>
          <p style={styles.heroSubtitle}>
            Get personalized insights for each team member to support better 1-on-1 conversations, 
            accelerate talent development, and build stronger manager-employee relationships.
          </p>
          <Link to="/contact" style={styles.primaryBtn}>Request A Demo</Link>
        </div>
      </section>

      {/* Overview */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Personalized Analytics™ About Each Team Member</h2>
          <p style={styles.introText}>
            SignalTrue is highly people-centric, with a mission of helping employees thrive in their careers. 
            Our platform accelerates better talent development with proprietary insights and valuable reports. 
            SignalTrue consolidates dozens of disparate analytics into an easy-to-use team insights hub.
          </p>

          <div style={styles.benefitCards}>
            <div style={styles.benefitCard}>
              <span style={styles.benefitIcon}>📊</span>
              <h3 style={styles.benefitTitle}>Better Performance Reviews</h3>
              <p style={styles.benefitText}>
                Personalized Analytics™ better prepare each manager ahead of regular performance reviews 
                with data-driven insights.
              </p>
            </div>

            <div style={styles.benefitCard}>
              <span style={styles.benefitIcon}>🎯</span>
              <h3 style={styles.benefitTitle}>Targeted Support</h3>
              <p style={styles.benefitText}>
                Identify specific areas where team members need support before issues become critical problems.
              </p>
            </div>

            <div style={styles.benefitCard}>
              <span style={styles.benefitIcon}>💬</span>
              <h3 style={styles.benefitTitle}>Meaningful Conversations</h3>
              <p style={styles.benefitText}>
                Have more impactful 1-on-1s with conversation starters based on real behavioral data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Insights */}
      <section style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Individual Insights Included</h2>

          <div style={styles.insightsGrid}>
            <div style={styles.insightCard}>
              <div style={styles.insightHeader}>
                <span style={styles.insightIcon}>⚠️</span>
                <h3 style={styles.insightTitle}>Burnout Risk™ Score</h3>
              </div>
              <p style={styles.insightText}>
                Real-time burnout risk assessment ranging from 1-99%, updated continuously based on 
                communication patterns, meeting load, and work signals.
              </p>
              <ul style={styles.insightList}>
                <li>Current risk score and trend over time</li>
                <li>Contributing risk factors breakdown</li>
                <li>Risk history and pattern analysis</li>
                <li>Recommended interventions</li>
              </ul>
            </div>

            <div style={styles.insightCard}>
              <div style={styles.insightHeader}>
                <span style={styles.insightIcon}>💬</span>
                <h3 style={styles.insightTitle}>Communication Patterns</h3>
              </div>
              <p style={styles.insightText}>
                Analyze how team members communicate, including response times, sentiment trends, 
                and engagement levels across channels.
              </p>
              <ul style={styles.insightList}>
                <li>Message sentiment analysis over time</li>
                <li>Response time patterns and changes</li>
                <li>After-hours communication frequency</li>
                <li>Team channel participation rates</li>
              </ul>
            </div>

            <div style={styles.insightCard}>
              <div style={styles.insightHeader}>
                <span style={styles.insightIcon}>📅</span>
                <h3 style={styles.insightTitle}>Meeting & Focus Time</h3>
              </div>
              <p style={styles.insightText}>
                Understand calendar health with insights into meeting load, focus time availability, 
                and schedule fragmentation.
              </p>
              <ul style={styles.insightList}>
                <li>Total meeting hours per week</li>
                <li>Focus time blocks available</li>
                <li>Calendar fragmentation score</li>
                <li>Meeting efficiency indicators</li>
              </ul>
            </div>

            <div style={styles.insightCard}>
              <div style={styles.insightHeader}>
                <span style={styles.insightIcon}>🤝</span>
                <h3 style={styles.insightTitle}>Collaboration Network</h3>
              </div>
              <p style={styles.insightText}>
                Visualize collaboration patterns, cross-team relationships, and social network position 
                within the organization.
              </p>
              <ul style={styles.insightList}>
                <li>Peer interaction frequency</li>
                <li>Cross-team collaboration patterns</li>
                <li>Social network centrality metrics</li>
                <li>Isolation risk indicators</li>
              </ul>
            </div>

            <div style={styles.insightCard}>
              <div style={styles.insightHeader}>
                <span style={styles.insightIcon}>📈</span>
                <h3 style={styles.insightTitle}>Engagement Trends</h3>
              </div>
              <p style={styles.insightText}>
                Track engagement levels over time with automated detection of positive and negative 
                trend changes.
              </p>
              <ul style={styles.insightList}>
                <li>Weekly engagement score</li>
                <li>Month-over-month trend analysis</li>
                <li>Engagement compared to team average</li>
                <li>Early warning signals</li>
              </ul>
            </div>

            <div style={styles.insightCard}>
              <div style={styles.insightHeader}>
                <span style={styles.insightIcon}>⏰</span>
                <h3 style={styles.insightTitle}>Work-Life Balance</h3>
              </div>
              <p style={styles.insightText}>
                Monitor work-life balance indicators including after-hours activity, weekend work, 
                and time off patterns.
              </p>
              <ul style={styles.insightList}>
                <li>After-hours message activity</li>
                <li>Weekend and holiday work patterns</li>
                <li>Time off usage trends</li>
                <li>Healthy boundary indicators</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Privacy-First Analytics</h2>
          <p style={styles.introText}>
            All team member analytics are designed with privacy at the core. We analyze patterns and behaviors, 
            not content. Message sentiment is calculated without reading private conversations.
          </p>

          <div style={styles.privacyGrid}>
            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>🔒</div>
              <h3 style={styles.privacyTitle}>Content-Agnostic</h3>
              <p style={styles.privacyText}>
                We don't read message content. Sentiment analysis uses metadata and linguistic patterns only.
              </p>
            </div>

            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>👤</div>
              <h3 style={styles.privacyTitle}>Anonymized Comparisons</h3>
              <p style={styles.privacyText}>
                Benchmarks and peer comparisons are always anonymized to protect individual privacy.
              </p>
            </div>

            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>✅</div>
              <h3 style={styles.privacyTitle}>Role-Based Access</h3>
              <p style={styles.privacyText}>
                Managers only see insights for their direct reports. HR sees aggregate trends.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>How Managers Use Team Analytics</h2>

          <div style={styles.useCasesList}>
            <div style={styles.useCase}>
              <div style={styles.useCaseNumber}>1</div>
              <div style={styles.useCaseContent}>
                <h3 style={styles.useCaseTitle}>Prepare for 1-on-1s</h3>
                <p style={styles.useCaseText}>
                  Review team member analytics before your weekly 1-on-1 to identify discussion topics, 
                  celebrate wins, and address concerns proactively.
                </p>
              </div>
            </div>

            <div style={styles.useCase}>
              <div style={styles.useCaseNumber}>2</div>
              <div style={styles.useCaseContent}>
                <h3 style={styles.useCaseTitle}>Performance Review Season</h3>
                <p style={styles.useCaseText}>
                  Use objective data on engagement, collaboration, and work patterns to supplement 
                  qualitative feedback during performance reviews.
                </p>
              </div>
            </div>

            <div style={styles.useCase}>
              <div style={styles.useCaseNumber}>3</div>
              <div style={styles.useCaseContent}>
                <h3 style={styles.useCaseTitle}>Spot Early Warning Signs</h3>
                <p style={styles.useCaseText}>
                  Get alerted when a team member shows signs of disengagement, overwork, or isolation 
                  before they become serious issues.
                </p>
              </div>
            </div>

            <div style={styles.useCase}>
              <div style={styles.useCaseNumber}>4</div>
              <div style={styles.useCaseContent}>
                <h3 style={styles.useCaseTitle}>Support Career Development</h3>
                <p style={styles.useCaseText}>
                  Identify team members ready for more responsibility based on collaboration patterns, 
                  initiative indicators, and engagement trends.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{...styles.section, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white'}}>
        <div style={styles.container}>
          <h2 style={{...styles.sectionTitle, color: 'white'}}>
            Empower Your Managers with Better Insights
          </h2>
          <p style={{...styles.introText, color: 'rgba(255,255,255,0.9)', marginBottom: '2rem'}}>
            See how team analytics can transform your 1-on-1 conversations.
          </p>
          <Link to="/contact" style={{...styles.primaryBtn, background: 'white', color: '#6366f1'}}>
            Request A Demo
          </Link>
        </div>
      </section>

      {/* Footer */}
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
  benefitCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginTop: '3rem' },
  benefitCard: { background: '#f9fafb', borderRadius: '12px', padding: '2rem', textAlign: 'center' },
  benefitIcon: { fontSize: '3rem', marginBottom: '1rem', display: 'block' },
  benefitTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' },
  benefitText: { color: '#6b7280', lineHeight: 1.6 },
  insightsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' },
  insightCard: { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '2rem' },
  insightHeader: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' },
  insightIcon: { fontSize: '2rem' },
  insightTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#111827' },
  insightText: { color: '#6b7280', lineHeight: 1.6, marginBottom: '1rem' },
  insightList: { color: '#6b7280', paddingLeft: '1.5rem', lineHeight: 1.8, fontSize: '0.95rem' },
  privacyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginTop: '3rem' },
  privacyCard: { background: '#f9fafb', borderRadius: '12px', padding: '2rem', textAlign: 'center' },
  privacyIcon: { fontSize: '3rem', marginBottom: '1rem', display: 'block' },
  privacyTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' },
  privacyText: { color: '#6b7280', lineHeight: 1.6 },
  useCasesList: { maxWidth: '900px', margin: '0 auto' },
  useCase: { display: 'flex', gap: '2rem', marginBottom: '3rem' },
  useCaseNumber: { width: '60px', height: '60px', flexShrink: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '700' },
  useCaseContent: { flex: 1 },
  useCaseTitle: { fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' },
  useCaseText: { color: '#6b7280', lineHeight: 1.7 },
  footer: { background: '#111827', color: 'white', padding: '4rem 2rem 2rem' },
  footerContent: { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3rem' },
  footerSection: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  footerHeading: { fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' },
  footerLink: { color: '#9ca3af', textDecoration: 'none', fontSize: '0.95rem' },
  footerBottom: { maxWidth: '1200px', margin: '0 auto', paddingTop: '2rem', borderTop: '1px solid #374151', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' },
};

export default TeamAnalytics;
