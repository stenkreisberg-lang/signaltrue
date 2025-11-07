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
          <h1 style={styles.heroTitle}>Continuous Engagement Insight™</h1>
          <p style={styles.heroSubtitle}>
            SignalTrue helps HR teams grow engagement, strengthen culture, and guide leaders with continuous insight.
          </p>
          <div style={{marginTop:12, fontWeight:600}}>Build stronger teams through continuous engagement insight.</div>
          <div style={styles.heroCTA}>
            <Link to="/contact" style={styles.primaryBtn}>Get Early Access</Link>
            <Link to="/how-it-works" style={styles.secondaryBtn}>See How It Works</Link>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>What Makes SignalTrue Different</h2>
          
          <div style={styles.featureGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔍</div>
              <h3 style={styles.featureTitle}>Drift Explainability</h3>
              <p style={styles.featureText}>
                When alerts fire, see the top 3 contributing metrics instantly: "tone ↓15%, meetings ↑22%, response time ↑30%". No guesswork—just clear, actionable data.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>📚</div>
              <h3 style={styles.featureTitle}>Micro-Playbook Engine</h3>
              <p style={styles.featureText}>
                Every drift alert includes a contextual recommendation: "Tone drop → encourage recognition posts" or "Meeting overload → try no-meeting Fridays". Act fast with confidence.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>�</div>
              <h3 style={styles.featureTitle}>Program Impact Tracker</h3>
              <p style={styles.featureText}>
                Tag interventions like "Wellness Week" or "4-Day Pilot", measure before/after Energy Index changes, and prove ROI. Perfect for HR and leadership reporting.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>⚙️</div>
              <h3 style={styles.featureTitle}>Enterprise API & Export</h3>
              <p style={styles.featureText}>
                One-click CSV export for BI tools, REST API endpoints, and full API key management—create, rotate, revoke tokens with usage logs. Enterprise-ready integration.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>�️</div>
              <h3 style={styles.featureTitle}>Timeline Event Overlay</h3>
              <p style={styles.featureText}>
                Annotate your dashboards with product launches, reorgs, or policy changes. Understand sentiment dips and spikes in context—no more mystery charts.
              </p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔐</div>
              <h3 style={styles.featureTitle}>Security & Compliance</h3>
              <p style={styles.featureText}>
                AES-256 encryption at rest, regional data residency (EU/US), alert frequency control, and team-level aggregation by default. GDPR-ready from day one.
              </p>
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
                OAuth integration with Slack, Google, Microsoft. Tokens encrypted (AES-256), regional data residency (EU/US), team-level aggregation by default. 5-minute setup.
              </p>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <h3 style={styles.stepTitle}>8 Signals Track Health</h3>
              <p style={styles.stepText}>
                Sentiment, latency, meetings, after-hours, network breadth, focus time, recovery days, and auto-tuned Energy Index. No noisy metrics—only proven high-impact signals.
              </p>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <h3 style={styles.stepTitle}>Drift Alerts Explain Why</h3>
              <p style={styles.stepText}>
                When Energy Index dips, see top 3 contributors (e.g., "tone ↓15%, meetings ↑22%") plus a micro-playbook: "encourage recognition posts" or "try no-meeting Fridays".
              </p>
            </div>

            <div style={styles.step}>
              <div style={styles.stepNumber}>4</div>
              <h3 style={styles.stepTitle}>Measure Program Impact</h3>
              <p style={styles.stepText}>
                Tag interventions ("Wellness Week", "4-Day Pilot"), track before/after energy, and prove ROI. Export CSV or pull via API for leadership dashboards.
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

      {/* Benefits Section Title */}
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>Why Companies Choose SignalTrue</h2>
      </div>

      {/* For HR & People Teams */}
      <section style={styles.section}>
        <div style={styles.container}>
            <h2 style={styles.sectionTitle}>Lead culture growth with real-time engagement data.</h2>
            <p style={styles.introText}>
              Track how engagement evolves, compare teams, and measure the impact of your programs.<br />
              Design initiatives based on facts — not assumptions.
            </p>
        </div>
      </section>

      {/* For Managers */}
      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Support every team with clear, actionable insight.</h2>
          <p style={styles.introText}>
            Weekly engagement reports help managers understand team focus, connection, and progress — so they can lead with empathy and precision.
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
          <h2 style={styles.sectionTitle}>How HR teams use SignalTrue every day.</h2>
          <ul style={{...styles.introText, textAlign:'left', maxWidth:700, margin:'0 auto 28px'}}>
            <li>Track engagement during high-growth periods</li>
            <li>Monitor culture alignment after change or reorgs</li>
            <li>Evaluate leadership program effectiveness</li>
            <li>Support hybrid team communication</li>
            <li>Recognise high-performing teams early</li>
          </ul>
          <div style={{textAlign:'center',marginTop:32}}>
            <Link to="/contact" style={styles.primaryBtn}>Explore a Live Demo</Link>
          </div>
        </div>
      </section>

      {/* Mention Continuous Engagement Insight™ */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Continuous Engagement Insight™</h2>
          <p style={styles.introText}>
            SignalTrue delivers continuous, people-first engagement insight for HR leaders, managers, and executives.
          </p>
        </div>
      </section>

              <SiteFooter />
    </div>
  )
}

export default ProductOverview;
