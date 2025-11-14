import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';

function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      {/* Top nav */}
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

      {/* Section 1 — Hero */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>Grow engagement. Strengthen culture. Lead with insight.</h1>
          <p style={styles.heroSubtitle}>
            SignalTrue gives HR leaders a continuous view of how teams connect, collaborate, and thrive — helping you build resilient, high-energy workplaces every day.
          </p>
          <div style={styles.ctaRow}>
            <Link to="/contact" style={styles.primaryButton}>Get Early Access</Link>
            <Link to="/how-it-works" style={styles.secondaryButton}>See How It Works</Link>
          </div>
        </div>
      </section>

      {/* Section 2 — The New Way to See Engagement */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>Finally, a real-time view of your organisation’s energy.</h2>
          <p style={styles.lead}>
            Surveys capture moments in time. SignalTrue captures momentum.<br />
            See how engagement evolves — celebrate progress, support leaders, and strengthen connection across every team.
          </p>
        </div>
      </section>

      {/* Section 3 — How It Works */}
      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>From everyday collaboration to continuous insight.</h2>
          <div style={styles.grid4}>
            {[
              ['1','Connect your work environment securely.'],
              ['2','SignalTrue learns each team’s engagement rhythm.'],
              ['3','See engagement evolve through real-time insight.'],
              ['4','Lead with foresight using weekly reports and actionable guidance.'],
            ].map(([num, text]) => (
              <div key={num} style={styles.step}>
                <div style={styles.stepNum}>{num}</div>
                <div style={styles.muted}>{text}</div>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:32}}>
            <button onClick={() => navigate('/how-it-works')} style={styles.secondaryButton}>Explore How It Works</button>
          </div>
        </div>
      </section>

      {/* Section 4 — What You Gain */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>Clarity. Confidence. Connection.</h2>
          <ul style={{...styles.lead, textAlign:'left', maxWidth:700, margin:'0 auto 28px'}}>
            <li>See engagement rise or dip in real time.</li>
            <li>Recognise leadership styles that build strong teams.</li>
            <li>Track program impact with measurable engagement data.</li>
            <li>Coach managers with insight that feels human.</li>
            <li>Demonstrate HR’s strategic impact across the company.</li>
          </ul>
        </div>
      </section>

      {/* Section 5 — For HR Leaders */}
      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>Design the workplace people choose to stay in.</h2>
          <p style={styles.lead}>
            Understand how your teams collaborate and focus, and design initiatives that boost energy, trust, and motivation.<br />
            SignalTrue helps you lead engagement growth — not chase disengagement.
          </p>
        </div>
      </section>

      {/* Section 6 — Key Capabilities */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>Everything you need to grow engagement continuously.</h2>
          <ul style={{...styles.lead, textAlign:'left', maxWidth:700, margin:'0 auto 28px'}}>
            <li><b>Team Health Score:</b> one number that captures team energy and focus.</li>
            <li><b>Positive Trend Tracking:</b> see where culture and collaboration thrive.</li>
            <li><b>Engagement Insight Brief:</b> weekly summary of progress and opportunities.</li>
            <li><b>Leadership Coaching View:</b> insights into which teams respond best to management style.</li>
            <li><b>Privacy-First Analytics:</b> team-level aggregation only.</li>
            <li><b>Regional Data Residency:</b> GDPR-aligned storage and retention controls.</li>
          </ul>
        </div>
      </section>

      {/* Section 7 — Culture Impact */}
      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>The clearer you see, the stronger your teams grow.</h2>
          <p style={styles.lead}>
            When HR and leadership share one live view of engagement, alignment accelerates.<br />
            SignalTrue helps you build momentum — sustaining culture and performance over time.
          </p>
          <div style={{textAlign:'center',marginTop:32}}>
            <button onClick={() => navigate('/contact')} style={styles.primaryButton}>Get Early Access</button>
          </div>
        </div>
      </section>

      {/* Section 8 — Trust */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>Insight built for people. Data built for safety.</h2>
          <p style={styles.lead}>
            SignalTrue analyses collaboration patterns, not private content.<br />
            All insights are aggregated, encrypted, and transparent to employees.<br />
            Empathy and ethics are built into every layer.
          </p>
        </div>
      </section>

      {/* Section 9 — Final CTA */}
      <section style={styles.cta}> 
        <div style={styles.sectionInner}>
          <h2 style={{...styles.h2,color:'white'}}>Lead with foresight. Grow with confidence.</h2>
          <p style={{color:'white',fontSize:'1.25rem',margin:'0 0 2rem'}}>Discover how Continuous Engagement Insight™ helps HR build thriving teams.</p>
          <button onClick={() => navigate('/contact')} style={styles.primaryButton}>Get Early Access</button>
        </div>
      </section>

      {/* Privacy Notice (always visible) */}
      <footer style={{background:'#f9fafb',padding:'2rem 0',textAlign:'center'}}>
        <span style={{color:'#6b7280',fontSize:'1rem'}}>Privacy-first: SignalTrue analyzes patterns, not private content. <Link to="/privacy" style={styles.link}>Learn more</Link>.</span>
      </footer>

      <SiteFooter />
    </div>
  );
}

const styles = {
  container:{minHeight:'100vh',background:'white'},
  nav:{background:'white',borderBottom:'1px solid #e5e7eb',padding:'1rem 2rem',position:'sticky',top:0,zIndex:100},
  navContent:{maxWidth:1200,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center'},
  logoLink: { display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' },
  logoImg: { height: '32px', width: '32px' },
  logoText: { fontSize: '1.25rem', fontWeight: '700', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  navLinks:{display:'flex',gap:'2rem',alignItems:'center'},
  navLink:{color:'#4b5563',textDecoration:'none',fontWeight:500},
  loginBtn: { padding: '0.5rem 1.5rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' },

  hero:{background:'linear-gradient(135deg,#667eea,#764ba2)',color:'white',padding:'6rem 2rem 4rem',textAlign:'center'},
  heroInner:{maxWidth:950,margin:'0 auto'},
  badge:{display:'inline-block',padding:'6px 12px',borderRadius:999,background:'rgba(255,255,255,0.15)',backdropFilter:'blur(4px)',marginBottom:16},
  heroTitle:{fontSize:'3rem',fontWeight:800,margin:'0 0 12px'},
  heroSubtitle:{fontSize:'1.125rem',opacity:0.95,margin:'0 auto 24px',maxWidth:760,lineHeight:1.6},
  ctaRow:{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'},
  primaryButton:{padding:'0.9rem 1.4rem',background:'white',color:'#6366f1',border:'none',borderRadius:8,fontWeight:700,cursor:'pointer'},
  secondaryButton:{padding:'0.9rem 1.4rem',background:'transparent',color:'white',border:'2px solid white',borderRadius:8,fontWeight:700,cursor:'pointer'},

  section:{padding:'4.5rem 2rem'},
  sectionInner:{maxWidth:1100,margin:'0 auto'},
  h2:{fontSize:'2.25rem',fontWeight:800,margin:'0 0 10px',color:'#111827',textAlign:'center'},
  lead:{textAlign:'center',color:'#4b5563',maxWidth:850,margin:'0 auto 28px',lineHeight:1.6},
  grid4:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16},
  card:{background:'white',border:'1px solid #e5e7eb',borderRadius:12,padding:16,textAlign:'center'},
  icon:{fontSize:'2rem',marginBottom:8},
  cardTitle:{fontWeight:700,marginBottom:6,color:'#111827'},
  muted:{color:'#6b7280'},
  step:{background:'white',border:'2px solid #e5e7eb',borderRadius:12,padding:16,textAlign:'center'},
  stepNum:{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,margin:'0 auto 10px'},
  outcome:{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:12,padding:16},
  link:{color:'#6366f1',textDecoration:'none',fontWeight:700},
  cta:{background:'linear-gradient(135deg,#667eea,#764ba2)',padding:'4.5rem 2rem',textAlign:'center'}
};

export default Home;
