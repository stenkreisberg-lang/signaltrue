// This file is deprecated. Use HowItWorks.js instead.
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
          <h1 style={styles.heroTitle}>How HR leaders turn collaboration into continuous insight.</h1>
          <p style={styles.heroSubtitle}>Connect your environment securely. SignalTrue learns your teams’ engagement rhythm. Positive or negative shifts appear in your dashboard automatically. Weekly reports help you guide leaders, recognise improvements, and maintain high energy.</p>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>How It Works</h2>
          <div style={styles.stepsGrid}>
            {[
              ['1','Connect your environment securely.',''],
              ['2','SignalTrue learns your teams’ engagement rhythm.',''],
              ['3','Positive or negative shifts appear in your dashboard automatically.',''],
              ['4','Weekly reports help you guide leaders, recognise improvements, and maintain high energy.',''],
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
  privacyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '3rem' },
  privacyCard: { background: '#f9fafb', borderRadius: '12px', padding: '2rem' },
  privacyIcon: { fontSize: '3rem', marginBottom: '1rem' },
  privacyTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' },
  privacyText: { color: '#6b7280', lineHeight: 1.6 },
};

export default HowItWorks;
