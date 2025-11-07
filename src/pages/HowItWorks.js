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

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.container}>
          <h1 style={styles.heroTitle}>How Continuous Engagement Insight™ works.</h1>
          <p style={styles.heroSubtitle}>From connection to clarity in four simple steps.</p>
        </div>
      </section>

      {/* Steps Section */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>How it works</h2>
          <div style={styles.stepsGrid}>
            {[
              ['1','Connect your work environment.'],
              ['2','SignalTrue learns your team’s healthy engagement pattern.'],
              ['3','Engagement insights update automatically each week.'],
              ['4','HR receives clear reports and next-step recommendations.'],
            ].map(([n,txt]) => (
              <div key={n} style={styles.step}>
                <div style={styles.stepNumber}>{n}</div>
                <p style={styles.stepText}>{txt}</p>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:32}}>
            <Link to="/contact" style={styles.primaryBtn}>Start Your Free Demo</Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Common questions. Clear answers.</h2>
          <div style={styles.faqGrid}>
            <div style={styles.faqCard}>
              <h3 style={styles.faqQuestion}>Does SignalTrue monitor individuals?</h3>
              <p style={styles.faqAnswer}>No. All data is team-level and anonymised.</p>
            </div>
            <div style={styles.faqCard}>
              <h3 style={styles.faqQuestion}>Is it GDPR compliant?</h3>
              <p style={styles.faqAnswer}>Yes. Regional storage, encryption, and retention control are built in.</p>
            </div>
            <div style={styles.faqCard}>
              <h3 style={styles.faqQuestion}>What makes SignalTrue different?</h3>
              <p style={styles.faqAnswer}>It provides continuous insight, not one-off survey results.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Privacy-first by design</h2>
          <p style={styles.introText}>SignalTrue analyzes collaboration data, not private content. All analytics are aggregated at team level, with regional data residency and configurable retention.</p>
        </div>
      </section>

      <footer style={{background:'#f9fafb',padding:'2rem 0',textAlign:'center'}}>
        <span style={{color:'#6b7280',fontSize:'1rem'}}>Continuous Engagement Insight™ for HR leaders. <Link to="/privacy" style={styles.navLink}>Learn more</Link>.</span>
      </footer>

      <SiteFooter />
    </div>
  );
}
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
          <p style={styles.heroSubtitle}>8 signals. Drift explainability. Micro‑playbooks. Privacy‑first.</p>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Fast setup, clear outcomes</h2>
          <div style={styles.stepsGrid}>
            {[
              ['1','Connect','One‑click OAuth with Slack, Google or Microsoft (read‑only).'],
              ['2','Baseline','We learn normal rhythms for each team automatically.'],
              ['3','Detect & explain','When drift hits, we show the top 3 contributors.'],
              ['4','Act','Micro‑playbooks help managers respond fast.'],
            ].map(([n,t,txt]) => (
              <div key={n} style={styles.step}>
                <div style={styles.stepNumber}>{n}</div>
                <h3 style={styles.stepTitle}>{t}</h3>
                <p style={styles.stepText}>{txt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Privacy & Security</h2>
          <div style={styles.privacyGrid}>
            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>🔒</div>
              <h3 style={styles.privacyTitle}>Metadata‑only</h3>
              <p style={styles.privacyText}>No message content or event details are read—patterns only.</p>
            </div>
            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>🧭</div>
              <h3 style={styles.privacyTitle}>Team‑level by default</h3>
              <p style={styles.privacyText}>All insights are aggregated at team level for privacy.</p>
            </div>
            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>🛡️</div>
              <h3 style={styles.privacyTitle}>Encryption</h3>
              <p style={styles.privacyText}>Tokens encrypted at rest (AES‑256). Regional data residency.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{...styles.section, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white'}}>
        <div style={styles.container}>
          <h2 style={{...styles.sectionTitle, color:'white'}}>Ready to see it?</h2>
          <p style={{...styles.introText,color:'rgba(255,255,255,0.9)'}}>Most companies are live in 5 minutes.</p>
          <Link to="/contact" style={{...styles.primaryBtn, background:'white', color:'#6366f1'}}>Request a demo</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
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
          <p style={styles.heroSubtitle}>8 signals. Drift explainability. Micro‑playbooks. Privacy‑first.</p>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Fast setup, clear outcomes</h2>
          <div style={styles.stepsGrid}>
            {[
              ['1','Connect','One‑click OAuth with Slack, Google or Microsoft (read‑only).'],
              ['2','Baseline','We learn normal rhythms for each team automatically.'],
              ['3','Detect & explain','When drift hits, we show the top 3 contributors.'],
              ['4','Act','Micro‑playbooks help managers respond fast.'],
            ].map(([n,t,txt]) => (
              <div key={n} style={styles.step}>
                <div style={styles.stepNumber}>{n}</div>
                <h3 style={styles.stepTitle}>{t}</h3>
                <p style={styles.stepText}>{txt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Privacy & Security</h2>
          <div style={styles.privacyGrid}>
            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>🔒</div>
              <h3 style={styles.privacyTitle}>Metadata‑only</h3>
              <p style={styles.privacyText}>No message content or event details are read—patterns only.</p>
            </div>
            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>🧭</div>
              <h3 style={styles.privacyTitle}>Team‑level by default</h3>
              <p style={styles.privacyText}>All insights are aggregated at team level for privacy.</p>
            </div>
            <div style={styles.privacyCard}>
              <div style={styles.privacyIcon}>🛡️</div>
              <h3 style={styles.privacyTitle}>Encryption</h3>
              <p style={styles.privacyText}>Tokens encrypted at rest (AES‑256). Regional data residency.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{...styles.section, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white'}}>
        <div style={styles.container}>
          <h2 style={{...styles.sectionTitle, color:'white'}}>Ready to see it?</h2>
          <p style={{...styles.introText,color:'rgba(255,255,255,0.9)'}}>Most companies are live in 5 minutes.</p>
          <Link to="/contact" style={{...styles.primaryBtn, background:'white', color:'#6366f1'}}>Request a demo</Link>
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
