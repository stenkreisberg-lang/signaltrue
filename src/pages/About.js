import React from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';

// Minimal styles object for About page

function About() {
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
          <h1 style={styles.heroTitle}>Why SignalTrue exists</h1>
          <p style={styles.heroSubtitle}>
            We watched talented people burn out. Not because leaders didn't care. But because the warning signs came too late.
          </p>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.container}>
          {/* Visual Grounding */}
          <div style={{width:'100%', maxWidth:800, height:300, background:'#1e293b', borderRadius:12, margin:'0 auto 40px', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b', border:'1px dashed #334155'}}>
            [Founder / Team Photo Placeholder]
          </div>

          <div style={{maxWidth:700, margin:'0 auto'}}>
            <p style={styles.missionText}>
              Surveys were slow. Dashboards were backward-looking. Monitoring tools destroyed trust.
            </p>
            <p style={styles.missionText}>
              So we built something different.
            </p>
            
            <h3 style={{marginTop:30, fontSize:'1.5rem', fontWeight:700}}>The data to prevent burnout already exists</h3>
            <p style={styles.missionText}>
              It's hidden in how teams collaborate over time. Not in what people say — but in patterns.
            </p>

            <p style={{...styles.missionText, marginTop:30, fontStyle:'italic', color:'#6b7280'}}>
              Our product turns collaboration data into early warning signals leaders can act on.
            </p>
          </div>

          <h3 style={{marginTop:60, marginBottom:30, textAlign:'center', fontSize:'1.75rem', fontWeight:700}}>Our Principles</h3>
          
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:24, maxWidth:1000, margin:'0 auto'}}>
            <div style={{background:'white', padding:24, borderRadius:8, border:'1px solid #e5e7eb'}}>
              <h4 style={{color:'#059669', fontSize:'1.25rem', fontWeight:700, marginBottom:8}}>Trust over surveillance</h4>
              <p style={{fontSize:'0.9em', color:'#4b5563'}}>We never show individual data. We build for leaders who want to support their teams, not spy on them.</p>
            </div>
            <div style={{background:'white', padding:24, borderRadius:8, border:'1px solid #e5e7eb'}}>
              <h4 style={{color:'#059669', fontSize:'1.25rem', fontWeight:700, marginBottom:8}}>Teams over individuals</h4>
              <p style={{fontSize:'0.9em', color:'#4b5563'}}>Work happens in groups. We measure the friction and flow of the team unit, not the person.</p>
            </div>
            <div style={{background:'white', padding:24, borderRadius:8, border:'1px solid #e5e7eb'}}>
              <h4 style={{color:'#059669', fontSize:'1.25rem', fontWeight:700, marginBottom:8}}>Context over raw metrics</h4>
              <p style={{fontSize:'0.9em', color:'#4b5563'}}>A number without context is dangerous. We always overlay events like launches or reorgs.</p>
            </div>
            <div style={{background:'white', padding:24, borderRadius:8, border:'1px solid #e5e7eb'}}>
              <h4 style={{color:'#059669', fontSize:'1.25rem', fontWeight:700, marginBottom:8}}>Judgment over automation</h4>
              <p style={{fontSize:'0.9em', color:'#4b5563'}}>We provide signals and micro-playbooks, but we trust human leaders to make the final call.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Secondary Trusted Companies */}
      <section style={{padding:'40px 0', borderTop:'1px solid #e5e7eb', background:'#f9fafb'}}>
        <div style={styles.container}>
          <div style={{display:'flex', justifyContent:'center', gap:40, alignItems:'center', opacity:0.5, transform:'scale(0.8)', flexWrap:'wrap'}}>
            <div style={{fontWeight:800, fontSize:24, color:'#94a3b8', letterSpacing:'-1px'}}>Sharewell</div>
            <div style={{fontWeight:700, fontSize:22, color:'#94a3b8', letterSpacing:'1px'}}>CLEVERON</div>
            <div style={{fontWeight:800, fontSize:24, color:'#94a3b8'}}>toggl</div>
          </div>
        </div>
      </section>

      <section style={{...styles.section, background:'white'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Our Values</h2>

          <div style={styles.valuesGrid}>
            <div style={styles.valueCard}>
              <div style={styles.valueIcon}>🔒</div>
              <h3 style={styles.valueTitle}>Privacy First</h3>
              <p style={styles.valueText}>
                We analyze patterns without reading private content. Team member privacy is non-negotiable.
              </p>
            </div>

            <div style={styles.valueCard}>
              <div style={styles.valueIcon}>🤝</div>
              <h3 style={styles.valueTitle}>People-Centric</h3>
              <p style={styles.valueText}>
                Our technology exists to help people thrive, not to surveil or micromanage.
              </p>
            </div>

            <div style={styles.valueCard}>
              <div style={styles.valueIcon}>⚖️</div>
              <h3 style={styles.valueTitle}>Fairness & Equity</h3>
              <p style={styles.valueText}>
                We deliberately ignore demographic data to enable equitable team health management for all.
              </p>
            </div>

            <div style={styles.valueCard}>
              <div style={styles.valueIcon}>🔬</div>
              <h3 style={styles.valueTitle}>Science-Backed</h3>
              <p style={styles.valueText}>
                Our algorithms are grounded in peer-reviewed research on burnout, engagement, and organizational behavior.
              </p>
            </div>

            <div style={styles.valueCard}>
              <div style={styles.valueIcon}>🚀</div>
              <h3 style={styles.valueTitle}>Action-Oriented</h3>
              <p style={styles.valueText}>
                Insights are only valuable if they lead to action. We design for implementation, not just awareness.
              </p>
            </div>

            <div style={styles.valueCard}>
              <div style={styles.valueIcon}>🌱</div>
              <h3 style={styles.valueTitle}>Continuous Growth</h3>
              <p style={styles.valueText}>
                We're constantly learning and improving, both as individuals and as a company.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Why We Built SignalTrue</h2>
          <div style={styles.storySection}>
            <p style={styles.storyText}>
              The idea for SignalTrue came from personal experience. Our founders watched talented colleagues 
              burn out and leave companies that didn't see the warning signs. Performance reviews came too late. 
              Exit interviews revealed problems that could have been addressed months earlier.
            </p>
            <p style={styles.storyText}>
              We realized that the data to predict burnout already exists—hidden in communication patterns, 
              meeting schedules, and collaboration behaviors. The challenge was building technology that could 
              surface these insights while respecting privacy and avoiding surveillance.
            </p>
            <p style={styles.storyText}>
              Today, SignalTrue helps companies across industries identify burnout risks early and support 
              their teams proactively. We're proud to be part of building healthier workplaces where people 
              can do their best work without sacrificing their wellbeing.
            </p>
          </div>

          <div style={styles.quoteBox}>
            <p style={styles.quote}>
              "Companies can't thrive without strong employee retention and a deep understanding of their workforce. 
              SignalTrue gives leaders the insights they need to support their teams before issues escalate."
            </p>
            <p style={styles.quoteAuthor}>— SignalTrue Founding Team</p>
          </div>
        </div>
      </section>

      <section style={{...styles.section, background: '#f9fafb'}}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Backed by Research</h2>
          <p style={styles.introText}>
            Our approach is grounded in decades of research on workplace burnout, organizational psychology, 
            and predictive analytics.
          </p>

          <div style={styles.researchGrid}>
            <div style={styles.researchCard}>
              <h3 style={styles.researchTitle}>Burnout Science</h3>
              <p style={styles.researchText}>
                We build on foundational research from Christina Maslach, Herbert Freudenberger, and modern 
                organizational psychologists studying work-related exhaustion.
              </p>
            </div>

            <div style={styles.researchCard}>
              <h3 style={styles.researchTitle}>Predictive Analytics</h3>
              <p style={styles.researchText}>
                Our AI models incorporate proven methodologies from academic research on employee retention, 
                engagement prediction, and organizational network analysis.
              </p>
            </div>

            <div style={styles.researchCard}>
              <h3 style={styles.researchTitle}>Privacy by Design</h3>
              <p style={styles.researchText}>
                We follow privacy frameworks from GDPR, differential privacy research, and ethical AI principles 
                to ensure responsible data use.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{...styles.section, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white'}}>
        <div style={styles.container}>
          <h2 style={{...styles.sectionTitle, color: 'white'}}>Join Us in Building Healthier Workplaces</h2>
          <p style={{...styles.introText, color: 'rgba(255,255,255,0.9)', marginBottom: '2rem'}}>
            Whether you're interested in our product, want to join our team, or just want to learn more, we'd love to hear from you.
          </p>
          <Link to="/contact" style={{...styles.primaryBtn, background: 'white', color: '#6366f1'}}>
            Get in Touch
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
  heroSubtitle: { fontSize: '1.25rem', color: '#6b7280', lineHeight: 1.6, maxWidth: '800px', margin: '0 auto' },
  section: { padding: '5rem 2rem' },
  sectionTitle: { fontSize: '2.5rem', fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: '2rem' },
  missionText: { fontSize: '1.25rem', color: '#4b5563', lineHeight: 1.8, maxWidth: '900px', margin: '0 auto 1.5rem', textAlign: 'center' },
  introText: { fontSize: '1.125rem', color: '#6b7280', lineHeight: 1.7, maxWidth: '900px', margin: '0 auto 3rem', textAlign: 'center' },
  valuesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '3rem' },
  valueCard: { background: 'white', borderRadius: '12px', padding: '2rem', textAlign: 'center', border: '1px solid #e5e7eb' },
  valueIcon: { fontSize: '3rem', marginBottom: '1rem' },
  valueTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' },
  valueText: { color: '#6b7280', lineHeight: 1.6 },
  storySection: { maxWidth: '900px', margin: '0 auto' },
  storyText: { fontSize: '1.125rem', color: '#4b5563', lineHeight: 1.8, marginBottom: '1.5rem' },
  quoteBox: { maxWidth: '800px', margin: '3rem auto 0', padding: '3rem', background: '#eef2ff', borderRadius: '12px', borderLeft: '4px solid #6366f1' },
  quote: { fontSize: '1.25rem', color: '#4338ca', lineHeight: 1.7, fontStyle: 'italic', marginBottom: '1rem' },
  quoteAuthor: { color: '#6b7280', fontWeight: '600', textAlign: 'right' },
  researchGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '3rem' },
  researchCard: { background: 'white', borderRadius: '12px', padding: '2rem', border: '1px solid #e5e7eb' },
  researchTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' },
  researchText: { color: '#6b7280', lineHeight: 1.7 },
  primaryBtn: { padding: '0.875rem 2rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '1rem', display: 'inline-block' },
  // Footer styles moved to shared SiteFooter component
};

export default About;
