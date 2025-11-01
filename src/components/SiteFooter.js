import React from 'react';
import { Link } from 'react-router-dom';

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer style={styles.footer}>
      <div style={styles.footerContent}>
        <div style={styles.footerSection}>
          <h4 style={styles.footerHeading}>Product</h4>
          <Link to="/product" style={styles.footerLink}>Overview</Link>
          <Link to="/burnout-detection" style={styles.footerLink}>Burnout Detection</Link>
          <Link to="/team-analytics" style={styles.footerLink}>Team Analytics</Link>
          <Link to="/company-dashboard" style={styles.footerLink}>Company Dashboard</Link>
          <Link to="/how-it-works" style={styles.footerLink}>How It Works</Link>
        </div>
        <div style={styles.footerSection}>
          <h4 style={styles.footerHeading}>Company</h4>
          <Link to="/about" style={styles.footerLink}>About</Link>
          <Link to="/pricing" style={styles.footerLink}>Pricing</Link>
          <Link to="/contact" style={styles.footerLink}>Contact</Link>
        </div>
        <div style={styles.footerSection}>
          <h4 style={styles.footerHeading}>Legal</h4>
          <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
          <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
        </div>
      </div>
      <div style={styles.footerBottom}>
        <p>©{year} SignalTrue. All rights reserved.</p>
      </div>
    </footer>
  );
}

const styles = {
  footer: { background: '#111827', color: 'white', padding: '3rem 2rem 2rem', marginTop: '3rem' },
  footerContent: { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2rem' },
  footerSection: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  footerHeading: { fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' },
  footerLink: { color: '#9ca3af', textDecoration: 'none', fontSize: '0.95rem' },
  footerBottom: { maxWidth: '1200px', margin: '0 auto', paddingTop: '2rem', borderTop: '1px solid #374151', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' },
};
