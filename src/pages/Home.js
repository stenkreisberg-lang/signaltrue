import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <div style={styles.logo}>SignalTrue</div>
          <div style={styles.navLinks}>
            <a href="#product" style={styles.navLink}>Product</a>
            <a href="#solutions" style={styles.navLink}>Solutions</a>
            <a href="#pricing" style={styles.navLink}>Pricing</a>
            <a href="#about" style={styles.navLink}>About</a>
            <button onClick={() => navigate('/login')} style={styles.loginButton}>
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section (Scoro-like: split with person image) */}
      <section style={styles.heroSplit}>
        <div style={styles.heroGrid}>
          <div style={styles.heroLeft}>
            <h1 style={styles.heroTitle}>
              Run healthier teams with SignalTrue
            </h1>
            <p style={styles.heroSubtitle}>
              Turn signals from Slack and calendars into clear actions. Spot burnout risk early, coach better, and create sustainable performance.
            </p>
            <div style={styles.heroCTA}>
              <button onClick={() => navigate('/register')} style={styles.primaryButton}>
                Start free trial
              </button>
              <button onClick={() => navigate('/login')} style={styles.secondaryButton}>
                Sign in
              </button>
            </div>
          </div>
          <div style={styles.heroRight}>
            <img src="/images/hero-person.svg" alt="Leader illustration" style={styles.heroImg} />
          </div>
        </div>
      </section>

      {/* Product Section */}
      <section id="product" style={styles.section}>
        <div style={styles.sectionContent}>
          <h2 style={styles.sectionTitle}>Built for Modern Leaders</h2>
          <div style={styles.features}>
            <div style={styles.feature}>
              <div style={styles.featureIcon}>📊</div>
              <h3 style={styles.featureTitle}>Real-Time Burnout Detection</h3>
              <p style={styles.featureText}>
                Track team health with our proprietary Burnout Detection Index (BDI). 
                See patterns before they become problems.
              </p>
            </div>
            <div style={styles.feature}>
              <div style={styles.featureIcon}>🎯</div>
              <h3 style={styles.featureTitle}>AI-Powered Insights</h3>
              <p style={styles.featureText}>
                Get weekly narratives and actionable recommendations tailored to 
                your team's unique dynamics and industry benchmarks.
              </p>
            </div>
            <div style={styles.feature}>
              <div style={styles.featureIcon}>🔗</div>
              <h3 style={styles.featureTitle}>Seamless Integration</h3>
              <p style={styles.featureText}>
                Connect Slack, Google Calendar, and your existing tools. 
                No extra work for your team—just better insights for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section (dashboards and numbers) */}
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

      {/* Pricing Section */}
      <section id="pricing" style={styles.section}>
        <div style={styles.sectionContent}>
          <h2 style={styles.sectionTitle}>Simple, Transparent Pricing</h2>
          <div style={styles.pricingGrid}>
            <div style={styles.pricingCard}>
              <h3 style={styles.pricingTier}>Starter</h3>
              <div style={styles.price}>
                <span style={styles.priceAmount}>$99</span>
                <span style={styles.pricePer}>/month</span>
              </div>
              <ul style={styles.pricingFeatures}>
                <li>Up to 3 teams</li>
                <li>Basic BDI tracking</li>
                <li>Weekly summaries</li>
                <li>Email support</li>
              </ul>
              <button onClick={() => navigate('/register')} style={styles.pricingButton}>
                Start Free Trial
              </button>
            </div>
            <div style={{...styles.pricingCard, ...styles.pricingCardFeatured}}>
              <div style={styles.featuredBadge}>Most Popular</div>
              <h3 style={styles.pricingTier}>Professional</h3>
              <div style={styles.price}>
                <span style={styles.priceAmount}>$299</span>
                <span style={styles.pricePer}>/month</span>
              </div>
              <ul style={styles.pricingFeatures}>
                <li>Unlimited teams</li>
                <li>Advanced analytics & forecasting</li>
                <li>AI-powered insights</li>
                <li>Industry benchmarking</li>
                <li>Priority support</li>
              </ul>
              <button onClick={() => navigate('/register')} style={styles.pricingButtonFeatured}>
                Start Free Trial
              </button>
            </div>
            <div style={styles.pricingCard}>
              <h3 style={styles.pricingTier}>Enterprise</h3>
              <div style={styles.price}>
                <span style={styles.priceAmount}>Custom</span>
              </div>
              <ul style={styles.pricingFeatures}>
                <li>Everything in Professional</li>
                <li>Custom integrations</li>
                <li>Dedicated success manager</li>
                <li>SLA & security reviews</li>
              </ul>
              <button onClick={() => window.location.href = 'mailto:sales@signaltrue.ai'} style={styles.pricingButton}>
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.sectionContent}>
          <h2 style={styles.sectionTitle}>About SignalTrue</h2>
          <p style={styles.aboutText}>
            We believe people analytics should be meaningful, not just metrics. SignalTrue was 
            built by leaders who've experienced burnout firsthand and wanted better tools to 
            support their teams.
          </p>
          <p style={styles.aboutText}>
            Our mission is simple: give managers the context and insights they need to make 
            great decisions about team health, before small issues become big problems.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerLogo}>SignalTrue</div>
          <div style={styles.footerLinks}>
            <a href="mailto:support@signaltrue.ai" style={styles.footerLink}>Support</a>
            <a href="mailto:sales@signaltrue.ai" style={styles.footerLink}>Sales</a>
            <span style={styles.footerLink}>Privacy</span>
            <span style={styles.footerLink}>Terms</span>
          </div>
          <div style={styles.footerCopy}>
            © 2025 SignalTrue. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'white',
  },
  nav: {
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '1rem 2rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
  },
  navLink: {
    color: '#4b5563',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  loginButton: {
    padding: '0.5rem 1.5rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  hero: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '6rem 2rem',
    textAlign: 'center',
  },
  heroSplit: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '5rem 2rem',
  },
  heroGrid: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: '2rem',
    alignItems: 'center',
  },
  heroLeft: {
    color: 'white',
  },
  heroRight: {
    display: 'flex',
    justifyContent: 'center',
  },
  heroImg: {
    width: '100%',
    maxWidth: '460px',
    borderRadius: '16px',
    boxShadow: '0 30px 60px rgba(0,0,0,0.25)'
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  heroTitle: {
    fontSize: '3rem',
    fontWeight: '700',
    color: 'white',
    marginBottom: '1.5rem',
    lineHeight: '1.2',
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: '2rem',
    lineHeight: '1.6',
  },
  heroCTA: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  primaryButton: {
    padding: '1rem 2rem',
    background: 'white',
    color: '#6366f1',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '1rem 2rem',
    background: 'transparent',
    color: 'white',
    border: '2px solid white',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  section: {
    padding: '4rem 2rem',
  },
  sectionContent: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '2.5rem',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '3rem',
    color: '#111827',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
  },
  feature: {
    textAlign: 'center',
    padding: '2rem',
  },
  featureIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  featureTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#111827',
  },
  featureText: {
    color: '#6b7280',
    lineHeight: '1.6',
  },
  whyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2.5rem',
  },
  metric: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.25rem',
    textAlign: 'center',
    border: '1px solid #e5e7eb',
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  metricLabel: {
    color: '#6b7280',
    fontWeight: 600,
  },
  dashboardsRow: {
    display: 'flex',
    justifyContent: 'center',
  },
  dashboardImg: {
    width: '100%',
    maxWidth: '900px',
    borderRadius: '14px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 16px 40px rgba(0,0,0,0.12)'
  },
  whyItem: {
    padding: '2rem',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: '1rem 0',
  },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '2rem',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  pricingCard: {
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
    textAlign: 'center',
    position: 'relative',
  },
  pricingCardFeatured: {
    border: '2px solid #6366f1',
    transform: 'scale(1.05)',
  },
  featuredBadge: {
    position: 'absolute',
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#6366f1',
    color: 'white',
    padding: '0.25rem 1rem',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  pricingTier: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '1rem',
    color: '#111827',
  },
  price: {
    marginBottom: '1.5rem',
  },
  priceAmount: {
    fontSize: '3rem',
    fontWeight: '700',
    color: '#111827',
  },
  pricePer: {
    color: '#6b7280',
    fontSize: '1rem',
  },
  pricingFeatures: {
    listStyle: 'none',
    padding: 0,
    margin: '1.5rem 0',
    textAlign: 'left',
  },
  pricingButton: {
    width: '100%',
    padding: '0.75rem',
    background: 'white',
    color: '#6366f1',
    border: '2px solid #6366f1',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  pricingButtonFeatured: {
    width: '100%',
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  aboutText: {
    fontSize: '1.125rem',
    color: '#4b5563',
    lineHeight: '1.8',
    maxWidth: '800px',
    margin: '0 auto 1.5rem',
    textAlign: 'center',
  },
  footer: {
    background: '#111827',
    color: 'white',
    padding: '3rem 2rem',
  },
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    textAlign: 'center',
  },
  footerLogo: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '1rem',
  },
  footerLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginBottom: '1rem',
  },
  footerLink: {
    color: '#9ca3af',
    textDecoration: 'none',
  },
  footerCopy: {
    color: '#6b7280',
    fontSize: '0.875rem',
  },
};

export default Home;
