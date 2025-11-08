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
          <img src="/images/logo.png" alt="SignalTrue" style={styles.logoImg} />
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
        <div style={styles.heroInner}>
          <div style={styles.badge}>Team‑level by default</div>
          <h1 style={styles.heroTitle}>Grow engagement. Strengthen culture. Lead with insight.</h1>
          <p style={styles.heroSubtitle}>
            SignalTrue gives HR leaders a continuous view of how teams connect, collaborate, and thrive — helping you build resilient, high-energy workplaces every day.
          </p>
          <div style={styles.ctaRow}>
            <button onClick={() => navigate('/contact')} style={styles.primaryButton}>Get Early Access</button>
            <button onClick={() => navigate('/how-it-works')} style={styles.secondaryButton}>See How It Works</button>
          </div>
        </div>
      </section>

      {/* Signals */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>8 signals. Clear insights. Faster action.</h2>
          <p style={styles.lead}>
            We track sentiment, response latency, meeting load, after‑hours, network breadth, focus time, recovery speed, and a composite Energy Index.
          </p>
          <div style={styles.grid4}>
            {[
              ['💬','Sentiment shifts','LLM‑powered tone analysis'],
              ['⏳','Response latency','Reply delays spike early'],
              ['📅','Meeting overload','Hours per week tracked'],
              ['🌙','After‑hours activity','Off‑hours work patterns'],
              ['🤝','Network breadth','Collaboration shrinking?'],
              ['🎯','Focus time ratio','Deep work vs meetings'],
              ['⚡','Recovery speed','How fast teams bounce back'],
              ['💯','Energy Index','0–100 composite score'],
            ].map(([icon, title, detail]) => (
              <div key={title} style={styles.card}>
                <div style={styles.icon}>{icon}</div>
                <div style={styles.cardTitle}>{title}</div>
                <div style={styles.muted}>{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>How it works</h2>
          <div style={styles.grid4}>
            {[
              ['1','Connect','Secure OAuth for Slack, Google, or Microsoft'],
              ['2','Learn baseline','We auto‑tune per‑team norms'],
              ['3','Detect & explain','See top 3 contributors for each drift'],
              ['4','Act fast','Micro‑playbooks with practical steps'],
            ].map(([num, title, text]) => (
              <div key={num} style={styles.step}>
                <div style={styles.stepNum}>{num}</div>
                <div style={styles.cardTitle}>{title}</div>
                <div style={styles.muted}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>What you get</h2>
          <div style={styles.grid4}>
            {[
              ['💯','Energy Index (0‑100)','Blends tone, responsiveness, and collaboration'],
              ['🔍','Drift explainability','Top 3 metrics that drove each alert'],
              ['⚠️','Smart alerts','Slack/email, frequency control'],
              ['📚','Micro‑playbooks','Actionable suggestions per drift type'],
              ['📊','Program Impact Tracker','Measure change before/after'],
              ['📥','CSV Export & API','For BI tools and integrations'],
              ['🗓️','Timeline events','Annotate launches and reorgs'],
              ['🔐','Enterprise security','AES‑256, data residency, API keys'],
            ].map(([icon, title, text]) => (
              <div key={title} style={styles.outcome}>
                <div style={styles.icon}>{icon}</div>
                <div style={styles.cardTitle}>{title}</div>
                <div style={styles.muted}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>Privacy by design</h2>
          <p style={styles.lead}>We analyze patterns, not private content. Aggregated at team level by default. Read our <Link to="/privacy" style={styles.link}>Privacy</Link>.</p>
        </div>
      </section>

      {/* CTA */}
      <section style={styles.cta}> 
        <div style={styles.sectionInner}>
          <h2 style={{...styles.h2,color:'white'}}>See your team’s signals</h2>
          <button onClick={() => navigate('/contact')} style={styles.primaryButton}>Get Early Access</button>
        </div>
      </section>

      {/* Personalization & Flexibility */}
      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>Customizable Dashboards & KPIs</h2>
          <p style={styles.lead}>
            Every organization is unique. SignalTrue lets you tailor dashboards, metrics, and alerts to your team’s goals—track what matters most, from engineering focus to wellbeing, compliance, or engagement drivers.
          </p>
          <div style={styles.grid4}>
            <div style={styles.card}>
              <div style={styles.icon}>📊</div>
              <div style={styles.cardTitle}>Custom Widgets</div>
              <div style={styles.muted}>Drag-and-drop dashboard widgets for your KPIs.</div>
            </div>
            <div style={styles.card}>
              <div style={styles.icon}>⚙️</div>
              <div style={styles.cardTitle}>Flexible Alerts</div>
              <div style={styles.muted}>Set thresholds, get notified only when it matters.</div>
            </div>
            <div style={styles.card}>
              <div style={styles.icon}>🧩</div>
              <div style={styles.cardTitle}>Integrations</div>
              <div style={styles.muted}>Connect Slack, Teams, Google, HRIS, and more.</div>
            </div>
            <div style={styles.card}>
              <div style={styles.icon}>🎨</div>
              <div style={styles.cardTitle}>Personalized Views</div>
              <div style={styles.muted}>Filter by team, location, or role for relevant insights.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Solutions */}
      {require('../components/IndustrySolutions').default()}

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
