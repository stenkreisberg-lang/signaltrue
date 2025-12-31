import React from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import ButtonUnified from '../components/ButtonUnified';
import { spacing, typography, colors, radius, layout } from '../styles/designSystem';

/**
 * PRODUCT PAGE - RESTRUCTURED WITH DESIGN SYSTEM
 * 
 * Structure: Hero → Signal blocks (alternating layout) → "We Do NOT" section → CTA
 * Signal blocks: Repeatable structure with name, sentence, example insight, example action
 * Layout alternation: Block 1 (text left, visual right), Block 2 (visual left, text right), etc.
 */

function ProductOverview() {
  const styles = {
    // Hero Section
    hero: {
      background: colors.bgDark,
      color: colors.textInverse,
      padding: `${spacing['4xl']} ${spacing.containerPaddingDesktop} ${spacing['3xl']}`,
      textAlign: 'center',
    },
    heroInner: {
      maxWidth: spacing.containerMaxWidth,
      margin: '0 auto',
      paddingLeft: spacing.containerPaddingDesktop,
      paddingRight: spacing.containerPaddingDesktop,
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
      margin: `0 auto ${spacing.xl}`,
      maxWidth: typography.maxWidthParagraph,
    },
    ctaRow: {
      display: 'flex',
      gap: spacing.md,
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginTop: spacing.xl,
    },
    
    // Section styles
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
    
    // Signal Block - Repeatable structure
    signalBlock: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: spacing['3xl'],
      alignItems: 'center',
      marginBottom: spacing['4xl'],
    },
    signalBlockReverse: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: spacing['3xl'],
      alignItems: 'center',
      marginBottom: spacing['4xl'],
      direction: 'rtl', // Reverse layout
    },
    signalContent: {
      direction: 'ltr', // Reset text direction
    },
    signalTitle: {
      fontSize: typography.h3,
      fontWeight: typography.weightBold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    signalSentence: {
      fontSize: typography.body,
      color: colors.textSecondary,
      lineHeight: typography.lineHeightRelaxed,
      marginBottom: spacing.lg,
    },
    signalExample: {
      padding: spacing.md,
      background: colors.bgSubtle,
      borderRadius: radius.md,
      borderLeft: `3px solid ${colors.primary}`,
      marginBottom: spacing.md,
    },
    signalExampleTitle: {
      fontSize: typography.bodySmall,
      fontWeight: typography.weightSemibold,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    signalExampleText: {
      fontSize: typography.bodySmall,
      color: colors.textSecondary,
      lineHeight: typography.lineHeightRelaxed,
    },
    signalVisual: {
      background: colors.bgLight,
      borderRadius: radius.lg,
      padding: spacing.xl,
      textAlign: 'center',
      border: `1px solid ${colors.border}`,
      direction: 'ltr', // Reset direction for visual
    },
    signalIcon: {
      fontSize: '4rem',
      marginBottom: spacing.md,
    },
    
    // "We Do NOT" section
    notSection: {
      background: colors.surface,
      border: `3px solid ${colors.error}`,
      borderRadius: radius.lg,
      padding: spacing['2xl'],
    },
    notTitle: {
      fontSize: typography.h2,
      fontWeight: typography.weightBold,
      color: colors.error,
      marginBottom: spacing.lg,
      textAlign: 'center',
    },
    notGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: spacing.lg,
    },
    notItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    notIcon: {
      fontSize: '1.5rem',
      color: colors.error,
      flexShrink: 0,
    },
    notText: {
      fontSize: typography.body,
      color: colors.textPrimary,
      lineHeight: typography.lineHeightNormal,
    },
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgLight }}>
      <SiteHeader />

      {/* HERO SECTION */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>
            Detect organizational drift before it becomes damage.
          </h1>
          <p style={styles.heroSubtitle}>
            SignalTrue detects early behavioral signals that predict sustained overload and execution breakdown before leaders feel the impact.
          </p>
          <div style={styles.ctaRow}>
            <ButtonUnified as={Link} to="/register" variant="primary" size="lg">
              Request early access
            </ButtonUnified>
            <ButtonUnified as={Link} to="#signals" variant="inverse" size="lg">
              See signals
            </ButtonUnified>
          </div>
        </div>
      </section>

      {/* SIGNAL BLOCKS - Alternating Layout */}
      <section style={{...styles.section, background: colors.bgWhite}} id="signals">
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>What SignalTrue Detects</h2>
          <p style={styles.sectionLead}>
            Five categories of early-warning signals, each predicting specific organizational risks.
          </p>

          {/* SIGNAL 1: Drift Signals (Text Left, Visual Right) */}
          <div style={styles.signalBlock}>
            <div style={styles.signalContent}>
              <h3 style={styles.signalTitle}>Drift Signals</h3>
              <p style={styles.signalSentence}>
                Declining participation, slower response times, reduced async contribution. Predicts disengagement before surveys detect it.
              </p>
              <div style={styles.signalExample}>
                <div style={styles.signalExampleTitle}>📊 Example Insight</div>
                <div style={styles.signalExampleText}>
                  "Team Product-Alpha: Slack response latency +45% over 14 days. Participation in #general down 30%."
                </div>
              </div>
              <div style={styles.signalExample}>
                <div style={styles.signalExampleTitle}>🎯 Example Action</div>
                <div style={styles.signalExampleText}>
                  "Schedule 1-on-1s with team leads to understand workload distribution and identify blockers."
                </div>
              </div>
            </div>
            <div style={styles.signalVisual}>
              <div style={styles.signalIcon}>🔍</div>
              <div style={{fontSize: typography.bodySmall, color: colors.textSecondary}}>
                Engagement trend visualization
              </div>
            </div>
          </div>

          {/* SIGNAL 2: Overload Signals (Visual Left, Text Right) */}
          <div style={styles.signalBlockReverse}>
            <div style={styles.signalVisual}>
              <div style={styles.signalIcon}>⚡</div>
              <div style={{fontSize: typography.bodySmall, color: colors.textSecondary}}>
                Workload pattern analysis
              </div>
            </div>
            <div style={styles.signalContent}>
              <h3 style={styles.signalTitle}>Overload Signals</h3>
              <p style={styles.signalSentence}>
                Sustained after-hours activity, meeting load creep, context-switching patterns. Capacity risk before resignations.
              </p>
              <div style={styles.signalExample}>
                <div style={styles.signalExampleTitle}>📊 Example Insight</div>
                <div style={styles.signalExampleText}>
                  "Team Engineering-Core: After-hours Slack activity +60% vs baseline. Meeting hours +25% (now 22hr/week avg)."
                </div>
              </div>
              <div style={styles.signalExample}>
                <div style={styles.signalExampleTitle}>🎯 Example Action</div>
                <div style={styles.signalExampleText}>
                  "Implement 'no-meeting Fridays' and audit recurring meetings for necessity."
                </div>
              </div>
            </div>
          </div>

          {/* SIGNAL 3: Focus Erosion (Text Left, Visual Right) */}
          <div style={styles.signalBlock}>
            <div style={styles.signalContent}>
              <h3 style={styles.signalTitle}>Focus Erosion</h3>
              <p style={styles.signalSentence}>
                Fragmented work blocks, increased interruptions, declining deep work windows. Productivity loss before output drops.
              </p>
              <div style={styles.signalExample}>
                <div style={styles.signalExampleTitle}>📊 Example Insight</div>
                <div style={styles.signalExampleText}>
                  "Team Design: Average uninterrupted work block decreased from 2.5hrs to 45min. Context switches +80%."
                </div>
              </div>
              <div style={styles.signalExample}>
                <div style={styles.signalExampleTitle}>🎯 Example Action</div>
                <div style={styles.signalExampleText}>
                  "Establish 'focus hours' (9-12am) with async-first communication norms."
                </div>
              </div>
            </div>
            <div style={styles.signalVisual}>
              <div style={styles.signalIcon}>🎯</div>
              <div style={{fontSize: typography.bodySmall, color: colors.textSecondary}}>
                Focus time fragmentation
              </div>
            </div>
          </div>

          {/* SIGNAL 4: Communication Fragmentation (Visual Left, Text Right) */}
          <div style={styles.signalBlockReverse}>
            <div style={styles.signalVisual}>
              <div style={styles.signalIcon}>💬</div>
              <div style={{fontSize: typography.bodySmall, color: colors.textSecondary}}>
                Thread complexity metrics
              </div>
            </div>
            <div style={styles.signalContent}>
              <h3 style={styles.signalTitle}>Communication Fragmentation</h3>
              <p style={styles.signalSentence}>
                Thread complexity rising, decision closure declining, coordination overhead increasing. Collaboration friction before project delays.
              </p>
              <div style={styles.signalExample}>
                <div style={styles.signalExampleTitle}>📊 Example Insight</div>
                <div style={styles.signalExampleText}>
                  "Team Product-Beta: Average Slack thread depth +40%. Threads with {'>'}15 messages doubled in 2 weeks."
                </div>
              </div>
              <div style={styles.signalExample}>
                <div style={styles.signalExampleTitle}>🎯 Example Action</div>
                <div style={styles.signalExampleText}>
                  "Move complex decisions to synchronous 30min decision-making sessions instead of async Slack."
                </div>
              </div>
            </div>
          </div>

          {/* SIGNAL 5: Baseline Deviation (Text Left, Visual Right) */}
          <div style={styles.signalBlock}>
            <div style={styles.signalContent}>
              <h3 style={styles.signalTitle}>Baseline Deviation</h3>
              <p style={styles.signalSentence}>
                Any sustained change from your team's normal patterns. Custom thresholds per team, not industry averages.
              </p>
              <div style={styles.signalExample}>
                <div style={styles.signalExampleTitle}>📊 Example Insight</div>
                <div style={styles.signalExampleText}>
                  "Team Sales: Typical pattern is 5 meetings/day, 2hr blocks. Now 9 meetings/day, 30min blocks. 400% deviation from baseline."
                </div>
              </div>
              <div style={styles.signalExample}>
                <div style={styles.signalExampleTitle}>🎯 Example Action</div>
                <div style={styles.signalExampleText}>
                  "Review meeting culture: Are all these meetings necessary? Can some be batched or async?"
                </div>
              </div>
            </div>
            <div style={styles.signalVisual}>
              <div style={styles.signalIcon}>📊</div>
              <div style={{fontSize: typography.bodySmall, color: colors.textSecondary}}>
                Pattern deviation tracking
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* "WE DO NOT" SECTION */}
      <section style={{...styles.section, background: colors.bgLight}}>
        <div style={styles.sectionInner}>
          <div style={styles.notSection}>
            <h2 style={styles.notTitle}>We Do NOT</h2>
            <div style={styles.notGrid}>
              <div style={styles.notItem}>
                <span style={styles.notIcon}>✗</span>
                <div>
                  <strong style={styles.notText}>No individual dashboards</strong>
                  <p style={{...styles.notText, fontSize: typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs}}>
                    Signals are team-level only. No per-person metrics, ever.
                  </p>
                </div>
              </div>

              <div style={styles.notItem}>
                <span style={styles.notIcon}>✗</span>
                <div>
                  <strong style={styles.notText}>No message content</strong>
                  <p style={{...styles.notText, fontSize: typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs}}>
                    We never read Slack messages, emails, or document content. Metadata only.
                  </p>
                </div>
              </div>

              <div style={styles.notItem}>
                <span style={styles.notIcon}>✗</span>
                <div>
                  <strong style={styles.notText}>No surveillance</strong>
                  <p style={{...styles.notText, fontSize: typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs}}>
                    This is not employee monitoring software. No screenshots, no keystroke logging, no location tracking.
                  </p>
                </div>
              </div>

              <div style={styles.notItem}>
                <span style={styles.notIcon}>✗</span>
                <div>
                  <strong style={styles.notText}>No performance scoring</strong>
                  <p style={{...styles.notText, fontSize: typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs}}>
                    No productivity scores, no individual rankings, no "top performers" lists.
                  </p>
                </div>
              </div>
            </div>

            <div style={{marginTop: spacing.xl, padding: spacing.lg, background: colors.bgSubtle, borderRadius: radius.md}}>
              <p style={{fontSize: typography.body, color: colors.textPrimary, textAlign: 'center', margin: 0}}>
                <strong>Privacy by design:</strong> All data aggregated at team level (minimum 5 people). OAuth-only access. GDPR-compliant. No PII storage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SHOW ME HOW IT WORKS - Concrete Examples */}
      <section style={{...styles.section, background: colors.bgWhite}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Show Me How It Works</h2>
          <p style={styles.sectionLead}>
            Four stages from detection to proof. Concrete examples at each step.
          </p>

          {/* Example 1: Behavioral Signal */}
          <div style={{marginBottom: spacing['2xl'], padding: spacing.xl, background: colors.bgLight, borderRadius: radius.lg, borderLeft: `4px solid ${colors.primary}`}}>
            <h3 style={{fontSize: typography.h3, fontWeight: typography.weightBold, color: colors.textPrimary, marginBottom: spacing.sm}}>
              1. Behavioral Signal Detected
            </h3>
            <p style={{fontSize: typography.body, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: typography.lineHeightRelaxed}}>
              Work patterns shift. System detects deviation from baseline.
            </p>
            <div style={{padding: spacing.md, background: colors.bgWhite, borderRadius: radius.md, fontFamily: typography.mono, fontSize: typography.bodySmall}}>
              <strong>Example:</strong> "Team Engineering-Core: After-hours Slack activity +32% sustained for 3 weeks. Meeting load +18% (now 24hr/week average)."
            </div>
          </div>

          {/* Example 2: Capability Indicator */}
          <div style={{marginBottom: spacing['2xl'], padding: spacing.xl, background: colors.bgLight, borderRadius: radius.lg, borderLeft: `4px solid ${colors.warning}`}}>
            <h3 style={{fontSize: typography.h3, fontWeight: typography.weightBold, color: colors.textPrimary, marginBottom: spacing.sm}}>
              2. Capacity Indicator Calculated
            </h3>
            <p style={{fontSize: typography.body, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: typography.lineHeightRelaxed}}>
              Resilience and execution capacity measured against thresholds.
            </p>
            <div style={{padding: spacing.md, background: colors.bgWhite, borderRadius: radius.md, fontFamily: typography.mono, fontSize: typography.bodySmall}}>
              <strong>Example:</strong> "Execution capacity: Yellow (drifting). Meeting load above healthy threshold. Focus blocks decreased from 2.5hr to 45min average."
            </div>
          </div>

          {/* Example 3: Recommendation */}
          <div style={{marginBottom: spacing['2xl'], padding: spacing.xl, background: colors.bgLight, borderRadius: radius.lg, borderLeft: `4px solid ${colors.primary}`}}>
            <h3 style={{fontSize: typography.h3, fontWeight: typography.weightBold, color: colors.textPrimary, marginBottom: spacing.sm}}>
              3. Recommendation Generated
            </h3>
            <p style={{fontSize: typography.body, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: typography.lineHeightRelaxed}}>
              System recommends specific actions based on signal type.
            </p>
            <div style={{padding: spacing.md, background: colors.bgWhite, borderRadius: radius.md, fontFamily: typography.mono, fontSize: typography.bodySmall}}>
              <strong>Example:</strong> "Recommended action: Freeze new recurring meetings for 2 weeks. Establish 'focus hours' 9-12am (async-first). Audit existing meeting necessity."
            </div>
          </div>

          {/* Example 4: Impact Tracking */}
          <div style={{marginBottom: spacing['2xl'], padding: spacing.xl, background: colors.bgLight, borderRadius: radius.lg, borderLeft: `4px solid ${colors.success}`}}>
            <h3 style={{fontSize: typography.h3, fontWeight: typography.weightBold, color: colors.textPrimary, marginBottom: spacing.sm}}>
              4. Impact Tracking (Proof It Worked)
            </h3>
            <p style={{fontSize: typography.body, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: typography.lineHeightRelaxed}}>
              After actions taken, system shows before/after metrics.
            </p>
            <div style={{padding: spacing.md, background: colors.bgWhite, borderRadius: radius.md, fontFamily: typography.mono, fontSize: typography.bodySmall}}>
              <strong>Example:</strong> "14 days after action: After-hours activity returned to baseline (-28% vs alert period). Response latency improved 15%. Execution capacity: Green (stable)."
            </div>
          </div>
        </div>
      </section>

      {/* APPLICABILITY - Who It's For */}
      <section style={{...styles.section, background: colors.bgSubtle}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Who Is This For?</h2>
          <div style={{padding: spacing.xl, background: colors.bgWhite, borderRadius: radius.lg, border: `2px solid ${colors.primary}`}}>
            <p style={{fontSize: typography.bodyLarge, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.md, lineHeight: typography.lineHeightRelaxed}}>
              <strong>Built for teams of 10 to 5,000.</strong>
            </p>
            <p style={{fontSize: typography.body, color: colors.textSecondary, textAlign: 'center', margin: 0, lineHeight: typography.lineHeightRelaxed}}>
              Flat organizations welcome. No "leader hierarchy" required. HR, founders, and managers use the same early warning signals.
            </p>
          </div>

          {/* Mode Toggle */}
          <div style={{marginTop: spacing.xl, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg}}>
            <div style={{padding: spacing.lg, background: colors.bgWhite, borderRadius: radius.md, border: `1px solid ${colors.border}`}}>
              <h3 style={{fontSize: typography.h3, fontWeight: typography.weightBold, color: colors.primary, marginBottom: spacing.sm}}>
                Team View (Default)
              </h3>
              <p style={{fontSize: typography.bodySmall, color: colors.textSecondary, lineHeight: typography.lineHeightRelaxed}}>
                For organizations with multiple teams. Each team gets individual drift signals and recommendations.
              </p>
            </div>

            <div style={{padding: spacing.lg, background: colors.bgWhite, borderRadius: radius.md, border: `1px solid ${colors.border}`}}>
              <h3 style={{fontSize: typography.h3, fontWeight: typography.weightBold, color: colors.primary, marginBottom: spacing.sm}}>
                Org Snapshot
              </h3>
              <p style={{fontSize: typography.bodySmall, color: colors.textSecondary, lineHeight: typography.lineHeightRelaxed}}>
                For small teams or flat orgs. Fewer layers, company-wide snapshots. Same signals, simplified structure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CADENCE - Flexibility */}
      <section style={{...styles.section, background: colors.bgWhite}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Flexible Cadence</h2>
          <p style={styles.sectionLead}>
            Always-on for large organizations. Snapshots for small teams. You choose the rhythm.
          </p>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.lg}}>
            <div style={{padding: spacing.lg, background: colors.bgLight, borderRadius: radius.md, textAlign: 'center'}}>
              <h3 style={{fontSize: typography.h3, fontWeight: typography.weightBold, color: colors.textPrimary, marginBottom: spacing.sm}}>
                Always-On
              </h3>
              <p style={{fontSize: typography.bodySmall, color: colors.textSecondary, lineHeight: typography.lineHeightRelaxed}}>
                Real-time signals. Alerts when drift detected. For teams that need continuous monitoring.
              </p>
            </div>

            <div style={{padding: spacing.lg, background: colors.bgLight, borderRadius: radius.md, textAlign: 'center'}}>
              <h3 style={{fontSize: typography.h3, fontWeight: typography.weightBold, color: colors.textPrimary, marginBottom: spacing.sm}}>
                Weekly/Monthly
              </h3>
              <p style={{fontSize: typography.bodySmall, color: colors.textSecondary, lineHeight: typography.lineHeightRelaxed}}>
                Scheduled reviews. Summary reports. For teams that prefer batch processing.
              </p>
            </div>

            <div style={{padding: spacing.lg, background: colors.bgLight, borderRadius: radius.md, textAlign: 'center'}}>
              <h3 style={{fontSize: typography.h3, fontWeight: typography.weightBold, color: colors.textPrimary, marginBottom: spacing.sm}}>
                Quarterly Snapshots
              </h3>
              <p style={{fontSize: typography.bodySmall, color: colors.textSecondary, lineHeight: typography.lineHeightRelaxed}}>
                Point-in-time checks. For small teams or periodic audits. Kaidi-approved 😊
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section style={{...styles.section, textAlign:'center', background: colors.bgWhite}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Ready to detect drift early?</h2>
          <p style={styles.sectionLead}>
            Join teams using SignalTrue to see problems before they become crises.
          </p>
          <div style={styles.ctaRow}>
            <ButtonUnified as={Link} to="/register" variant="primary" size="lg">
              Request early access
            </ButtonUnified>
            <ButtonUnified as={Link} to="/pricing" variant="secondary" size="lg">
              See pricing
            </ButtonUnified>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default ProductOverview;
