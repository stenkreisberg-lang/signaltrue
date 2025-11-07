import React from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';

export default function Privacy() {
  return (
    <>
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
            <h1 style={styles.title}>Transparency and trust — built in from day one.</h1>
            <p style={styles.subtitle}>SignalTrue is designed for insight, not oversight.<br />We measure trends, not people.<br />All analytics are aggregated at team level, with configurable retention periods and region-specific data residency.</p>
          </div>
        </header>

        <main style={styles.section}> 
          <div style={styles.container}> 
            <div style={styles.card}> 
              <h2 style={{fontSize:'1.5rem',fontWeight:700,marginBottom:16}}>Continuous Engagement Insight™</h2>
              <p style={{marginBottom:24}}>All analytics are aggregated, encrypted, and transparent to employees. Empathy and ethics are built into every layer.</p>
              <h3 style={{fontSize:'1.2rem',fontWeight:600,margin:'24px 0 8px'}}>When employees trust the system, HR can trust the data.</h3>
            </div>
          </div>
        </main>

        <footer style={{background:'#f9fafb',padding:'2rem 0',textAlign:'center'}}>
          <span style={{color:'#6b7280',fontSize:'1rem'}}>Privacy-first: SignalTrue analyzes patterns, not private content. <Link to="/" style={styles.navLink}>Back to Home</Link>.</span>
        </footer>

        <SiteFooter />
      </div>
    </>
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

  // Footer styles moved to SiteFooter component
};
