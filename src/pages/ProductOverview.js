import React from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';

function ProductOverview() {
  return (
    <div style={styles.page}>
      {/* Navigation */}
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
          <h1 style={styles.heroTitle}>
            Real-Time Team Health Insights<br />Powered by AI
          </h1>
          <p style={styles.heroSubtitle}>
            SignalTrue delivers proactive burnout detection and team wellness insights to help you retain top talent, 
            energize your team, and build a thriving workplace culture.
          </p>
          <div style={styles.heroCTA}>
            <Link to="/contact" style={styles.primaryBtn}>Request A Demo</Link>
            <Link to="/how-it-works" style={styles.secondaryBtn}>Learn More</Link>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Proactive Team Health Management</h2>
          
          <div style={styles.featureGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🎯</div>
              <h3 style={styles.featureTitle}>Burnout Risk Detection</h3>
              <p style={styles.featureText}>
                Our AI analyzes communication patterns, meeting load, and work signals to identify team members 
                at risk of burnout before they reach their breaking point.
              </p>
              <Link to="/burnout-detection" style={styles.featureLink}>
                Learn more about Burnout Detection →
              </Link>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>👥</div>
              <h3 style={styles.featureTitle}>Individual Team Insights</h3>
              <p style={styles.featureText}>
                Get personalized analytics for each team member including engagement trends, collaboration patterns, 
                and focus time metrics to support better 1-on-1 conversations.
              </p>
              <Link to="/team-analytics" style={styles.featureLink}>
                Explore Team Analytics →
              </Link>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>📊</div>
              <h3 style={styles.featureTitle}>Company-Wide Analytics</h3>
              <p style={styles.featureText}>
                Understand organization-wide trends, compare departments, track engagement over time, 
                and benchmark against industry standards.
              </p>
              <Link to="/company-dashboard" style={styles.featureLink}>
                View Company Analytics →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Preview */}
      <section style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>How SignalTrue Works</h2>
          <p style={styles.sectionSubtitle}>
            Simple integration. Powerful insights. Privacy-first approach.
          </p>

          <div style={styles.stepsGrid}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <h3 style={styles.stepTitle}>Connect Your Tools</h3>
              <p style={styles.stepText}>
                Integrate Slack, Microsoft Teams, Google Calendar, and your calendar platform in minutes. 
                No invasive access required.
              </p>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <h3 style={styles.stepTitle}>AI Analyzes Patterns</h3>
              <p style={styles.stepText}>
                Our AI processes communication sentiment, meeting load, response times, and collaboration patterns 
                while maintaining complete anonymity.
              </p>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <h3 style={styles.stepTitle}>Get Actionable Insights</h3>
              <p style={styles.stepText}>
                Receive proactive alerts, personalized recommendations, and trend analysis to help you 
                support your team before issues escalate.
              </p>
            </div>
          </div>

          <div style={{textAlign: 'center', marginTop: '3rem'}}>
            <Link to="/how-it-works" style={styles.primaryBtn}>
              Learn More About Our Technology
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Why Companies Choose SignalTrue</h2>
          
          <div style={styles.benefitsGrid}>
            <div style={styles.benefitCard}>
              <div style={styles.statNumber}>78%</div>
              <p style={styles.statLabel}>of burnout factors are preventable with early intervention</p>
            </div>
            
            <div style={styles.benefitCard}>
              <div style={styles.statNumber}>2x</div>
              <p style={styles.statLabel}>employee retention improvement with proactive wellness programs</p>
            </div>
            
            <div style={styles.benefitCard}>
              <div style={styles.statNumber}>5min</div>
              <p style={styles.statLabel}>average setup time with no IT department required</p>
            </div>
          </div>

          <div style={styles.testimonial}>
            <p style={styles.testimonialQuote}>
              "SignalTrue helped us identify burnout risks before they became turnover. 
              The insights have transformed how we support our team's wellbeing."
            </p>
            <p style={styles.testimonialAuthor}>
              — VP of People Operations, Tech Startup
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{...styles.section, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white'}}>
        <div style={styles.container}>
          <h2 style={{...styles.sectionTitle, color: 'white'}}>
            Ready to Build a Healthier Workplace?
          </h2>
          <p style={{...styles.sectionSubtitle, color: 'rgba(255,255,255,0.9)', marginBottom: '2rem'}}>
            Free demo. No strings attached.
          </p>
          <Link to="/contact" style={{...styles.primaryBtn, background: 'white', color: '#6366f1'}}>
            Request A Demo
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

const styles = {
  page: {
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
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
  },
  logoImg: {
    height: '32px',
    width: '32px',
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  navLinks: {
    display: 'flex',
    gap: '2rem',
    alignItems: 'center',
  },
  navLink: {
    color: '#4b5563',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  loginBtn: {
    padding: '0.5rem 1.5rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
  },
  hero: {
    padding: '6rem 2rem',
    background: 'linear-gradient(to bottom, #f9fafb, white)',
    textAlign: 'center',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  heroTitle: {
    fontSize: '3rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '1.5rem',
    lineHeight: 1.2,
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    color: '#6b7280',
    marginBottom: '2.5rem',
    maxWidth: '800px',
    margin: '0 auto 2.5rem',
    lineHeight: 1.6,
  },
  heroCTA: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  primaryBtn: {
    padding: '0.875rem 2rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '1rem',
    display: 'inline-block',
  },
  secondaryBtn: {
    padding: '0.875rem 2rem',
    background: 'white',
    color: '#6366f1',
    border: '2px solid #6366f1',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '1rem',
    display: 'inline-block',
  },
  section: {
    padding: '5rem 2rem',
  },
  sectionTitle: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: '1rem',
  },
  sectionSubtitle: {
    fontSize: '1.125rem',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '3rem',
    maxWidth: '700px',
    margin: '0 auto 3rem',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '2rem',
    marginTop: '3rem',
  },
  featureCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
  },
  featureIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  featureTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1rem',
  },
  featureText: {
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: '1.5rem',
  },
  featureLink: {
    color: '#6366f1',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.95rem',
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '3rem',
    marginTop: '3rem',
  },
  step: {
    textAlign: 'center',
  },
  stepNumber: {
    width: '60px',
    height: '60px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: '0 auto 1.5rem',
  },
  stepTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.75rem',
  },
  stepText: {
    color: '#6b7280',
    lineHeight: 1.6,
  },
  benefitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    marginBottom: '4rem',
  },
  benefitCard: {
    textAlign: 'center',
    padding: '2rem',
    background: '#f9fafb',
    borderRadius: '12px',
  },
  statNumber: {
    fontSize: '3rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem',
  },
  statLabel: {
    color: '#6b7280',
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  testimonial: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '3rem',
    background: '#f9fafb',
    borderRadius: '12px',
    textAlign: 'center',
  },
  testimonialQuote: {
    fontSize: '1.25rem',
    color: '#111827',
    fontStyle: 'italic',
    lineHeight: 1.6,
    marginBottom: '1rem',
  },
  testimonialAuthor: {
    color: '#6b7280',
    fontWeight: '600',
  },
  // Footer styles moved to shared SiteFooter component
};

export default ProductOverview;
