import React from 'react';
import { useNavigate } from 'react-router-dom';
import heroPerson from '../assets/hero-person.svg';
import logoIcon from '../assets/logo-icon.svg';

function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <div style={styles.logoContainer}>
            <img src={logoIcon} alt="Signaltrue" style={styles.logoIcon} />
            <span style={styles.logoText}>Signaltrue</span>
          </div>
          <div style={styles.navLinks}>
            <a href="#product" style={styles.navLink}>Product</a>
            <a href="#solutions" style={styles.navLink}>Solutions</a>
            <a href="#pricing" style={styles.navLink}>Pricing</a>
            <a href="#about" style={styles.navLink}>About</a>
            <button onClick={() => navigate('/login')} style={styles.loginButton}>Login</button>
          </div>
        </div>
      </nav>

      <section style={styles.heroSplit}>
        <div style={styles.heroGrid}>
          <div style={styles.heroLeft}>
            <h1 style={styles.heroTitle}>Run healthier teams with SignalTrue</h1>
            <p style={styles.heroSubtitle}>
              Turn signals from Slack and calendars into clear actions. Spot burnout risk early, coach better, and create sustainable performance.
            </p>
            <div style={styles.heroCTA}>
              <button onClick={() => navigate('/register')} style={styles.primaryButton}>Start free trial</button>
              <button onClick={() => navigate('/login')} style={styles.secondaryButton}>Sign in</button>
            </div>
          </div>
          <div style={styles.heroRight}>
            <img
              src={(process.env.PUBLIC_URL || '') + '/images/hero-team.jpg'}
              alt="People at work"
              style={styles.heroImg}
              loading="lazy"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = heroPerson; }}
            />
          </div>
        </div>
      </section>

      <section id="solutions" style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.sectionContent}>
          <h2 style={styles.sectionTitle}>Clarity for every leader</h2>
          <div style={styles.metricsGrid}>
            <div style={styles.metric}><div style={styles.metricValue}>-27%</div><div style={styles.metricLabel}>Burnout incidents</div></div>
            <div style={styles.metric}><div style={styles.metricValue}>+34%</div><div style={styles.metricLabel}>Focus hours</div></div>
            <div style={styles.metric}><div style={styles.metricValue}>2.4x</div><div style={styles.metricLabel}>Faster insights</div></div>
            <div style={styles.metric}><div style={styles.metricValue}>7d</div><div style={styles.metricLabel}>Time to value</div></div>
          </div>
          <div style={styles.dashboardsRow}>
            <img src="/images/dashboard-analytics.svg" alt="Analytics overview" style={styles.dashboardImg} />
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.logoContainer}>
            <img src={logoIcon} alt="Signaltrue" style={{...styles.logoIcon, filter: 'brightness(0) invert(1)'}} />
            <span style={{...styles.logoText, color: 'white'}}>Signaltrue</span>
          </div>
          <div style={styles.footerLinks}>
            <a href="mailto:support@signaltrue.ai" style={styles.footerLink}>Support</a>
            <a href="mailto:sales@signaltrue.ai" style={styles.footerLink}>Sales</a>
            <span style={styles.footerLink}>Privacy</span>
            <span style={styles.footerLink}>Terms</span>
          </div>
          <div style={styles.footerCopy}>© 2025 SignalTrue. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: 'white' },
  nav: { background: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 100 },
  navContent: { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoContainer: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  logoIcon: { height: '36px', width: '36px' },
  logoText: { fontSize: '1.5rem', fontWeight: 600, color: '#1e3a5f', letterSpacing: '-0.02em' },
  navLinks: { display: 'flex', alignItems: 'center', gap: '2rem' },
  navLink: { color: '#4b5563', textDecoration: 'none', fontWeight: 500 },
  loginButton: { padding: '0.5rem 1.5rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },

  heroSplit: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '5rem 2rem' },
  heroGrid: { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '2rem', alignItems: 'center' },
  heroLeft: { color: 'white' },
  heroRight: { display: 'flex', justifyContent: 'center' },
  heroImg: { width: '100%', height: 380, maxWidth: 520, objectFit: 'cover', borderRadius: 16, boxShadow: '0 30px 60px rgba(0,0,0,0.25)' },
  heroTitle: { fontSize: '3rem', fontWeight: 700, color: 'white', marginBottom: '1.5rem', lineHeight: 1.2 },
  heroSubtitle: { fontSize: '1.125rem', color: 'rgba(255,255,255,0.92)', marginBottom: '1.5rem', lineHeight: 1.6 },
  heroCTA: { display: 'flex', gap: '1rem', justifyContent: 'flex-start' },
  primaryButton: { padding: '1rem 2rem', background: 'white', color: '#6366f1', border: 'none', borderRadius: 8, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' },
  secondaryButton: { padding: '1rem 2rem', background: 'transparent', color: 'white', border: '2px solid white', borderRadius: 8, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' },

  section: { padding: '4rem 2rem' },
  sectionContent: { maxWidth: '1200px', margin: '0 auto' },
  sectionTitle: { fontSize: '2.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '2rem', color: '#111827' },

  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' },
  metric: { background: 'white', borderRadius: 12, padding: '1.25rem', textAlign: 'center', border: '1px solid #e5e7eb' },
  metricValue: { fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  metricLabel: { color: '#6b7280', fontWeight: 600 },

  dashboardsRow: { display: 'flex', justifyContent: 'center' },
  dashboardImg: { width: '100%', maxWidth: 900, borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 16px 40px rgba(0,0,0,0.12)' },

  footer: { background: '#111827', color: 'white', padding: '3rem 2rem' },
  footerContent: { maxWidth: '1200px', margin: '0 auto', textAlign: 'center' },
  footerLogo: { height: '36px', width: 'auto', margin: '0 auto 1rem' },
  footerLinks: { display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' },
  footerLink: { color: '#9ca3af', textDecoration: 'none' },
  footerCopy: { color: '#6b7280', fontSize: '0.875rem' }
};

export default Home;
