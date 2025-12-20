import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import InlineNotice from '../components/InlineNotice';
import api from '../utils/api';

const tiers = [
  {
    id: 'starter',
    name: 'Starter',
    priceId: 'price_1N...',
    features: [
      'Continuous engagement tracking',
      'Team Health Score',
      'Weekly HR Insight Brief',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    priceId: 'price_1N...',
    features: [
      'Everything in Starter',
      'Trend analytics and benchmarking',
      'Engagement evolution dashboard',
      'Privacy & retention controls',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceId: null,
    features: [
      'Everything in Growth',
      'API & BI integrations',
      'Regional data residency',
      'Dedicated success manager',
    ],
  },
];

const Pricing = () => {
  const [loadingPlan, setLoadingPlan] = useState('');
  const [billingError, setBillingError] = useState(null);

  const handleStartTrial = async (plan) => {
    setLoadingPlan(plan.id);
    setBillingError(null);
    try {
      const response = await api.post('/billing/create-checkout-session', { priceId: plan.priceId, trial: true });
      const session = response.data;
      if (response.ok) {
        window.location.href = session.url;
      } else {
        setBillingError(session.message || 'An error occurred.');
      }
    } catch (error) {
      setBillingError('An error occurred.');
    } finally {
      setLoadingPlan('');
    }
  };

  return (
    <div className="bg-gray-900">
      <SiteHeader />
      <div style={styles.page}>
        <section style={styles.hero}>
          <div style={styles.container}>
            <h1 style={styles.heroTitle}>Prevent burnout, disengagement, and overload before they cost you people</h1>
            <p style={styles.heroSubtitle}>
              Pricing scales with insight depth and governance — not surveillance.
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
                <div style={{fontSize:12, textTransform:'uppercase', color:'#94a3b8', marginBottom:5, fontWeight:700}}>Best For</div>
                <p style={styles.planSubtitle}>Small teams wanting early warning</p>
                <div style={styles.priceSection}>
                  <span style={styles.priceAmount}>€99</span>
                  <span style={styles.pricePeriod}>/month</span>
                </div>
                <ul style={styles.featureList}>
                  <li>Weekly team health summaries</li>
                  <li>Drift detection</li>
                  <li>Slack & Calendar integration</li>
                  <li>Privacy-first defaults</li>
                </ul>
                <button style={styles.planButton} onClick={() => handleStartTrial('starter')} disabled={loadingPlan === 'starter'}>
                  {loadingPlan === 'starter' ? 'Starting…' : 'Request early access'}
                </button>
              </div>

              {/* Growth Plan */}
              <div style={{...styles.pricingCard, ...styles.featuredCard}}>
                <div style={styles.popularBadge}>Most Popular</div>
                <div style={styles.planBadge}>Growth</div>
                <div style={{fontSize:12, textTransform:'uppercase', color:'#94a3b8', marginBottom:5, fontWeight:700}}>Best For</div>
                <p style={styles.planSubtitle}>Scaling teams in change</p>
                <div style={styles.priceSection}>
                  <span style={styles.priceAmount}>€299</span>
                  <span style={styles.pricePeriod}>/month</span>
                </div>
                <ul style={styles.featureList}>
                  <li>Advanced drift explainability</li>
                  <li>Micro playbook recommendations</li>
                  <li>Program impact tracking</li>
                  <li>Manager-level insights</li>
                </ul>
                <button style={styles.planButtonPrimary} onClick={() => handleStartTrial('pro')} disabled={loadingPlan === 'pro'}>
                  {loadingPlan === 'pro' ? 'Starting…' : 'Request early access'}
                </button>
              </div>

              {/* Enterprise Plan */}
              <div style={styles.pricingCard}>
                <div style={styles.planBadge}>Enterprise</div>
                <div style={{fontSize:12, textTransform:'uppercase', color:'#94a3b8', marginBottom:5, fontWeight:700}}>Best For</div>
                <p style={styles.planSubtitle}>Distributed or regulated orgs</p>
                <div style={styles.priceSection}>
                  <span style={styles.priceAmount}>Custom</span>
                </div>
                <ul style={styles.featureList}>
                  <li>Custom aggregation rules</li>
                  <li>Data exports & API</li>
                  <li>Advanced compliance controls</li>
                  <li>Dedicated onboarding</li>
                </ul>
                <a href="mailto:sales@signaltrue.ai" style={styles.planButton}>Contact Sales</a>
              </div>
            </div>

            <div style={{marginTop:48, display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, maxWidth:800, margin:'48px auto 0'}}>
              <div style={{background:'white', padding:24, borderRadius:8, borderLeft:'4px solid #ef4444'}}>
                <h3 style={{fontSize:'1.25rem', fontWeight:700, marginBottom:12}}>What you are not paying for</h3>
                <ul style={{listStyle:'none', padding:0, margin:0}}>
                  <li>✗ Employee monitoring</li>
                  <li>✗ Productivity scoring</li>
                  <li>✗ Individual rankings</li>
                </ul>
              </div>
              <div style={{background:'white', padding:24, borderRadius:8, borderLeft:'4px solid #059669'}}>
                <h3 style={{fontSize:'1.25rem', fontWeight:700, marginBottom:12}}>What you are paying for</h3>
                <ul style={{listStyle:'none', padding:0, margin:0}}>
                  <li>✓ Early detection</li>
                  <li>✓ Better leadership decisions</li>
                  <li>✓ Healthier teams that last</li>
                </ul>
              </div>
            </div>

            <div style={styles.trialNote}>
              <p>No individual tracking. Team-level signals only. GDPR-aligned.</p>
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
  // Footer styles moved to SiteFooter component
};

export default Pricing;
