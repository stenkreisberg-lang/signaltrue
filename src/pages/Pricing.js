import React from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';
import InlineNotice from '../components/InlineNotice';
import { API_BASE } from '../utils/api';
function Pricing() {
  const [billingError, setBillingError] = React.useState(null);
  const [loadingPlan, setLoadingPlan] = React.useState(null);

  async function handleStartTrial(plan) {
    try {
      setBillingError(null);
      setLoadingPlan(plan);
      const orgSlug = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('orgSlug')) || undefined;
      const res = await fetch(`${API_BASE}/api/billing/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, orgSlug }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Billing is not configured yet. Please contact support.');
      }
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setBillingError('Billing is not configured yet. Please contact support.');
      }
    } catch (e) {
      setBillingError(e.message || 'Could not start trial.');
    } finally {
      setLoadingPlan(null);
    }
  }
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
            8 high-impact signals. Drift alerts with explainability. Micro-playbooks. Choose the plan that fits your team. 30-day free trial—credit card required to start.
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
                <span style={styles.priceAmount}>$499</span>
                <span style={styles.pricePeriod}>/month</span>
              </div>
              <p style={styles.planSubtitle}>For small teams getting started</p>
              <ul style={styles.featureList}>
                <li>✓ Up to 25 team members</li>
                <li>✓ 8-signal analytics (Energy Index, sentiment, meetings, latency, after-hours, network, focus, recovery)</li>
                <li>✓ Team health baselines</li>
                <li>✓ Basic drift alerts (Slack/email)</li>
                <li>✓ Weekly brief reports</li>
                <li>✓ Slack/Google/Microsoft OAuth</li>
                <li>✓ Regional data residency (EU/US)</li>
                <li>✓ Email support</li>
              </ul>
              <button style={styles.planButton} onClick={() => handleStartTrial('starter')} disabled={loadingPlan === 'starter'}>
                {loadingPlan === 'starter' ? 'Starting…' : 'Start Free Trial'}
              </button>
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
                <li>✓ Drift explainability (top 3 contributors shown)</li>
                <li>✓ Micro-playbook recommendations (action suggestions)</li>
                <li>✓ Timeline event overlay (annotate charts with launches/reorgs)</li>
                <li>✓ Alert frequency control (daily/weekly/off)</li>
                <li>✓ Advanced sentiment shift detection</li>
                <li>✓ Network breadth & collaboration insights</li>
                <li>✓ Historical trend analysis (3 months)</li>
                <li>✓ Priority support</li>
              </ul>
              <button style={styles.planButtonPrimary} onClick={() => handleStartTrial('pro')} disabled={loadingPlan === 'pro'}>
                {loadingPlan === 'pro' ? 'Starting…' : 'Start Free Trial'}
              </button>
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
                <li>✓ Program Impact Tracker (before/after energy + ROI)</li>
                <li>✓ API key management (create/rotate/revoke tokens)</li>
                <li>✓ CSV export for BI tools (metrics + drift events)</li>
                <li>✓ REST API endpoints (full access)</li>
                <li>✓ Custom integrations & HRIS</li>
                <li>✓ SSO & SAML authentication</li>
                <li>✓ AES-256 encryption + custom data retention</li>
                <li>✓ White-label reporting</li>
                <li>✓ Dedicated account manager</li>
                <li>✓ 24/7 premium support</li>
                <li>✓ Onboarding & training</li>
              </ul>
              <Link to="/contact" style={styles.planButton}>Contact Sales</Link>
            </div>
          </div>

          <div style={styles.trialNote}>
            <p>All plans include a 30-day free trial. Credit card required to start.</p>
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
                All plans include a 30-day free trial with full access to features. Credit card required to start. 
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
            Start your 30-day free trial today. Credit card required to start.
          </p>
          <Link to="/contact" style={{...styles.planButtonPrimary, background: 'white', color: '#6366f1'}}>
            Request A Demo
          </Link>
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
