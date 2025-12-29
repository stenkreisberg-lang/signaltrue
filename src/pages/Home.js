import React from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import Button from '../components/Button';
import { colors, typography, spacing, radius, shadows } from '../styles/tokens';

function Home() {
  const styles = {
    // Hero Section
    hero: {
      background: colors.bgDark,
      color: colors.textInverse,
      padding: `${spacing['4xl']} ${spacing.xl} ${spacing['3xl']}`,
      textAlign: 'center',
    },
    heroInner: {
      maxWidth: spacing.containerMaxWidth,
      margin: '0 auto',
    },
    heroTitle: {
      fontSize: typography.hero,
      fontWeight: typography.weightBold,
      lineHeight: typography.lineHeightTight,
      margin: `0 0 ${spacing.lg}`,
      fontFamily: typography.sans,
    },
    heroSubtitle: {
      fontSize: typography.bodyLarge,
      color: colors.textInverseSecondary,
      lineHeight: typography.lineHeightRelaxed,
      margin: `0 auto ${spacing.md}`,
      maxWidth: '700px',
    },
    heroExplanation: {
      fontSize: typography.body,
      color: colors.textInverseSecondary,
      lineHeight: typography.lineHeightRelaxed,
      margin: `${spacing.lg} auto`,
      maxWidth: '650px',
      padding: `${spacing.md} ${spacing.lg}`,
      background: 'rgba(255,255,255,0.05)',
      borderRadius: radius.md,
      borderLeft: `3px solid ${colors.primary}`,
    },
    checkmarks: {
      marginTop: spacing.lg,
      display: 'flex',
      gap: spacing.lg,
      fontSize: typography.bodySmall,
      color: colors.textInverseSecondary,
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    ctaRow: {
      display: 'flex',
      gap: spacing.md,
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginTop: spacing['2xl'],
    },
    ctaMicrocopy: {
      fontSize: typography.bodySmall,
      color: colors.textInverseSecondary,
      marginTop: spacing.lg,
      fontStyle: 'italic',
    },
    
    // Visual Proof Card
    proofCard: {
      background: 'rgba(255,255,255,0.1)',
      borderRadius: radius.lg,
      padding: spacing.xl,
      maxWidth: '500px',
      margin: `${spacing['2xl']} auto 0`,
      textAlign: 'left',
      border: `1px solid rgba(255,255,255,0.2)`,
    },
    proofTitle: {
      fontSize: typography.h3,
      fontWeight: typography.weightSemibold,
      marginBottom: spacing.sm,
      color: colors.textInverse,
    },
    proofMeta: {
      fontSize: typography.bodySmall,
      color: colors.textInverseSecondary,
      marginBottom: spacing.md,
    },
    proofIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    proofDot: {
      width: '12px',
      height: '12px',
      borderRadius: radius.full,
      backgroundColor: colors.warning,
    },
    proofExplanation: {
      fontSize: typography.bodySmall,
      color: colors.textInverseSecondary,
      marginTop: spacing.md,
      padding: spacing.md,
      background: 'rgba(0,0,0,0.2)',
      borderRadius: radius.sm,
      borderLeft: `2px solid ${colors.warning}`,
    },
    
    // Section styles
    section: {
      padding: `${spacing['3xl']} ${spacing.xl}`,
      borderBottom: `1px solid ${colors.border}`,
    },
    sectionInner: {
      maxWidth: spacing.containerMaxWidth,
      margin: '0 auto',
    },
    sectionTitle: {
      fontSize: typography.h2,
      fontWeight: typography.weightBold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.md,
      lineHeight: typography.lineHeightTight,
    },
    sectionLead: {
      fontSize: typography.bodyLarge,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: '700px',
      margin: `0 auto ${spacing['2xl']}`,
      lineHeight: typography.lineHeightRelaxed,
    },
    
    // Grid layouts
    grid2: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: spacing.xl,
      marginTop: spacing['2xl'],
    },
    
    // Cards
    card: {
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      padding: spacing.xl,
    },
    cardHighlight: {
      background: colors.surface,
      border: `3px solid ${colors.primary}`,
      borderRadius: radius.lg,
      padding: spacing.xl,
    },
    cardTitle: {
      fontSize: typography.h3,
      fontWeight: typography.weightBold,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    cardList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    cardListItem: {
      padding: `${spacing.sm} 0`,
      color: colors.textSecondary,
      fontSize: typography.body,
    },
    
    // Dark section
    darkSection: {
      background: colors.bgDark,
      color: colors.textInverse,
      padding: `${spacing['3xl']} ${spacing.xl}`,
    },
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgLight }}>
      <SiteHeader theme="dark" />

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>
            Detect organizational drift before it becomes damage.
          </h1>
          <p style={styles.heroSubtitle}>
            SignalTrue detects early behavioral signals that predict burnout, overload, and execution breakdown before leaders feel the impact.
          </p>
          
          {/* SPECIFICATION REQUIREMENT: Concrete inputs explanation */}
          <div style={styles.heroExplanation}>
            <strong>Built from calendar load, response latency, after-hours activity, and collaboration patterns.</strong>
            <br />
            No surveys. No content monitoring. Team-level signals only.
          </div>
          
          <div style={styles.checkmarks}>
            <span>✓ No individual tracking</span>
            <span>✓ Team-level signals only</span>
            <span>✓ GDPR-aligned</span>
          </div>
          
          <div style={styles.ctaRow}>
            <Button as={Link} to="/register" variant="primary">
              Request early access
            </Button>
            <Button as={Link} to="/product" variant="secondary" inverse>
              See how it works
            </Button>
          </div>
          
          {/* SPECIFICATION REQUIREMENT: CTA microcopy */}
          <p style={styles.ctaMicrocopy}>
            Signals typically appear after 7–14 days • Requires Slack or Calendar connection
          </p>
          
          {/* SPECIFICATION REQUIREMENT: Visual proof card */}
          <div style={styles.proofCard}>
            <div style={styles.proofTitle}>Team "Product-Alpha" Drift Alert</div>
            <div style={styles.proofMeta}>Detected: Dec 20, 2025 • Confidence: High</div>
            
            <div style={styles.proofIndicator}>
              <div style={styles.proofDot}></div>
              <span style={{color: colors.textInverse, fontSize: typography.body}}>
                <strong>Communication Fragmentation:</strong> Rising
              </span>
            </div>
            
            <div style={styles.proofIndicator}>
              <div style={styles.proofDot}></div>
              <span style={{color: colors.textInverse, fontSize: typography.body}}>
                <strong>After-Hours Load:</strong> +35% vs baseline
              </span>
            </div>
            
            <div style={styles.proofExplanation}>
              <strong>Why this changed:</strong> Increased urgency tags in Slack threads. Meeting durations +20% over 14 days. Suggests coordination overhead rising.
            </div>
          </div>
        </div>
      </section>

      {/* Teams Carousel - keeping existing code */}
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
              {/* Logo carousel content */}
              <img src="/images/logos/supermetrics.svg" alt="Supermetrics" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/supermetrics.png'} />
              <img src="/images/logos/netguru.svg" alt="Netguru" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/netguru.png'} />
              <img src="/images/logos/synthesia.svg" alt="Synthesia" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/synthesia.png'} />
              <img src="/images/logos/toggl.svg" alt="Toggl" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/toggl.png'} />
              <img src="/images/logos/sharewell.svg" alt="Sharewell" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/sharewell.png'} />
              <img src="/images/logos/cleveron.svg" alt="Cleveron" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/cleveron.png'} />
              <img src="/images/logos/rutwol.svg" alt="Rutwol" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => e.target.src='/images/logos/rutwol.png'} />
              {/* Duplicate set */}
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

      {/* What It Is / What It's NOT Section */}
      <section style={{...styles.section, background: colors.bgLight}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Early-warning signals, not retrospective analytics</h2>
          <p style={styles.sectionLead}>
            SignalTrue detects early behavioral signals that predict burnout, overload, and execution breakdown before leaders feel the impact. Built from aggregated metadata only. No message content, no individual surveillance, team-level signals only.
          </p>
          <div style={styles.grid2}>
            <div style={{...styles.card, borderLeft: `4px solid ${colors.error}`}}>
              <h3 style={{...styles.cardTitle, color: colors.error}}>What SignalTrue is NOT</h3>
              <ul style={styles.cardList}>
                <li style={styles.cardListItem}>✗ Not time tracking</li>
                <li style={styles.cardListItem}>✗ Not employee surveillance</li>
                <li style={styles.cardListItem}>✗ Not performance scoring</li>
                <li style={styles.cardListItem}>✗ Not sentiment spying</li>
                <li style={styles.cardListItem}>✗ Not content monitoring</li>
              </ul>
            </div>
            <div style={{...styles.card, borderLeft: `4px solid ${colors.primary}`}}>
              <h3 style={{...styles.cardTitle, color: colors.primary}}>What SignalTrue IS</h3>
              <ul style={styles.cardList}>
                <li style={styles.cardListItem}>✓ Team-level aggregation only</li>
                <li style={styles.cardListItem}>✓ Early-warning system for drift and overload</li>
                <li style={styles.cardListItem}>✓ Leadership decision support, not automation</li>
                <li style={styles.cardListItem}>✓ Built for trust in modern, remote teams</li>
                <li style={styles.cardListItem}>✓ GDPR-compliant privacy by design</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Dark Section */}
      <section style={styles.darkSection}>
        <div style={styles.sectionInner}>
          <h2 style={{...styles.sectionTitle, color: colors.textInverse, marginBottom: spacing['2xl']}}>
            How SignalTrue Works
          </h2>
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:spacing.lg, flexWrap:'wrap'}}>
            <div style={{background:'rgba(255,255,255,0.1)', padding:spacing.xl, borderRadius:radius.lg, border:'1px solid rgba(255,255,255,0.2)', width:200, textAlign:'center'}}>
              <div style={{fontSize:'2rem', marginBottom:spacing.md}}>🔌</div>
              <div style={{fontWeight:typography.weightBold, color:colors.textInverse, marginBottom:spacing.sm}}>Tools</div>
              <div style={{fontSize:typography.bodySmall, color:colors.textInverseSecondary}}>Slack, Calendar, Jira metadata</div>
            </div>
            <div style={{color:colors.textMuted, fontSize:'2rem'}}>→</div>
            <div style={{background:'rgba(255,255,255,0.1)', padding:spacing.xl, borderRadius:radius.lg, border:'1px solid rgba(255,255,255,0.2)', width:200, textAlign:'center'}}>
              <div style={{fontSize:'2rem', marginBottom:spacing.md}}>📊</div>
              <div style={{fontWeight:typography.weightBold, color:colors.textInverse, marginBottom:spacing.sm}}>Signals</div>
              <div style={{fontSize:typography.bodySmall, color:colors.textInverseSecondary}}>Drift, Overload, Focus Erosion</div>
            </div>
            <div style={{color:colors.textMuted, fontSize:'2rem'}}>→</div>
            <div style={{background:'rgba(255,255,255,0.1)', padding:spacing.xl, borderRadius:radius.lg, border:'1px solid rgba(255,255,255,0.2)', width:200, textAlign:'center'}}>
              <div style={{fontSize:'2rem', marginBottom:spacing.md}}>🧠</div>
              <div style={{fontWeight:typography.weightBold, color:colors.textInverse, marginBottom:spacing.sm}}>Action</div>
              <div style={{fontSize:typography.bodySmall, color:colors.textInverseSecondary}}>Decide when to intervene</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{...styles.section, textAlign:'center', background:colors.bgSubtle}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Start seeing early signals</h2>
          <p style={styles.sectionLead}>
            Join teams using SignalTrue to detect drift before it becomes damage.
          </p>
          <div style={styles.ctaRow}>
            <Button as={Link} to="/register" variant="primary">
              Request early access
            </Button>
            <Button as={Link} to="/product" variant="secondary">
              Learn more
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default Home;
