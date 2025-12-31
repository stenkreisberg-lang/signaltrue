import React from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';

// Minimal styles object for CapacityRiskDetection page

function CapacityRiskDetection() {
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
            Proactive Capacity Risk Detection™
          </h1>
          <p style={styles.heroSubtitle}>
            Identify and prevent team capacity risk before it leads to turnover. 
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
            Our Proactive Capacity Risk Detection™ product is designed to reduce unplanned employee turnover by identifying 
            at-risk teams before they reach their breaking point. SignalTrue generates a <strong>Capacity Risk Score</strong> for 
            each team to help you prioritize support for the right people at the right time.
          </p>

          <p style={styles.statCallout}>
            <span style={styles.statNumber}>85%</span><br />
            of the reasons why employees experience sustained overload are preventable by the company through early intervention and support.
          </p>
        </div>
      </section>

      {/* Capacity Risk Score */}
      <section style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Capacity Risk Score Factors</h2>
          <p style={styles.introText}>
            SignalTrue's proprietary Capacity Risk score analyzes hundreds of factors to determine the probability 
            of a team experiencing sustained overload in the next 90 days.
          </p>

          <div style={styles.factorsGrid}>
            <div style={styles.factorCard}>
              <span style={styles.factorIcon}>📅</span>
              <h3 style={styles.factorTitle}>Coordination Load</h3>
              <p style={styles.factorText}>
                Excessive meeting time, fragmented focus blocks, and context-switching patterns that indicate coordination overhead.
              </p>
            </div>

            <div style={styles.factorCard}>
              <span style={styles.factorIcon}>💬</span>
              <h3 style={styles.factorTitle}>Communication Patterns</h3>
              <p style={styles.factorText}>
                Unusual response time changes, after-hours activity spikes, and sentiment shifts in team communications.
              </p>
            </div>

            <div style={styles.factorCard}>
              <span style={styles.factorIcon}>🎯</span>
              <h3 style={styles.factorTitle}>Focus Time</h3>
              <p style={styles.factorText}>
                Declining availability of uninterrupted work blocks and increasing fragmentation of the workday.
              </p>
            </div>

            <div style={styles.factorCard}>
              <span style={styles.factorIcon}>🤝</span>
              <h3 style={styles.factorTitle}>Collaboration Network</h3>
              <p style={styles.factorText}>
                Narrowing or expanding collaboration breadth, team cohesion changes, and cross-team interaction patterns.
              </p>
            </div>

            <div style={styles.factorCard}>
              <span style={styles.factorIcon}>⏰</span>
              <h3 style={styles.factorTitle}>Work Hours</h3>
              <p style={styles.factorText}>
                Persistent after-hours work, weekend activity trends, and work-life boundary erosion indicators.
              </p>
            </div>

            <div style={styles.factorCard}>
              <span style={styles.factorIcon}>📊</span>
              <h3 style={styles.factorTitle}>Behavioral Drift</h3>
              <p style={styles.factorText}>
                Deviation from established team baselines indicating early signs of capacity strain or system change.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Proactive Alerts & Cases Workflow */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Proactive Capacity Risk Alerts & Cases Workflow</h2>
          <p style={styles.introText}>
            Leveraging SignalTrue's Capacity Risk predictions is easy. Our platform automatically generates 
            alerts and creates a Proactive Capacity Risk Case for teams predicted to be at high risk.
          </p>

          <div style={styles.workflowSteps}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <div style={styles.stepContent}>
                <h3 style={styles.stepTitle}>Continuous Monitoring</h3>
                <p style={styles.stepText}>
                  Our AI continuously updates a consolidated Capacity Risk Score for each team, 
                  monitoring behavioral patterns across all integrated data sources.
                </p>
              </div>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <div style={styles.stepContent}>
                <h3 style={styles.stepTitle}>Automatic Alert</h3>
                <p style={styles.stepText}>
                  When a team's Capacity Risk Score indicates developing drift or sustained overload, SignalTrue alerts you immediately 
                  through Slack, email, or in-app notification.
                </p>
              </div>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <div style={styles.stepContent}>
                <h3 style={styles.stepTitle}>Case Creation</h3>
                <p style={styles.stepText}>
                  A Proactive Capacity Risk Case is automatically created with detailed insights, 
                  risk factors, trend history, and recommended interventions.
                </p>
              </div>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>4</div>
              <div style={styles.stepContent}>
                <h3 style={styles.stepTitle}>Action & Resolution</h3>
                <p style={styles.stepText}>
                  Assign cases to HR Business Partners or managers, track actions taken, monitor impact, 
                  and execute on interventions to proactively prevent sustained overload.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Teams Experience Capacity Risk */}
      <section style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Why Teams Experience Capacity Risk</h2>

          <div style={styles.reasonsGrid}>
            <div style={styles.reasonCard}>
              <h3 style={styles.reasonTitle}>Coordination Overload</h3>
              <p style={styles.reasonText}>
                Excessive meetings, fragmented calendars, and too much time spent synchronizing rather than executing.
              </p>
            </div>

            <div style={styles.reasonCard}>
              <h3 style={styles.reasonTitle}>Bandwidth Tax</h3>
              <p style={styles.reasonText}>
                Cognitive overload masked by high responsiveness, leading to decision quality and sustainability risks.
              </p>
            </div>

            <div style={styles.reasonCard}>
              <h3 style={styles.reasonTitle}>Silence Risk</h3>
              <p style={styles.reasonText}>
                Reduced voice and contribution patterns indicating withdrawal or communication friction.
              </p>
            </div>

            <div style={styles.reasonCard}>
              <h3 style={styles.reasonTitle}>System Changes</h3>
              <p style={styles.reasonText}>
                Reorganizations, new tools, or process changes that increase cognitive load without reducing other work.
              </p>
            </div>

            <div style={styles.reasonCard}>
              <h3 style={styles.reasonTitle}>Baseline Drift</h3>
              <p style={styles.reasonText}>
                Gradual deviation from healthy norms in after-hours work, response times, or collaboration patterns.
              </p>
            </div>

            <div style={styles.reasonCard}>
              <h3 style={styles.reasonTitle}>Focus Erosion</h3>
              <p style={styles.reasonText}>
                Declining availability of uninterrupted work time due to meeting creep and increasing interruptions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Impact */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Impact of Proactive Capacity Risk Detection</h2>

          <div style={styles.impactGrid}>
            <div style={styles.impactCard}>
              <div style={styles.impactStat}>65%</div>
              <p style={styles.impactLabel}>Reduction in Voluntary Turnover</p>
              <p style={styles.impactDescription}>
                Early intervention on capacity risk leads to significantly lower unplanned departures.
              </p>
            </div>

            <div style={styles.impactCard}>
              <div style={styles.impactStat}>90 days</div>
              <p style={styles.impactLabel}>Average Early Detection Window</p>
              <p style={styles.impactDescription}>
                SignalTrue identifies teams at risk 90 days before they reach critical capacity strain.
              </p>
            </div>

            <div style={styles.impactCard}>
              <div style={styles.impactStat}>$150k+</div>
              <p style={styles.impactLabel}>Saved Per Prevented Departure</p>
              <p style={styles.impactDescription}>
                Average cost savings per prevented voluntary exit (recruiting, training, productivity loss).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{...styles.section, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white'}}>
        <div style={styles.container}>
          <h2 style={{...styles.sectionTitle, color: 'white', marginBottom: '1rem'}}>
            Start Reducing Capacity Risk Today
          </h2>
          <p style={{...styles.introText, color: 'rgba(255,255,255,0.9)', marginBottom: '2rem'}}>
            Give your team the support they need before it's too late.
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
  statCallout: { textAlign: 'center', margin: '3rem auto', padding: '2rem', background: '#f9fafb', borderRadius: '12px', maxWidth: '600px', lineHeight: 1.6, color: '#4b5563' },
  statNumber: { fontSize: '4rem', fontWeight: '700', color: '#6366f1', display: 'block', marginBottom: '0.5rem' },
  factorsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' },
  factorCard: { background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  factorIcon: { fontSize: '3rem', display: 'block', marginBottom: '1rem' },
  factorTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' },
  factorText: { color: '#6b7280', lineHeight: 1.6 },
  workflowSteps: { maxWidth: '900px', margin: '0 auto' },
  step: { display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', alignItems: 'flex-start' },
  stepNumber: { fontSize: '2rem', fontWeight: '700', color: '#6366f1', background: '#eef2ff', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' },
  stepText: { color: '#6b7280', lineHeight: 1.6 },
  reasonsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' },
  reasonCard: { background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  reasonTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' },
  reasonText: { color: '#6b7280', lineHeight: 1.6 },
  impactGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' },
  impactCard: { background: '#f9fafb', borderRadius: '12px', padding: '2.5rem', textAlign: 'center' },
  impactStat: { fontSize: '3rem', fontWeight: '700', color: '#6366f1', marginBottom: '1rem' },
  impactLabel: { fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' },
  impactDescription: { color: '#6b7280', lineHeight: 1.6 },
};

export default CapacityRiskDetection;
