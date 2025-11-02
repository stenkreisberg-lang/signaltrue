import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logoIcon from '../assets/logo-icon.svg';
import SiteFooter from '../components/SiteFooter';

function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <Link to="/" style={{...styles.logoContainer, textDecoration:'none'}}>
            <img src={logoIcon} alt="SignalTrue" style={styles.logoIcon} />
            <span style={styles.logoText}>SignalTrue</span>
          </Link>
          <div style={styles.navLinks}>
            <Link to="/product" style={styles.navLink}>Product</Link>
            <Link to="/how-it-works" style={styles.navLink}>Solutions</Link>
            <Link to="/pricing" style={styles.navLink}>Pricing</Link>
            <Link to="/about" style={styles.navLink}>About</Link>
            <button onClick={() => navigate('/login')} style={styles.loginButton}>Login</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.badge}>Team-level by default</div>
          <h1 style={styles.heroTitle}>Your team talks. SignalTrue listens.</h1>
          <p style={styles.heroSubtitle}>
            Behaviour changes before burnout. SignalTrue connects to Slack and Outlook, learns each team's normal rhythm, then flags early signs of stress or disengagement.
          </p>
          <div style={styles.heroCTA}>
            <button onClick={() => navigate('/contact')} style={styles.primaryButton}>Get Early Access</button>
            <button onClick={() => navigate('/how-it-works')} style={styles.secondaryButton}>See How It Works</button>
          </div>
          
          {/* Signal chips */}
          <div style={styles.chipContainer}>
            <div style={styles.chip}>📊 Tone</div>
            <div style={styles.chip}>⏱️ Response time</div>
            <div style={styles.chip}>📅 Meeting load</div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section style={styles.trustBar}>
        <div style={styles.sectionContent}>
          <p style={styles.trustText}>Private beta with EU teams</p>
        </div>
      </section>

      {/* Why Now */}
      <section style={styles.section}>
        <div style={styles.sectionContent}>
          <h2 style={styles.sectionTitle}>Great managers act before issues surface</h2>
          <p style={styles.leadText}>
            Stress and disengagement show up in small shifts. Messages feel flatter. Replies come later. Meeting accepts drop. These are weak signals. Together they tell a clear story.
          </p>
          <div style={styles.signalsGrid}>
            <div style={styles.signalCard}>
              <div style={styles.signalIcon}>💬</div>
              <div style={styles.signalTitle}>Message tone drifts</div>
            </div>
            <div style={styles.signalCard}>
              <div style={styles.signalIcon}>⏳</div>
              <div style={styles.signalTitle}>Replies slow</div>
            </div>
            <div style={styles.signalCard}>
              <div style={styles.signalIcon}>❌</div>
              <div style={styles.signalTitle}>Accepts fall</div>
            </div>
            <div style={styles.signalCard}>
              <div style={styles.signalIcon}>📈</div>
              <div style={styles.signalTitle}>Meeting load rises</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.sectionContent}>
          <h2 style={styles.sectionTitle}>How it works</h2>
          <div style={styles.stepsGrid}>
            <div style={styles.stepCard}>
              <div style={styles.stepNumber}>1</div>
              <h3 style={styles.stepTitle}>Connect</h3>
              <p style={styles.stepText}>Link Slack, Teams, or Outlook.</p>
            </div>
            <div style={styles.stepCard}>
              <div style={styles.stepNumber}>2</div>
              <h3 style={styles.stepTitle}>Learn</h3>
              <p style={styles.stepText}>We build a baseline for tone, response time, and meeting load.</p>
            </div>
            <div style={styles.stepCard}>
              <div style={styles.stepNumber}>3</div>
              <h3 style={styles.stepTitle}>Detect</h3>
              <p style={styles.stepText}>When behaviour drifts from normal, we highlight the change with context.</p>
            </div>
            <div style={styles.stepCard}>
              <div style={styles.stepNumber}>4</div>
              <h3 style={styles.stepTitle}>Act</h3>
              <p style={styles.stepText}>You get weekly summaries or real-time alerts with simple next steps.</p>
            </div>
          </div>
          <p style={styles.privacyNote}>
            💡 We analyse metadata and tone patterns, not message content. Team-level by default.
          </p>
        </div>
      </section>

      {/* Key Outcomes */}
      <section style={styles.section}>
        <div style={styles.sectionContent}>
          <h2 style={styles.sectionTitle}>What you get</h2>
          <div style={styles.outcomesGrid}>
            <div style={styles.outcomeCard}>
              <div style={styles.outcomeIcon}>💯</div>
              <h3 style={styles.outcomeTitle}>Team Health Score</h3>
              <p style={styles.outcomeText}>One clear number that blends tone, responsiveness, and collaboration.</p>
            </div>
            <div style={styles.outcomeCard}>
              <div style={styles.outcomeIcon}>📈</div>
              <h3 style={styles.outcomeTitle}>Behaviour Trends</h3>
              <p style={styles.outcomeText}>See how teams change week by week.</p>
            </div>
            <div style={styles.outcomeCard}>
              <div style={styles.outcomeIcon}>⚠️</div>
              <h3 style={styles.outcomeTitle}>Early Warnings</h3>
              <p style={styles.outcomeText}>Catch overload and burnout risk early.</p>
            </div>
            <div style={styles.outcomeCard}>
              <div style={styles.outcomeIcon}>📚</div>
              <h3 style={styles.outcomeTitle}>Manager Playbook</h3>
              <p style={styles.outcomeText}>Practical suggestions that help you respond with care.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy First */}
      <section style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.sectionContent}>
          <h2 style={styles.sectionTitle}>Privacy by design</h2>
          <p style={styles.privacyText}>
            We analyse patterns, not private content. We aggregate at team level by default. You stay compliant, and your people stay protected. <Link to="/privacy" style={styles.privacyLink}>Learn more in our Privacy page →</Link>
          </p>
        </div>
      </section>

      {/* CTA Band */}
      <section style={styles.ctaBand}>
        <div style={styles.sectionContent}>
          <h2 style={styles.ctaTitle}>See your team's signals</h2>
          <button onClick={() => navigate('/contact')} style={styles.ctaBandButton}>Get Early Access</button>
        </div>
      </section>

      <SiteFooter />
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

  hero: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '6rem 2rem 4rem', textAlign: 'center' },
  heroContent: { maxWidth: '900px', margin: '0 auto' },
  badge: { display: 'inline-block', background: 'rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem 1rem', borderRadius: 20, fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.5rem' },
  heroTitle: { fontSize: '3.5rem', fontWeight: 800, color: 'white', marginBottom: '1.5rem', lineHeight: 1.1 },
  heroSubtitle: { fontSize: '1.25rem', color: 'rgba(255,255,255,0.95)', marginBottom: '2rem', lineHeight: 1.6, maxWidth: '800px', margin: '0 auto 2rem' },
  heroCTA: { display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' },
  primaryButton: { padding: '1rem 2rem', background: 'white', color: '#6366f1', border: 'none', borderRadius: 8, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  secondaryButton: { padding: '1rem 2rem', background: 'transparent', color: 'white', border: '2px solid white', borderRadius: 8, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' },
  
  chipContainer: { display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' },
  chip: { background: 'rgba(255,255,255,0.25)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: 24, fontSize: '0.95rem', fontWeight: 500, backdropFilter: 'blur(10px)' },

  trustBar: { background: '#f9fafb', padding: '2rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb' },
  trustText: { color: '#6b7280', fontSize: '0.95rem', fontWeight: 500 },

  section: { padding: '5rem 2rem' },
  sectionContent: { maxWidth: '1200px', margin: '0 auto' },
  sectionTitle: { fontSize: '2.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '1rem', color: '#111827' },
  leadText: { fontSize: '1.125rem', color: '#4b5563', textAlign: 'center', maxWidth: '800px', margin: '0 auto 3rem', lineHeight: 1.7 },

  signalsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', marginTop: '3rem' },
  signalCard: { background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '2rem', textAlign: 'center' },
  signalIcon: { fontSize: '2.5rem', marginBottom: '1rem' },
  signalTitle: { fontSize: '1.125rem', fontWeight: 600, color: '#111827' },

  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', marginBottom: '2rem' },
  stepCard: { background: 'white', border: '2px solid #e5e7eb', borderRadius: 12, padding: '2rem', textAlign: 'center' },
  stepNumber: { width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, margin: '0 auto 1rem' },
  stepTitle: { fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' },
  stepText: { fontSize: '1rem', color: '#6b7280', lineHeight: 1.6 },
  privacyNote: { fontSize: '0.95rem', color: '#6366f1', textAlign: 'center', fontWeight: 500, marginTop: '2rem', background: '#ede9fe', padding: '1rem', borderRadius: 8 },

  outcomesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem', marginTop: '3rem' },
  outcomeCard: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '2rem' },
  outcomeIcon: { fontSize: '2.5rem', marginBottom: '1rem' },
  outcomeTitle: { fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' },
  outcomeText: { fontSize: '1rem', color: '#6b7280', lineHeight: 1.6 },

  privacyText: { fontSize: '1.125rem', color: '#4b5563', textAlign: 'center', maxWidth: '800px', margin: '0 auto', lineHeight: 1.7 },
  privacyLink: { color: '#6366f1', fontWeight: 600, textDecoration: 'none' },

  ctaBand: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '5rem 2rem', textAlign: 'center' },
  ctaTitle: { fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: '2rem' },
  ctaBandButton: { padding: '1rem 2.5rem', background: 'white', color: '#6366f1', border: 'none', borderRadius: 8, fontSize: '1.125rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' },
};

export default Home;
