import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';

function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <SiteHeader />

      {/* Section 1 — Hero */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>See early warning signs in team health.</h1>
          <p style={styles.heroSubtitle}>
            Before burnout, disengagement, or overload becomes visible.
          </p>
          <p style={{...styles.heroSubtitle, fontSize:'1rem', marginTop:'1rem'}}>
            SignalTrue turns collaboration metadata into team-level health signals that help leaders decide when to intervene and when to wait.
          </p>
          
          <div style={{marginTop:20, display:'flex', gap:20, fontSize:'0.9em', color:'rgba(255,255,255,0.9)', justifyContent:'center', flexWrap:'wrap'}}>
            <span>✓ No surveys.</span>
            <span>✓ No individual tracking.</span>
            <span>✓ No content monitoring.</span>
          </div>
          
          <div style={styles.ctaRow}>
            <Link to="/register" style={styles.primaryButton}>Request early access</Link>
          </div>
          
          <p style={{fontSize:'0.85rem', color:'rgba(255,255,255,0.7)', marginTop:'1.5rem'}}>
            No individual tracking. Team-level signals only. GDPR-aligned.
          </p>
        </div>
      </section>

      {/* Section 2 — Teams We've Worked With */}
      <section style={{padding:'3rem 2rem', borderBottom:'1px solid #e5e7eb', background:'#f9fafb'}}>
        <div style={styles.sectionInner}>
          <h2 style={{fontSize:'1.5rem', fontWeight:700, color:'#1e293b', textAlign:'center', marginBottom:8}}>Teams we've worked with</h2>
          <p style={{fontSize:'0.95rem', color:'#64748b', textAlign:'center', marginBottom:40}}>Early pilots, partners, and teams we've collaborated with across Europe.</p>
          
          <div style={{overflow:'hidden', position:'relative', width:'100%'}}>
            <div className="carousel-track" style={{
              display:'flex',
              gap:80,
              alignItems:'center',
              whiteSpace:'nowrap'
            }}>
              {/* First set */}
              <img src="/images/logos/supermetrics.svg" alt="Supermetrics" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/supermetrics.png'} />
              <img src="/images/logos/netguru.svg" alt="Netguru" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/netguru.png'} />
              <img src="/images/logos/synthesia.svg" alt="Synthesia" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/synthesia.png'} />
              <img src="/images/logos/toggl.svg" alt="Toggl" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/toggl.png'} />
              <img src="/images/logos/sharewell.svg" alt="Sharewell" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/sharewell.png'} />
              <img src="/images/logos/cleveron.svg" alt="Cleveron" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/cleveron.png'} />
              <img src="/images/logos/rutwol.svg" alt="Rutwol" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/rutwol.png'} />
              {/* Duplicate set for infinite loop */}
              <img src="/images/logos/supermetrics.svg" alt="Supermetrics" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/supermetrics.png'} />
              <img src="/images/logos/netguru.svg" alt="Netguru" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/netguru.png'} />
              <img src="/images/logos/synthesia.svg" alt="Synthesia" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/synthesia.png'} />
              <img src="/images/logos/toggl.svg" alt="Toggl" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/toggl.png'} />
              <img src="/images/logos/sharewell.svg" alt="Sharewell" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/sharewell.png'} />
              <img src="/images/logos/cleveron.svg" alt="Cleveron" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/cleveron.png'} />
              <img src="/images/logos/rutwol.svg" alt="Rutwol" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/rutwol.png'} />
            </div>
          </div>
        </div>
        <style>{`
          @keyframes scroll-carousel {
            0% { transform: translateX(0); }
            100% { transform: translateX(calc(-80px * 7 - 80px * 7)); }
          }
          .carousel-track {
            animation: scroll-carousel 30s linear infinite;
          }
        `}</style>
      </section>

      {/* Section 3 — What It Is / What It's Not */}
      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>SignalTrue measures patterns, not people</h2>
          <p style={styles.lead}>
            SignalTrue analyzes how teams work together over time using aggregated metadata from tools like Slack and Calendar. It surfaces sustained overload, engagement drift, and focus erosion early — before problems show up in surveys, performance reviews, or resignations.
          </p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:24, marginTop:32}}>
            <div style={{background:'white', borderLeft:'4px solid #ef4444', padding:24, borderRadius:8}}>
              <h3 style={{fontSize:'1.25rem', fontWeight:700, marginBottom:12}}>What SignalTrue is NOT</h3>
              <ul style={{listStyle:'none', padding:0, margin:0}}>
                <li style={{padding:'4px 0'}}>✗ Not time tracking</li>
                <li style={{padding:'4px 0'}}>✗ Not employee surveillance</li>
                <li style={{padding:'4px 0'}}>✗ Not performance scoring</li>
                <li style={{padding:'4px 0'}}>✗ Not sentiment spying</li>
              </ul>
            </div>
            <div style={{background:'white', borderLeft:'4px solid #6366f1', padding:24, borderRadius:8}}>
              <h3 style={{fontSize:'1.25rem', fontWeight:700, marginBottom:12}}>What SignalTrue IS</h3>
              <ul style={{listStyle:'none', padding:0, margin:0}}>
                <li style={{padding:'4px 0'}}>✓ Team-level aggregation only</li>
                <li style={{padding:'4px 0'}}>✓ Early-warning system for drift and overload</li>
                <li style={{padding:'4px 0'}}>✓ Leadership decision support, not automation</li>
                <li style={{padding:'4px 0'}}>✓ Built for trust in modern, remote teams</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 — How It Works Diagram */}
      <section style={{...styles.section, background:'#0f172a', color:'white'}}>
        <div style={styles.sectionInner}>
          <h2 style={{...styles.h2, color:'white', marginBottom:40}}>How SignalTrue Works</h2>
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:20, flexWrap:'wrap'}}>
            <div style={{background:'#1e293b', padding:20, borderRadius:8, border:'1px solid #334155', width:200, textAlign:'center'}}>
              <div style={{fontSize:24, marginBottom:10}}>🔌</div>
              <div style={{fontWeight:700, color:'white', marginBottom:5}}>Tools</div>
              <div style={{fontSize:13, color:'#94a3b8'}}>Slack, Calendar, Jira metadata</div>
            </div>
            <div style={{color:'#64748b', fontSize:24}}>→</div>
            <div style={{background:'#1e293b', padding:20, borderRadius:8, border:'1px solid #334155', width:200, textAlign:'center'}}>
              <div style={{fontSize:24, marginBottom:10}}>📊</div>
              <div style={{fontWeight:700, color:'white', marginBottom:5}}>Signals</div>
              <div style={{fontSize:13, color:'#94a3b8'}}>Drift, Overload, Focus Erosion</div>
            </div>
            <div style={{color:'#64748b', fontSize:24}}>→</div>
            <div style={{background:'#1e293b', padding:20, borderRadius:8, border:'1px solid #334155', width:200, textAlign:'center'}}>
              <div style={{fontSize:24, marginBottom:10}}>🧠</div>
              <div style={{fontWeight:700, color:'white', marginBottom:5}}>Context</div>
              <div style={{fontSize:13, color:'#94a3b8'}}>Events, Launches, Reorgs</div>
            </div>
            <div style={{color:'#64748b', fontSize:24}}>→</div>
            <div style={{background:'#1e293b', padding:20, borderRadius:8, border:'1px solid #334155', width:200, borderBottom:'4px solid #34d399', textAlign:'center'}}>
              <div style={{fontSize:24, marginBottom:10}}>⚡️</div>
              <div style={{fontWeight:700, color:'white', marginBottom:5}}>Action</div>
              <div style={{fontSize:13, color:'#94a3b8'}}>Micro-playbooks & Decisions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5 — Feature-by-Effect */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>From raw activity to clear decisions</h2>
          <p style={styles.lead}>Traditional tools show what already happened. SignalTrue shows what is starting to go wrong.</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:24, marginTop:32}}>
            <div style={styles.card}>
              <h3 style={{fontSize:'1.1rem', fontWeight:700, marginBottom:8}}>Detect burnout risk early</h3>
              <p style={{color:'#6b7280', fontSize:'0.95rem'}}>See sustained after-hours work and focus fragmentation before people quit.</p>
            </div>
            <div style={styles.card}>
              <h3 style={{fontSize:'1.1rem', fontWeight:700, marginBottom:8}}>Avoid meeting overload</h3>
              <p style={{color:'#6b7280', fontSize:'0.95rem'}}>Identify teams where meeting load is displacing deep work and slowing execution.</p>
            </div>
            <div style={styles.card}>
              <h3 style={{fontSize:'1.1rem', fontWeight:700, marginBottom:8}}>Support data-driven decisions</h3>
              <p style={{color:'#6b7280', fontSize:'0.95rem'}}>Answer "Is this a bad week or a real problem?" with trends, context, and recommendations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6 — The New Way to See Engagement */}
      <section style={{...styles.section, background:'#f9fafb'}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.h2}>Finally, a real-time view of your organisation's energy.</h2>
          <p style={styles.lead}>
            Surveys capture moments in time. SignalTrue captures momentum.<br />
            See how engagement evolves — celebrate progress, support leaders, and strengthen connection across every team.
          </p>
        </div>
      </section>

      {/* Section 7 — How It Works */}
      <section style={styles.section}>
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

  hero:{background:'#0f172a',color:'white',padding:'6rem 2rem 4rem',textAlign:'center'},
  heroInner:{maxWidth:950,margin:'0 auto'},
  badge:{display:'inline-block',padding:'6px 12px',borderRadius:999,background:'rgba(255,255,255,0.15)',backdropFilter:'blur(4px)',marginBottom:16},
  heroTitle:{fontSize:'3rem',fontWeight:800,margin:'0 0 12px'},
  heroSubtitle:{fontSize:'1.125rem',opacity:0.95,margin:'0 auto 24px',maxWidth:760,lineHeight:1.6},
  ctaRow:{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap', marginTop:32},
  primaryButton:{padding:'0.9rem 1.4rem',background:'#059669',color:'white',border:'none',borderRadius:8,fontWeight:700,cursor:'pointer',textDecoration:'none',display:'inline-block'},
  secondaryButton:{padding:'0.9rem 1.4rem',background:'transparent',color:'white',border:'2px solid white',borderRadius:8,fontWeight:700,cursor:'pointer',textDecoration:'none',display:'inline-block'},

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
  link:{color:'#059669',textDecoration:'none',fontWeight:700},
  cta:{background:'#0f172a',padding:'4.5rem 2rem',textAlign:'center'}
};

export default Home;
