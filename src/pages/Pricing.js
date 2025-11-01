import React from 'react';
import { Link } from 'react-router-dom';

function Pricing() {
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
          <h1 style={styles.heroTitle}>Simple, Transparent Pricing</h1>
          <p style={styles.heroSubtitle}>
            Choose the plan that fits your team size and needs. All plans include our core burnout detection features.
          </p>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.container}>
          <div style={styles.pricingGrid}>
            {/* Starter Plan */}
            <div style={styles.pricingCard}>
              <div style={styles.planBadge}>Starter</div>
              <div style={styles.priceSection}>
                <span style={styles.priceAmount}>$499</span>
                <span style={styles.pricePeriod}>/month</span>
              </div>
              <p style={styles.planSubtitle}>For small teams getting started</p>
              <ul style={styles.featureList}>
                <li>✓ Up to 25 team members</li>
                <li>✓ Burnout Risk™ Scoring</li>
                <li>✓ Basic communication analytics</li>
                <li>✓ Meeting & focus time insights</li>
                <li>✓ Weekly email reports</li>
                <li>✓ Slack/Teams integration</li>
                <li>✓ Google/Outlook calendar</li>
                <li>✓ Email support</li>
              </ul>
              <Link to="/contact" style={styles.planButton}>Start Free Trial</Link>
            </div>

            {/* Professional Plan */}
            <div style={{...styles.pricingCard, ...styles.featuredCard}}>
              <div style={styles.popularBadge}>Most Popular</div>
              <div style={styles.planBadge}>Professional</div>
              <div style={styles.priceSection}>
                <span style={styles.priceAmount}>$1,299</span>
                <span style={styles.pricePeriod}>/month</span>
              </div>
              <p style={styles.planSubtitle}>For growing teams</p>
              <ul style={styles.featureList}>
                <li>✓ Up to 100 team members</li>
                <li>✓ Everything in Starter, plus:</li>
                <li>✓ Individual team analytics</li>
                <li>✓ Company-wide dashboard</li>
                <li>✓ Advanced sentiment analysis</li>
                <li>✓ Collaboration network insights</li>
                <li>✓ Custom alerts & workflows</li>
                <li>✓ Department comparisons</li>
                <li>✓ Historical trend analysis</li>
                <li>✓ Priority support</li>
              </ul>
              <Link to="/contact" style={styles.planButtonPrimary}>Start Free Trial</Link>
            </div>

            {/* Enterprise Plan */}
            <div style={styles.pricingCard}>
              <div style={styles.planBadge}>Enterprise</div>
              <div style={styles.priceSection}>
                <span style={styles.priceAmount}>Custom</span>
              </div>
              <p style={styles.planSubtitle}>For large organizations</p>
              <ul style={styles.featureList}>
                <li>✓ Unlimited team members</li>
                <li>✓ Everything in Professional, plus:</li>
                <li>✓ Dedicated account manager</li>
                <li>✓ Custom integrations & HRIS</li>
                <li>✓ Advanced security controls</li>
                <li>✓ SSO & SAML authentication</li>
                <li>✓ Custom data retention policies</li>
                <li>✓ White-label reporting</li>
                <li>✓ API access</li>
                <li>✓ 24/7 premium support</li>
                <li>✓ Onboarding & training</li>
              </ul>
              <Link to="/contact" style={styles.planButton}>Contact Sales</Link>
            </div>
          </div>

          <div style={styles.trialNote}>
            <p>All plans include a 14-day free trial. No credit card required.</p>
          </div>
        </div>
      </section>

      <section style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Frequently Asked Questions</h2>

          <div style={styles.faqGrid}>
            <div style={styles.faqCard}>
              <h3 style={styles.faqQuestion}>How is pricing calculated?</h3>
              <p style={styles.faqAnswer}>
                Pricing is based on the number of active team members in your organization. 
                You can add or remove members at any time, and billing adjusts automatically.
              </p>
            </div>

            <div style={styles.faqCard}>
              <h3 style={styles.faqQuestion}>What's included in the free trial?</h3>
              <p style={styles.faqAnswer}>
                All plans include a 14-day free trial with full access to features. No credit card required. 
                Cancel anytime during the trial with no charges.
              </p>
            </div>

            <div style={styles.faqCard}>
              <h3 style={styles.faqQuestion}>Can I change plans later?</h3>
              <p style={styles.faqAnswer}>
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                and billing is prorated.
              </p>
            </div>

            <div style={styles.faqCard}>
              <h3 style={styles.faqQuestion}>What integrations are included?</h3>
              <p style={styles.faqAnswer}>
                All plans include Slack, Microsoft Teams, Google Calendar, and Outlook Calendar integrations. 
                Enterprise plans can add custom HRIS and other integrations.
              </p>
            </div>

            <div style={styles.faqCard}>
              <h3 style={styles.faqQuestion}>Is there a setup fee?</h3>
              <p style={styles.faqAnswer}>
                No setup fees for Starter and Professional plans. Enterprise plans may include optional 
                onboarding and training services.
              </p>
            </div>

            <div style={styles.faqCard}>
              <h3 style={styles.faqQuestion}>What payment methods do you accept?</h3>
              <p style={styles.faqAnswer}>
                We accept all major credit cards, ACH transfers, and can accommodate wire transfers for 
                Enterprise customers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{...styles.section, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white'}}>
        <div style={styles.container}>
          <h2 style={{...styles.sectionTitle, color: 'white'}}>Ready to Get Started?</h2>
          <p style={{...styles.heroSubtitle, color: 'rgba(255,255,255,0.9)', marginBottom: '2rem'}}>
            Start your 14-day free trial today. No credit card required.
          </p>
          <Link to="/contact" style={{...styles.planButtonPrimary, background: 'white', color: '#6366f1'}}>
            Request A Demo
          </Link>
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
  hero: { padding: '5rem 2rem 3rem', background: 'linear-gradient(to bottom, #f9fafb, white)', textAlign: 'center' },
  container: { maxWidth: '1200px', margin: '0 auto' },
  heroTitle: { fontSize: '3rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' },
  heroSubtitle: { fontSize: '1.25rem', color: '#6b7280', lineHeight: 1.6, maxWidth: '800px', margin: '0 auto' },
  section: { padding: '4rem 2rem' },
  pricingGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' },
  pricingCard: { background: 'white', border: '2px solid #e5e7eb', borderRadius: '16px', padding: '2.5rem', position: 'relative' },
  featuredCard: { border: '2px solid #6366f1', transform: 'scale(1.05)', boxShadow: '0 10px 30px rgba(99, 102, 241, 0.15)' },
  popularBadge: { position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', padding: '0.4rem 1.5rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' },
  planBadge: { fontSize: '0.9rem', fontWeight: '600', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' },
  priceSection: { marginBottom: '1rem' },
  priceAmount: { fontSize: '3rem', fontWeight: '700', color: '#111827' },
  pricePeriod: { fontSize: '1.125rem', color: '#6b7280', marginLeft: '0.5rem' },
  planSubtitle: { color: '#6b7280', marginBottom: '2rem', fontSize: '1rem' },
  featureList: { listStyle: 'none', padding: 0, marginBottom: '2rem', color: '#4b5563', lineHeight: 2 },
  planButton: { display: 'block', width: '100%', padding: '0.875rem', background: 'white', color: '#6366f1', border: '2px solid #6366f1', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', textAlign: 'center' },
  planButtonPrimary: { display: 'block', width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', textAlign: 'center' },
  trialNote: { textAlign: 'center', marginTop: '3rem', color: '#6b7280', fontSize: '1.125rem' },
  sectionTitle: { fontSize: '2.5rem', fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: '3rem' },
  faqGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', maxWidth: '1000px', margin: '0 auto' },
  faqCard: { background: 'white', borderRadius: '12px', padding: '2rem', border: '1px solid #e5e7eb' },
  faqQuestion: { fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' },
  faqAnswer: { color: '#6b7280', lineHeight: 1.7 },
  footer: { background: '#111827', color: 'white', padding: '4rem 2rem 2rem' },
  footerContent: { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3rem' },
  footerSection: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  footerHeading: { fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' },
  footerLink: { color: '#9ca3af', textDecoration: 'none', fontSize: '0.95rem' },
  footerBottom: { maxWidth: '1200px', margin: '0 auto', paddingTop: '2rem', borderTop: '1px solid #374151', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' },
};

export default Pricing;
