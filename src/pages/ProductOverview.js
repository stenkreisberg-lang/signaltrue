import React from 'react';
import SiteFooter from '../components/SiteFooter';
import { Link } from 'react-router-dom';

// Minimal styles object to prevent runtime errors and provide basic layout/colors
const styles = {
  page: { fontFamily: 'Inter, Poppins, sans-serif', background: '#f8fafc', color: '#111827', minHeight: '100vh' },
  nav: { background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0.5rem 0' },
  navContent: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto', padding: '0 2rem' },
  logoLink: { display: 'flex', alignItems: 'center', textDecoration: 'none' },
  logoImg: { height: 32, marginRight: 10 },
  logoText: { fontSize: '1.25rem', fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  navLinks: { display: 'flex', gap: 24, alignItems: 'center' },
  navLink: { color: '#4b5563', textDecoration: 'none', fontWeight: 500 },
  loginBtn: { padding: '0.5rem 1.5rem', background: 'linear-gradient(135deg, #ff6f61, #ff9472)', color: 'white', borderRadius: 6, textDecoration: 'none', fontWeight: 600 },
  hero: { background: '#0f172a', color: 'white', padding: '6rem 2rem 4rem', textAlign: 'center' },
  container: { maxWidth: 1100, margin: '0 auto', padding: '0 2rem' },
  heroTitle: { fontSize: '3rem', fontWeight: 800, margin: '0 0 12px' },
  heroSubtitle: { fontSize: '1.25rem', opacity: 0.95, margin: '0 auto 24px', maxWidth: 760, lineHeight: 1.6 },
  heroCTA: { display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24 },
  primaryBtn: { padding: '0.9rem 1.4rem', background: '#059669', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' },
  secondaryBtn: { padding: '0.9rem 1.4rem', background: 'transparent', color: 'white', border: '2px solid white', borderRadius: 8, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' },
  section: { padding: '4rem 0' },
  sectionTitle: { fontSize: '2.25rem', fontWeight: 800, margin: '0 0 28px', color: '#111827', textAlign: 'center' },
  introText: { textAlign: 'center', color: '#4b5563', maxWidth: 850, margin: '0 auto 28px', lineHeight: 1.6 },
  featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32, marginTop: 32 },
  featureCard: { background: 'white', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 28, textAlign: 'center' },
  featureIcon: { fontSize: '2.5rem', marginBottom: 12 },
  featureTitle: { fontWeight: 700, fontSize: '1.2rem', marginBottom: 8 },
  featureText: { color: '#374151', fontSize: '1rem', marginBottom: 0 },
  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 28, marginTop: 32 },
  step: { background: 'white', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.03)', padding: 22, textAlign: 'center' },
  stepNumber: { width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, margin: '0 auto 10px' },
  stepTitle: { fontWeight: 700, marginBottom: 6, color: '#111827' },
  stepText: { color: '#6b7280', fontSize: '1rem' },
  sectionSubtitle: { color: '#6b7280', fontSize: '1.125rem', marginBottom: 18 },
};

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
          <h1 style={styles.heroTitle}>A Leadership Operating System for Team Health</h1>
          <p style={styles.heroSubtitle}>
            SignalTrue detects team health drift before it becomes crisis. Baseline calibration → deviation intelligence → risk signals → decision guidance → outcome tracking.
          </p>
          <div style={styles.heroCTA}>
            <Link to="/register" style={styles.primaryBtn}>Start Baseline Calibration</Link>
            <Link to="#how-it-works" style={styles.secondaryBtn}>See Sample Signals</Link>
          </div>
          <div style={{marginTop: '2rem', fontSize: '0.9rem', color: '#94a3b8'}}>
            No message content. Only metadata. Aggregated at team level. GDPR-aligned.
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>From Signal to Decision</h2>
          
          <div style={styles.featureGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>�</div>
              <h3 style={styles.featureTitle}>Baseline Intelligence</h3>
              <p style={styles.featureText}>
                Your organization's patterns become the benchmark. Internal baseline (primary), role-based comparison (secondary), external context (optional, off by default).
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>⚠️</div>
              <h3 style={styles.featureTitle}>Risk Signals</h3>
              <p style={styles.featureText}>
                Signals include severity (Critical/Risk/Informational), confidence level, deviation magnitude, and consequence statements like "This pattern tends to precede focus erosion."
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🎯</div>
              <h3 style={styles.featureTitle}>Decision Guidance</h3>
              <p style={styles.featureText}>
                No vague suggestions. Each signal presents 2-3 trade-off actions with expected effects, effort levels, and visible inaction costs. You decide, we track outcomes.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔍</div>
              <h3 style={styles.featureTitle}>Signal Drivers</h3>
              <p style={styles.featureText}>
                See the top 2-3 contributing factors for every signal. "Meeting load ↑35%, after-hours activity ↑18%, recovery time ↓22%." Know exactly what changed.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>📈</div>
              <h3 style={styles.featureTitle}>Outcome Tracking</h3>
              <p style={styles.featureText}>
                Post-action learning loop: record what worked, measure time-to-normalization, feed results back into recommendation quality. Your data improves your decisions.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔐</div>
              <h3 style={styles.featureTitle}>Privacy by Design</h3>
              <p style={styles.featureText}>
                No individual tracking. Team-level signals only. No message content stored. Metadata aggregation with minimum group size enforcement. GDPR-aligned from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - 5 Steps */}
      <section style={{...styles.section, background: '#f9fafb'}} id="how-it-works">
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>How It Works</h2>
          <p style={styles.sectionSubtitle}>
            From baseline to breakthrough decisions in 5 clear steps
          </p>

          <div style={styles.stepsGrid}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <h3 style={styles.stepTitle}>Connect Data Sources</h3>
              <p style={styles.stepText}>
                OAuth integration with Slack and Google Calendar. Secure, read-only metadata access. No message content stored.
              </p>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <h3 style={styles.stepTitle}>30-Day Baseline Calibration</h3>
              <p style={styles.stepText}>
                <strong>FREE calibration period.</strong> We establish your organization's baseline patterns. No recommendations shown until calibration completes.
              </p>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <h3 style={styles.stepTitle}>Detect Deviations & Risk Signals</h3>
              <p style={styles.stepText}>
                When team patterns drift from baseline, signals fire with severity (Critical/Risk/Informational), confidence level, and time-to-impact estimate.
              </p>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>4</div>
              <h3 style={styles.stepTitle}>Prescribe Trade-Off Decisions</h3>
              <p style={styles.stepText}>
                Each signal includes 2-3 mutually exclusive actions with expected effects and effort levels. Inaction cost is visible as an option.
              </p>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>5</div>
              <h3 style={styles.stepTitle}>Track Outcomes Over Time</h3>
              <p style={styles.stepText}>
                Record action results (Worked/Partially Worked/Did Not Work), measure time-to-normalization, and improve future recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section Title */}
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>Trusted By</h2>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4rem', margin: '2rem auto', maxWidth: 700, opacity: 0.7}}>
          <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#64748b'}}>Sharewell</div>
          <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#64748b'}}>Cleveron</div>
          <div style={{fontSize: '1.5rem', fontWeight: 700, color: '#64748b'}}>Toggl</div>
        </div>
      </div>

      {/* Case Example */}
      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Real-World Impact (Example)</h2>
          <div style={{maxWidth: 700, margin: '0 auto', background: 'white', borderRadius: 12, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize: '1.1rem', color: '#374151', marginBottom: 16, lineHeight: 1.6}}>
              <strong>Signal detected:</strong> Meeting load spike (+35% vs baseline) for Product team
            </div>
            <div style={{fontSize: '1.1rem', color: '#374151', marginBottom: 16, lineHeight: 1.6}}>
              <strong>Action taken:</strong> Removed 2 recurring meetings, converted 30% of meetings to async updates
            </div>
            <div style={{fontSize: '1.1rem', color: '#059669', fontWeight: 700}}>
              <strong>Outcome:</strong> Meeting load normalized in 3 weeks. Focus time increased 18%.
            </div>
            <div style={{marginTop: 16, fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic'}}>
              Note: Example for illustrative purposes. Your results will vary based on your organization's baseline and actions taken.
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section Title */}
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>Why Companies Choose SignalTrue</h2>
      </div>

      {/* For HR & People Teams */}
      <section style={styles.section}>
        <div style={styles.container}>
            <h2 style={styles.sectionTitle}>You don't pay for data. You pay for avoiding slow organizational decay.</h2>
            <p style={styles.introText}>
              SignalTrue helps leaders detect team health drift before it becomes crisis.<br />
              Baseline calibration → deviation intelligence → recommended leadership decisions → outcome tracking.
            </p>
        </div>
      </section>

      {/* For Managers */}
      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Built for leaders who make hard calls.</h2>
          <p style={styles.introText}>
            Every signal shows you what usually breaks next, what to do now, and tracks whether it worked. Decision guidance, not vague dashboards.
          </p>
        </div>
      </section>

      {/* For Executives */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Understand culture as a strategic asset.</h2>
          <p style={styles.introText}>
            Gain a live overview of organisational energy.<br />
            Identify teams thriving under pressure and use insight to guide future planning.
          </p>
        </div>
      </section>

      {/* Use Cases */}
      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Common Use Cases</h2>
          <ul style={{...styles.introText, textAlign:'left', maxWidth:700, margin:'0 auto 28px'}}>
            <li>Detect meeting overload before burnout sets in</li>
            <li>Track after-hours creep and prevent team exhaustion</li>
            <li>Measure program impact (wellness initiatives, policy changes)</li>
            <li>Monitor team health during high-growth or reorganization</li>
            <li>Identify focus erosion and decision delays early</li>
          </ul>
          <div style={{textAlign:'center',marginTop:32}}>
            <Link to="/register" style={styles.primaryBtn}>Start Baseline Calibration</Link>
          </div>
        </div>
      </section>

      {/* Final Section */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Start with Baseline Calibration</h2>
          <p style={styles.introText}>
            Month 1 is free. We establish your baseline patterns. Signal Intelligence unlocks when calibration completes.
          </p>
          <div style={{textAlign:'center', marginTop: 32}}>
            <Link to="/register" style={styles.primaryBtn}>Start Baseline Calibration</Link>
          </div>
        </div>
      </section>

              <SiteFooter />
    </div>
  )
}

export default ProductOverview;
