import React from 'react';

function IndustrySolutions() {
  return (
    <section style={{padding:'4rem 2rem', background:'#f9fafb'}}>
      <div style={{maxWidth:1100, margin:'0 auto'}}>
        <h2 style={{fontSize:'2.25rem', fontWeight:800, textAlign:'center', marginBottom:10}}>Industry-Specific Solutions</h2>
        <p style={{textAlign:'center', color:'#4b5563', maxWidth:850, margin:'0 auto 28px', lineHeight:1.6}}>
          SignalTrue adapts to the unique needs of your industry. Whether you’re in tech, healthcare, finance, education, or manufacturing, our customizable dashboards and KPIs help you measure what matters most for your teams.
        </p>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16}}>
          <div style={{background:'white', border:'1px solid #e5e7eb', borderRadius:12, padding:16, textAlign:'center'}}>
            <div style={{fontSize:'2rem', marginBottom:8}}>💻</div>
            <div style={{fontWeight:700, marginBottom:6, color:'#111827'}}>Tech & SaaS</div>
            <div style={{color:'#6b7280'}}>Track engineering focus, collaboration, and burnout risk.</div>
          </div>
          <div style={{background:'white', border:'1px solid #e5e7eb', borderRadius:12, padding:16, textAlign:'center'}}>
            <div style={{fontSize:'2rem', marginBottom:8}}>🏥</div>
            <div style={{fontWeight:700, marginBottom:6, color:'#111827'}}>Healthcare</div>
            <div style={{color:'#6b7280'}}>Monitor shift patterns, team resilience, and wellbeing.</div>
          </div>
          <div style={{background:'white', border:'1px solid #e5e7eb', borderRadius:12, padding:16, textAlign:'center'}}>
            <div style={{fontSize:'2rem', marginBottom:8}}>💰</div>
            <div style={{fontWeight:700, marginBottom:6, color:'#111827'}}>Finance</div>
            <div style={{color:'#6b7280'}}>Spot overwork, compliance risk, and engagement trends.</div>
          </div>
          <div style={{background:'white', border:'1px solid #e5e7eb', borderRadius:12, padding:16, textAlign:'center'}}>
            <div style={{fontSize:'2rem', marginBottom:8}}>🎓</div>
            <div style={{fontWeight:700, marginBottom:6, color:'#111827'}}>Education</div>
            <div style={{color:'#6b7280'}}>Support faculty collaboration and student engagement.</div>
          </div>
          <div style={{background:'white', border:'1px solid #e5e7eb', borderRadius:12, padding:16, textAlign:'center'}}>
            <div style={{fontSize:'2rem', marginBottom:8}}>🏭</div>
            <div style={{fontWeight:700, marginBottom:6, color:'#111827'}}>Manufacturing</div>
            <div style={{color:'#6b7280'}}>Track shift handoffs, safety, and team communication.</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default IndustrySolutions;
