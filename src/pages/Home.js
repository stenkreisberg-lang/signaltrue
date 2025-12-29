import React from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import ButtonUnified from '../components/ButtonUnified';
import { spacing, typography, colors, radius, layout } from '../styles/designSystem';

/**
 * HOME PAGE - RESTRUCTURED WITH DESIGN SYSTEM
 * 
 * Structure: Hero 2-column → Trust strip → How it works 3-card → Benefits grouped → Final CTA
 * Background rhythm: bgDark (hero) → bgLight (trust) → bgWhite (how it works) → bgSubtle (benefits) → bgWhite (CTA)
 */

function Home() {
  const styles = {
    // Hero Section - 2 column layout
    hero: {
      background: colors.bgDark,
      color: colors.textInverse,
      padding: `${spacing['4xl']} ${spacing.containerPaddingDesktop} ${spacing['3xl']}`,
    },
    heroInner: {
      maxWidth: spacing.containerMaxWidth,
      margin: '0 auto',
      paddingLeft: spacing.containerPaddingDesktop,
      paddingRight: spacing.containerPaddingDesktop,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: spacing['3xl'],
      alignItems: 'center',
    },
    heroContent: {
      // Left column: headline, subhead, CTAs
    },
    heroTitle: {
      fontSize: typography.hero,
      fontWeight: typography.weightBold,
      lineHeight: typography.lineHeightTight,
      margin: `0 0 ${spacing.lg}`,
      fontFamily: typography.sans,
      color: colors.textInverse,
    },
    heroSubtitle: {
      fontSize: typography.bodyLarge,
      color: colors.textInverseSecondary,
      lineHeight: typography.lineHeightRelaxed,
      margin: `0 0 ${spacing.lg}`,
    },
    heroExplanation: {
      fontSize: typography.body,
      color: colors.textInverseSecondary,
      lineHeight: typography.lineHeightRelaxed,
      margin: `${spacing.lg} 0`,
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
      flexWrap: 'wrap',
    },
    ctaRow: {
      display: 'flex',
      gap: spacing.md,
      flexWrap: 'wrap',
      marginTop: spacing.xl,
    },
    ctaMicrocopy: {
      fontSize: typography.bodySmall,
      color: colors.textInverseSecondary,
      marginTop: spacing.md,
      fontStyle: 'italic',
    },
    
    // Visual Proof Card (right column)
    proofCard: {
      background: 'rgba(255,255,255,0.1)',
      borderRadius: radius.lg,
      padding: spacing.xl,
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
    
    // Section styles (reusable)
    section: {
      padding: `${spacing.sectionPaddingDesktop} ${spacing.containerPaddingDesktop}`,
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
      maxWidth: typography.maxWidthParagraph,
      margin: `0 auto ${spacing.xl}`,
      lineHeight: typography.lineHeightRelaxed,
    },
    
    // 3-card grid (How it works)
    cardsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: spacing.xl,
    },
    card: {
      background: colors.bgWhite,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      padding: spacing.xl,
      textAlign: 'center',
    },
    cardIcon: {
      fontSize: '3rem',
      marginBottom: spacing.md,
    },
    cardTitle: {
      fontSize: typography.h3,
      fontWeight: typography.weightBold,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    cardBody: {
      fontSize: typography.body,
      color: colors.textSecondary,
      lineHeight: typography.lineHeightRelaxed,
    },
    
    // What IS / NOT cards
    gridTwo: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: spacing.xl,
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
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgLight }}>
      <SiteHeader />

      {/* HERO SECTION - 2 Column Layout */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          {/* Left column: Headline, subhead, explanation, CTAs */}
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>
              Detect organizational drift before it becomes damage.
            </h1>
            <p style={styles.heroSubtitle}>
              SignalTrue detects early behavioral signals that predict burnout, overload, and execution breakdown before leaders feel the impact.
            </p>
            
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
              <ButtonUnified as={Link} to="/register" variant="primary" size="lg">
                Request early access
              </ButtonUnified>
              <ButtonUnified as={Link} to="/product" variant="inverse" size="lg">
                See how it works
              </ButtonUnified>
            </div>
            
            <p style={styles.ctaMicrocopy}>
              Signals typically appear after 7–14 days • Requires Slack or Calendar connection
            </p>
          </div>

          {/* Right column: Visual proof card */}
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

      {/* TRUST STRIP - Teams carousel */}
      <section style={{...styles.section, background: colors.bgLight}}>
        <div style={styles.sectionInner}>
          <h2 style={{fontSize: typography.h3, fontWeight: typography.weightBold, color: colors.textPrimary, textAlign:'center', marginBottom: spacing.sm}}>
            Teams we've worked with
          </h2>
          <p style={{fontSize: typography.bodySmall, color: colors.textSecondary, textAlign:'center', marginBottom: spacing.xl}}>
            Early pilots, partners, and teams we've collaborated with across Europe.
          </p>
          
          <div style={{overflow:'hidden', position:'relative', width:'100%'}}>
            <div className="carousel-track" style={{
              display:'flex',
              gap: spacing['4xl'],
              alignItems:'center',
              whiteSpace:'nowrap'
            }}>
              <img src="/images/logos/supermetrics.svg" alt="Supermetrics" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => { e.target.src='/images/logos/supermetrics.png'; }} />
              <img src="/images/logos/netguru.svg" alt="Netguru" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => { e.target.src='/images/logos/netguru.png'; }} />
              <img src="/images/logos/synthesia.svg" alt="Synthesia" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => { e.target.src='/images/logos/synthesia.png'; }} />
              <img src="/images/logos/toggl.svg" alt="Toggl" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => { e.target.src='/images/logos/toggl.png'; }} />
              <img src="/images/logos/sharewell.svg" alt="Sharewell" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => { e.target.src='/images/logos/sharewell.png'; }} />
              <img src="/images/logos/cleveron.svg" alt="Cleveron" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => { e.target.src='/images/logos/cleveron.png'; }} />
              <img src="/images/logos/rutwol.svg" alt="Rutwol" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => { e.target.src='/images/logos/rutwol.png'; }} />
              {/* Duplicate for seamless loop */}
              <img src="/images/logos/supermetrics.svg" alt="Supermetrics" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => { e.target.src='/images/logos/supermetrics.png'; }} />
              <img src="/images/logos/netguru.svg" alt="Netguru" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => { e.target.src='/images/logos/netguru.png'; }} />
              <img src="/images/logos/synthesia.svg" alt="Synthesia" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => { e.target.src='/images/logos/synthesia.png'; }} />
              <img src="/images/logos/toggl.svg" alt="Toggl" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => { e.target.src='/images/logos/toggl.png'; }} />
              <img src="/images/logos/sharewell.svg" alt="Sharewell" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => { e.target.src='/images/logos/sharewell.png'; }} />
              <img src="/images/logos/cleveron.svg" alt="Cleveron" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => { e.target.src='/images/logos/cleveron.png'; }} />
              <img src="/images/logos/rutwol.svg" alt="Rutwol" style={{height:32, filter:'grayscale(100%)', opacity:0.4, flexShrink:0}} onError={(e) => { e.target.src='/images/logos/rutwol.png'; }} />
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

      {/* HOW IT WORKS - 3 Equal Cards */}
      <section style={{...styles.section, background: colors.bgWhite}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>
            How SignalTrue Works
          </h2>
          <p style={styles.sectionLead}>
            Three steps from integration to early-warning signals.
          </p>
          
          <div style={styles.cardsGrid}>
            <div style={styles.card}>
              <div style={styles.cardIcon}>🔌</div>
              <h3 style={styles.cardTitle}>Connect tools</h3>
              <p style={styles.cardBody}>
                Slack, Calendar, Jira metadata. No message content, no individual surveillance, team-level signals only.
              </p>
            </div>
            
            <div style={styles.card}>
              <div style={styles.cardIcon}>📊</div>
              <h3 style={styles.cardTitle}>Signals detected</h3>
              <p style={styles.cardBody}>
                Drift, Overload, Focus Erosion. Early behavioral signals that predict burnout and execution breakdown.
              </p>
            </div>
            
            <div style={styles.card}>
              <div style={styles.cardIcon}>🧠</div>
              <h3 style={styles.cardTitle}>Recommended actions</h3>
              <p style={styles.cardBody}>
                Decide when to intervene. Leadership decision support, not automation. Built for trust in modern teams.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS - What IS / NOT Section */}
      <section style={{...styles.section, background: colors.bgSubtle}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Early-warning signals, not retrospective analytics</h2>
          <p style={styles.sectionLead}>
            SignalTrue detects early behavioral signals that predict burnout, overload, and execution breakdown before leaders feel the impact. Built from aggregated metadata only. No message content, no individual surveillance, team-level signals only.
          </p>
          <div style={styles.gridTwo}>
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

      {/* CTA Section */}
      <section style={{...styles.section, textAlign:'center', background: colors.bgWhite}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Start seeing early signals</h2>
          <p style={styles.sectionLead}>
            Join teams using SignalTrue to detect drift before it becomes damage.
          </p>
          <div style={{...styles.ctaRow, justifyContent: 'center'}}>
            <ButtonUnified as={Link} to="/register" variant="primary" size="lg">
              Request early access
            </ButtonUnified>
            <ButtonUnified as={Link} to="/product" variant="secondary" size="lg">
              Learn more
            </ButtonUnified>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default Home;
