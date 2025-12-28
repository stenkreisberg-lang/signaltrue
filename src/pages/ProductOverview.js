import React from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import Button from '../components/Button';
import { colors, typography, spacing, radius, shadows } from '../styles/tokens';

function ProductOverview() {
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
      margin: `0 auto ${spacing.xl}`,
      maxWidth: '700px',
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
    
    // Timeline
    timeline: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: `${spacing.xl} 0`,
    },
    timelineStep: {
      display: 'flex',
      gap: spacing.xl,
      marginBottom: spacing['2xl'],
      alignItems: 'flex-start',
    },
    timelineNumber: {
      width: '48px',
      height: '48px',
      borderRadius: radius.full,
      background: colors.primary,
      color: colors.textInverse,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: typography.weightBold,
      fontSize: typography.h3,
      flexShrink: 0,
    },
    timelineContent: {
      flex: 1,
      paddingTop: spacing.xs,
    },
    timelineTitle: {
      fontSize: typography.h3,
      fontWeight: typography.weightBold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    timelineDesc: {
      fontSize: typography.body,
      color: colors.textSecondary,
      lineHeight: typography.lineHeightRelaxed,
      marginBottom: spacing.sm,
    },
    timelineMeta: {
      fontSize: typography.bodySmall,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    
    // Grid layouts
    grid3: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
    cardIcon: {
      fontSize: '2.5rem',
      marginBottom: spacing.md,
    },
    cardTitle: {
      fontSize: typography.h3,
      fontWeight: typography.weightBold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    cardDesc: {
      fontSize: typography.body,
      color: colors.textSecondary,
      lineHeight: typography.lineHeightRelaxed,
    },
    
    // "We Do NOT" section
    notSection: {
      background: colors.surface,
      border: `3px solid ${colors.error}`,
      borderRadius: radius.lg,
      padding: spacing['2xl'],
      marginTop: spacing['2xl'],
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
    
    // Dark section
    darkSection: {
      background: colors.bgDark,
      color: colors.textInverse,
      padding: `${spacing['3xl']} ${spacing.xl}`,
    },
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgLight }}>
      <SiteHeader theme="light" />

      {/* Hero Section - SIMPLIFIED JARGON */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>
            Detect team health drift early
          </h1>
          <p style={styles.heroSubtitle}>
            Understand what changed and what to do next — before burnout, turnover, or performance issues become visible.
          </p>
          <div style={styles.ctaRow}>
            <Button as={Link} to="/register" variant="primary">
              Request early access
            </Button>
            <Button as={Link} to="#how-it-works" variant="secondary" inverse>
              See how it works
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works - TIME-BASED STEPS */}
      <section style={{...styles.section, background: colors.bgLight}} id="how-it-works">
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>How SignalTrue Works</h2>
          <p style={styles.sectionLead}>
            From connection to actionable signals in 5 clear steps
          </p>
          
          <div style={styles.timeline}>
            {/* Step 1 */}
            <div style={styles.timelineStep}>
              <div style={styles.timelineNumber}>1</div>
              <div style={styles.timelineContent}>
                <h3 style={styles.timelineTitle}>Connect tools</h3>
                <p style={styles.timelineDesc}>
                  Connect Slack, Google Calendar, or Microsoft Teams using OAuth. No message content is accessed — only metadata like timestamps, thread lengths, and meeting durations.
                </p>
                <p style={styles.timelineMeta}>⏱ 5 minutes</p>
              </div>
            </div>

            {/* Step 2 */}
            <div style={styles.timelineStep}>
              <div style={styles.timelineNumber}>2</div>
              <div style={styles.timelineContent}>
                <h3 style={styles.timelineTitle}>Baseline calibration (7–14 days)</h3>
                <p style={styles.timelineDesc}>
                  SignalTrue observes your team's normal collaboration patterns: typical meeting load, response times, after-hours activity, thread depth. This creates your unique baseline.
                </p>
                <p style={styles.timelineMeta}>⏱ 7–14 days passive observation</p>
              </div>
            </div>

            {/* Step 3 */}
            <div style={styles.timelineStep}>
              <div style={styles.timelineNumber}>3</div>
              <div style={styles.timelineContent}>
                <h3 style={styles.timelineTitle}>Drift detection</h3>
                <p style={styles.timelineDesc}>
                  Once calibrated, SignalTrue monitors for sustained deviations from baseline. When patterns shift (e.g., after-hours load up 30% for 10+ days), a signal is generated.
                </p>
                <p style={styles.timelineMeta}>⏱ Continuous monitoring</p>
              </div>
            </div>

            {/* Step 4 */}
            <div style={styles.timelineStep}>
              <div style={styles.timelineNumber}>4</div>
              <div style={styles.timelineContent}>
                <h3 style={styles.timelineTitle}>Signal explanation</h3>
                <p style={styles.timelineDesc}>
                  Each signal includes: what changed, by how much, over what timeframe, and probable cause (e.g., "Meeting duration increased 25% after Product-Alpha launch sprint began").
                </p>
                <p style={styles.timelineMeta}>⏱ Delivered in real-time dashboard</p>
              </div>
            </div>

            {/* Step 5 */}
            <div style={styles.timelineStep}>
              <div style={styles.timelineNumber}>5</div>
              <div style={styles.timelineContent}>
                <h3 style={styles.timelineTitle}>Recommended actions</h3>
                <p style={styles.timelineDesc}>
                  Signals include guidance: "Consider: Async-first protocols for next sprint" or "Schedule: Retrospective on meeting overhead." You decide when to act.
                </p>
                <p style={styles.timelineMeta}>⏱ Your decision, your timing</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Capabilities */}
      <section style={{...styles.section, background: colors.bgSubtle}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>What SignalTrue Detects</h2>
          <p style={styles.sectionLead}>
            Five core capabilities for team health monitoring
          </p>
          
          <div style={styles.grid3}>
            <div style={styles.card}>
              <div style={styles.cardIcon}>📉</div>
              <h3 style={styles.cardTitle}>Engagement Drift</h3>
              <p style={styles.cardDesc}>
                Declining participation, slower response times, reduced async contribution. Early indicators of disengagement before surveys catch it.
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.cardIcon}>⚡</div>
              <h3 style={styles.cardTitle}>Overload Signals</h3>
              <p style={styles.cardDesc}>
                Sustained after-hours activity, meeting load creep, context-switching patterns. Burnout risk before resignations.
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.cardIcon}>🎯</div>
              <h3 style={styles.cardTitle}>Focus Erosion</h3>
              <p style={styles.cardDesc}>
                Fragmented work blocks, increased interruptions, declining deep work windows. Productivity loss before output drops.
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.cardIcon}>💬</div>
              <h3 style={styles.cardTitle}>Communication Fragmentation</h3>
              <p style={styles.cardDesc}>
                Thread complexity rising, decision closure declining, coordination overhead increasing. Collaboration friction before project delays.
              </p>
            </div>

            <div style={styles.card}>
              <div style={styles.cardIcon}>📊</div>
              <h3 style={styles.cardTitle}>Baseline Deviation</h3>
              <p style={styles.cardDesc}>
                Any sustained change from your team's normal patterns. Custom thresholds per team, not industry averages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EXPLICIT "WE DO NOT" SECTION - SPECIFICATION REQUIREMENT */}
      <section style={styles.section}>
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

      {/* CTA Section */}
      <section style={{...styles.section, textAlign:'center', background:colors.bgSubtle}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Ready to detect drift early?</h2>
          <p style={styles.sectionLead}>
            Join teams using SignalTrue to see problems before they become crises.
          </p>
          <div style={styles.ctaRow}>
            <Button as={Link} to="/register" variant="primary">
              Request early access
            </Button>
            <Button as={Link} to="/pricing" variant="secondary">
              See pricing
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default ProductOverview;
