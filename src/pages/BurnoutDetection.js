import React from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';

function BurnoutDetection() {
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
            Proactive Burnout Detection™
          </h1>
          <p style={styles.heroSubtitle}>
            Identify and prevent team burnout before it leads to turnover. 
            Our AI-powered platform gives you early warning signals so you can support your team at the right time.
          </p>
          <Link to="/contact" style={styles.primaryBtn}>Request A Demo</Link>
        </div>
      </section>

      {/* Problem Section */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Reduce Voluntary Employee Turnover</h2>
          <p style={styles.introText}>
            Our Proactive Burnout Detection™ product is designed to reduce unplanned employee turnover by identifying 
            at-risk team members before they reach their breaking point. SignalTrue generates a <strong>Burnout Risk™ Score</strong> for 
            each individual to help you prioritize support for the right people at the right time.
          </p>

          <div style={styles.highlightBox}>
            <div style={styles.statLarge}>78%</div>
            <p style={styles.statText}>
              of the reasons why employees experience burnout are preventable by the company through early intervention and support.
            </p>
          </div>
        </div>
      </section>

      {/* Burnout Risk Score */}
      <section style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Burnout Risk™ Score Factors</h2>
          <p style={styles.introText}>
            SignalTrue's proprietary Burnout Risk™ score analyzes hundreds of factors to determine the probability 
            of an individual team member experiencing burnout in the next 90 days.
          </p>

          <div style={styles.factorsGrid}>
            <div style={styles.factorCard}>
              <div style={styles.factorIcon}>📊</div>
              <h3 style={styles.factorTitle}>Communication Patterns</h3>
              <ul style={styles.factorList}>
                <li>Message response time trends</li>
                <li>After-hours communication frequency</li>
                <li>Sentiment analysis of written messages</li>
                <li>Decreased participation in team channels</li>
              </ul>
            </div>

            <div style={styles.factorCard}>
              <div style={styles.factorIcon}>📅</div>
              <h3 style={styles.factorTitle}>Meeting & Focus Time</h3>
              <ul style={styles.factorList}>
                <li>Meeting overload indicators</li>
                <li>Lack of focus time blocks</li>
                <li>Meeting hours per week trends</li>
                <li>Calendar fragmentation analysis</li>
              </ul>
            </div>

            <div style={styles.factorCard}>
              <div style={styles.factorIcon}>🤝</div>
              <h3 style={styles.factorTitle}>Collaboration Signals</h3>
              <ul style={styles.factorList}>
                <li>Cross-team collaboration patterns</li>
                <li>Peer interaction changes</li>
                <li>Social network isolation indicators</li>
                <li>Team engagement levels</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Alerts & Workflow */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Proactive Burnout™ Alerts & Cases Workflow</h2>
          <p style={styles.introText}>
            Leveraging SignalTrue's Burnout Risk™ predictions is easy. Our platform automatically generates 
            alerts and creates a Proactive Burnout™ Case for team members predicted to be at high risk.
          </p>

          <div style={styles.workflowSteps}>
            <div style={styles.workflowStep}>
              <div style={styles.workflowNumber}>1</div>
              <div style={styles.workflowContent}>
                <h3 style={styles.workflowTitle}>Risk Score Calculated</h3>
                <p style={styles.workflowText}>
                  Our AI continuously updates a consolidated Burnout Risk™ Score for each team member, 
                  ranging from 1% to 99%, with 99% indicating the highest risk.
                </p>
              </div>
            </div>

            <div style={styles.workflowStep}>
              <div style={styles.workflowNumber}>2</div>
              <div style={styles.workflowContent}>
                <h3 style={styles.workflowTitle}>Alert Generated</h3>
                <p style={styles.workflowText}>
                  When a team member's Burnout Risk™ Score exceeds 60%, SignalTrue alerts you immediately 
                  via email, Slack, or in-app notification.
                </p>
              </div>
            </div>

            <div style={styles.workflowStep}>
              <div style={styles.workflowNumber}>3</div>
              <div style={styles.workflowContent}>
                <h3 style={styles.workflowTitle}>Case Created</h3>
                <p style={styles.workflowText}>
                  A Proactive Burnout™ Case is automatically created with detailed insights, 
                  recommended actions, and conversation starters for managers.
                </p>
              </div>
            </div>

            <div style={styles.workflowStep}>
              <div style={styles.workflowNumber}>4</div>
              <div style={styles.workflowContent}>
                <h3 style={styles.workflowTitle}>Take Action</h3>
                <p style={styles.workflowText}>
                  Your HR or leadership team can decide how to proceed, create a support plan, 
                  and execute on interventions to proactively prevent burnout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Reasons */}
      <section style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Why Team Members Experience Burnout</h2>
          <p style={styles.introText}>
            Understanding the root causes helps you take targeted action. The top reasons include:
          </p>

          <div style={styles.reasonsGrid}>
            <div style={styles.reasonCard}>
              <span style={styles.reasonIcon}>⚖️</span>
              <span style={styles.reasonText}>Work/Life Balance</span>
            </div>
            <div style={styles.reasonCard}>
              <span style={styles.reasonIcon}>📈</span>
              <span style={styles.reasonText}>Excessive Meeting Load</span>
            </div>
            <div style={styles.reasonCard}>
              <span style={styles.reasonIcon}>🎯</span>
              <span style={styles.reasonText}>Lack of Focus Time</span>
            </div>
            <div style={styles.reasonCard}>
              <span style={styles.reasonIcon}>👔</span>
              <span style={styles.reasonText}>Manager Relationship</span>
            </div>
            <div style={styles.reasonCard}>
              <span style={styles.reasonIcon}>🚀</span>
              <span style={styles.reasonText}>Limited Growth Opportunities</span>
            </div>
            <div style={styles.reasonCard}>
              <span style={styles.reasonIcon}>🤝</span>
              <span style={styles.reasonText}>Team Dynamics</span>
            </div>
          </div>

          <div style={styles.calloutBox}>
            <p style={styles.calloutText}>
              Most team members are pleasantly surprised when someone from leadership reaches out to talk about 
              their wellbeing and workload outside the context of a regularly scheduled performance review.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Impact of Proactive Burnout Detection</h2>
          
          <div style={styles.impactGrid}>
            <div style={styles.impactCard}>
              <div style={styles.impactIcon}>✅</div>
              <h3 style={styles.impactTitle}>Reduce Turnover</h3>
              <p style={styles.impactText}>
                By identifying and supporting at-risk team members early, companies see up to 40% reduction 
                in voluntary turnover rates.
              </p>
            </div>

            <div style={styles.impactCard}>
              <div style={styles.impactIcon}>💰</div>
              <h3 style={styles.impactTitle}>Lower Costs</h3>
              <p style={styles.impactText}>
                Preventing one departure saves 1.5-2x annual salary in recruiting, onboarding, and 
                productivity loss costs.
              </p>
            </div>

            <div style={styles.impactCard}>
              <div style={styles.impactIcon}>📈</div>
              <h3 style={styles.impactTitle}>Boost Engagement</h3>
              <p style={styles.impactText}>
                Team members who feel supported show higher engagement, productivity, and commitment 
                to company goals.
              </p>
            </div>

            <div style={styles.impactCard}>
              <div style={styles.impactIcon}>🎯</div>
              <h3 style={styles.impactTitle}>Better Leadership</h3>
              <p style={styles.impactText}>
                Managers gain data-driven insights to have more meaningful 1-on-1 conversations and 
                provide targeted support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{...styles.section, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white'}}>
        <div style={styles.container}>
          <h2 style={{...styles.sectionTitle, color: 'white'}}>
            Start Reducing Burnout Today
          </h2>
          <p style={{...styles.introText, color: 'rgba(255,255,255,0.9)', marginBottom: '2rem'}}>
            See how SignalTrue can help you build a healthier, more resilient team.
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
    padding: '5rem 2rem',
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
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    color: '#6b7280',
    marginBottom: '2.5rem',
    maxWidth: '800px',
    margin: '0 auto 2.5rem',
    lineHeight: 1.6,
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
  section: {
    padding: '5rem 2rem',
  },
  sectionTitle: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  introText: {
    fontSize: '1.125rem',
    color: '#6b7280',
    lineHeight: 1.7,
    maxWidth: '900px',
    margin: '0 auto 3rem',
    textAlign: 'center',
  },
  highlightBox: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    borderRadius: '16px',
    padding: '3rem',
    textAlign: 'center',
    color: 'white',
    maxWidth: '700px',
    margin: '3rem auto 0',
  },
  statLarge: {
    fontSize: '4rem',
    fontWeight: '700',
    marginBottom: '1rem',
  },
  statText: {
    fontSize: '1.25rem',
    lineHeight: 1.6,
  },
  factorsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
  },
  factorCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
  },
  factorIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
  },
  factorTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1rem',
  },
  factorList: {
    color: '#6b7280',
    paddingLeft: '1.5rem',
    lineHeight: 1.8,
  },
  workflowSteps: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  workflowStep: {
    display: 'flex',
    gap: '2rem',
    marginBottom: '3rem',
  },
  workflowNumber: {
    width: '60px',
    height: '60px',
    flexShrink: 0,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: '700',
  },
  workflowContent: {
    flex: 1,
  },
  workflowTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.5rem',
  },
  workflowText: {
    color: '#6b7280',
    lineHeight: 1.7,
  },
  reasonsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '3rem',
  },
  reasonCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  reasonIcon: {
    fontSize: '2rem',
  },
  reasonText: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#111827',
  },
  calloutBox: {
    background: '#eef2ff',
    border: '2px solid #c7d2fe',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto',
  },
  calloutText: {
    fontSize: '1.125rem',
    color: '#4338ca',
    lineHeight: 1.7,
    fontStyle: 'italic',
    textAlign: 'center',
    margin: 0,
  },
  impactGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '2rem',
  },
  impactCard: {
    background: '#f9fafb',
    borderRadius: '12px',
    padding: '2rem',
    textAlign: 'center',
  },
  impactIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
  },
  impactTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.75rem',
  },
  impactText: {
    color: '#6b7280',
    lineHeight: 1.6,
  },
  // Footer styles moved to shared SiteFooter component
};

export default BurnoutDetection;
