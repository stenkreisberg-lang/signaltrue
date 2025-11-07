import React from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';
import InlineNotice from '../components/InlineNotice';
import { API_BASE } from '../utils/api';
function Pricing() {
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
              <Link to="/login" style={styles.loginBtn}>Login</Link>
            </div>
          </div>
        </nav>

        <section style={styles.hero}>
          <div style={styles.container}>
            <h1 style={styles.heroTitle}>Simple plans to help HR grow engagement continuously.</h1>
            <p style={styles.heroSubtitle}>
              Continuous Engagement Insight™ for every team size. 30-day free trial — credit card required to start.
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.container}>
            {billingError && (
              <InlineNotice kind="error" title="Payments temporarily unavailable:">{billingError}</InlineNotice>
            )}
            <div style={styles.pricingGrid}>
              {/* Starter Plan */}
              <div style={styles.pricingCard}>
                <div style={styles.planBadge}>Starter</div>
                <div style={styles.priceSection}>
                  <span style={styles.priceAmount}>€99</span>
                  <span style={styles.pricePeriod}>/month</span>
                </div>
                <p style={styles.planSubtitle}>Up to 20 people</p>
                <ul style={styles.featureList}>
                  <li>Continuous engagement tracking</li>
                  <li>Team Health Score</li>
                  <li>Weekly HR Insight Brief</li>
                </ul>
                <button style={styles.planButton} onClick={() => handleStartTrial('starter')} disabled={loadingPlan === 'starter'}>
                  {loadingPlan === 'starter' ? 'Starting…' : 'Get Early Access'}
                </button>
              </div>

              {/* Growth Plan */}
              <div style={{...styles.pricingCard, ...styles.featuredCard}}>
                <div style={styles.popularBadge}>Most Popular</div>
                <div style={styles.planBadge}>Growth</div>
                <div style={styles.priceSection}>
                  <span style={styles.priceAmount}>€299</span>
                  <span style={styles.pricePeriod}>/month</span>
                </div>
                <p style={styles.planSubtitle}>Everything in Starter</p>
                <ul style={styles.featureList}>
                  <li>Trend analytics and benchmarking</li>
                  <li>Engagement evolution dashboard</li>
                  <li>Privacy & retention controls</li>
                </ul>
                <button style={styles.planButtonPrimary} onClick={() => handleStartTrial('pro')} disabled={loadingPlan === 'pro'}>
                  {loadingPlan === 'pro' ? 'Starting…' : 'Get Early Access'}
                </button>
              </div>

              {/* Enterprise Plan */}
              <div style={styles.pricingCard}>
                <div style={styles.planBadge}>Enterprise</div>
                <div style={styles.priceSection}>
                  <span style={styles.priceAmount}>Custom</span>
                </div>
                <p style={styles.planSubtitle}>Everything in Growth</p>
                <ul style={styles.featureList}>
                  <li>API & BI integrations</li>
                  <li>Regional data residency</li>
                  <li>Dedicated success manager</li>
                </ul>
                <a href="mailto:sales@signaltrue.ai" style={styles.planButton}>Get Early Access</a>
              </div>
            </div>

            <div style={styles.trialNote}>
              <p>No individual monitoring. All analytics aggregated by team.</p>
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
                  Pricing is based on the number of active team members in your organization. You can add or remove members at any time, and billing adjusts automatically.
                </p>
              </div>
              <div style={styles.faqCard}>
                <h3 style={styles.faqQuestion}>What's included in the free trial?</h3>
                <p style={styles.faqAnswer}>
                  All plans include a 30-day free trial with full access to features. Credit card required to start. Cancel anytime during the trial with no charges.
                </p>
              </div>
              <div style={styles.faqCard}>
                <h3 style={styles.faqQuestion}>Can I change plans later?</h3>
                <p style={styles.faqAnswer}>
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated.
                </p>
              </div>
              <div style={styles.faqCard}>
                <h3 style={styles.faqQuestion}>Is it GDPR compliant?</h3>
                <p style={styles.faqAnswer}>
                  Yes. Regional storage, encryption, and retention control are built in.
                </p>
              </div>
              <div style={styles.faqCard}>
                <h3 style={styles.faqQuestion}>Does SignalTrue monitor individuals?</h3>
                <p style={styles.faqAnswer}>
                  No. All data is team-level and anonymised.
                </p>
              </div>
              <div style={styles.faqCard}>
                <h3 style={styles.faqQuestion}>What makes SignalTrue different?</h3>
                <p style={styles.faqAnswer}>
                  It provides continuous insight, not one-off survey results.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section style={{...styles.section, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white'}}>
          <div style={styles.container}>
            <h2 style={{...styles.sectionTitle, color: 'white'}}>Ready to Get Started?</h2>
            <p style={{...styles.heroSubtitle, color: 'rgba(255,255,255,0.9)', marginBottom: '2rem'}}>
              Discover how Continuous Engagement Insight™ helps HR build thriving teams.
            </p>
            <Link to="/contact" style={{...styles.planButtonPrimary, background: 'white', color: '#6366f1'}}>
              Get Early Access
            </Link>
          </div>
        </section>

        <footer style={{background:'#f9fafb',padding:'2rem 0',textAlign:'center'}}>
          <span style={{color:'#6b7280',fontSize:'1rem'}}>Privacy-first: SignalTrue analyzes patterns, not private content. <Link to="/privacy" style={styles.navLink}>Learn more</Link>.</span>
        </footer>

        <SiteFooter />
      </div>
    </>
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
  // Footer styles moved to SiteFooter component
};

export default Pricing;
