import React from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import ButtonUnified from '../components/ButtonUnified';
import { spacing, typography, colors, radius } from '../styles/designSystem';

/**
 * DEMO PAGE - Interactive product tour
 * 
 * Addresses Kaidi's request: "wants to try it to really understand it"
 * Provides experiential clarity, not more text
 */

function Demo() {
  const styles = {
    hero: {
      background: colors.bgDark,
      color: colors.textInverse,
      padding: `${spacing['3xl']} ${spacing.containerPaddingDesktop} ${spacing['2xl']}`,
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
      color: colors.textInverse,
    },
    heroSubtitle: {
      fontSize: typography.bodyLarge,
      color: colors.textInverseSecondary,
      lineHeight: typography.lineHeightRelaxed,
      maxWidth: typography.maxWidthParagraph,
      margin: '0 auto',
    },
    
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
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    sectionLead: {
      fontSize: typography.bodyLarge,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
      lineHeight: typography.lineHeightRelaxed,
      textAlign: 'center',
      maxWidth: typography.maxWidthParagraph,
      margin: `0 auto ${spacing.xl}`,
    },
    
    demoBox: {
      background: colors.bgLight,
      border: `2px solid ${colors.border}`,
      borderRadius: radius.lg,
      padding: spacing['2xl'],
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    
    comingSoonBadge: {
      display: 'inline-block',
      background: colors.primary,
      color: colors.textInverse,
      padding: `${spacing.xs} ${spacing.md}`,
      borderRadius: radius.full,
      fontSize: typography.bodySmall,
      fontWeight: typography.weightBold,
      marginBottom: spacing.md,
    },
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgLight }}>
      <SiteHeader />

      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>
            See It Live
          </h1>
          <p style={styles.heroSubtitle}>
            Interactive demo coming soon. For now, explore with sample data or request early access.
          </p>
        </div>
      </section>

      {/* DEMO PLACEHOLDER */}
      <section style={{...styles.section, background: colors.bgWhite}}>
        <div style={styles.sectionInner}>
          <div style={styles.demoBox}>
            <span style={styles.comingSoonBadge}>Coming Soon</span>
            <h2 style={{...styles.sectionTitle, marginTop: spacing.md}}>
              Interactive Product Tour
            </h2>
            <p style={styles.sectionLead}>
              We're building a clickable demo with realistic sample data showing the complete workflow: drift detection → recommendations → impact tracking.
            </p>
          </div>

          <h2 style={styles.sectionTitle}>What the Demo Will Show</h2>
          <p style={styles.sectionLead}>
            Experience the full journey from signal to proof.
          </p>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: spacing.lg, marginTop: spacing.xl}}>
            <div style={{padding: spacing.lg, background: colors.bgLight, borderRadius: radius.md, borderLeft: `4px solid ${colors.primary}`}}>
              <h3 style={{fontSize: typography.h3, fontWeight: typography.weightBold, color: colors.textPrimary, marginBottom: spacing.sm}}>
                1. Sample Dashboard
              </h3>
              <p style={{fontSize: typography.body, color: colors.textSecondary, lineHeight: typography.lineHeightRelaxed}}>
                See realistic team signals with fake but believable data. Explore drift indicators, capacity scores, and trend charts.
              </p>
            </div>

            <div style={{padding: spacing.lg, background: colors.bgLight, borderRadius: radius.md, borderLeft: `4px solid ${colors.warning}`}}>
              <h3 style={{fontSize: typography.h3, fontWeight: typography.weightBold, color: colors.textPrimary, marginBottom: spacing.sm}}>
                2. Alert Walkthrough
              </h3>
              <p style={{fontSize: typography.body, color: colors.textSecondary, lineHeight: typography.lineHeightRelaxed}}>
                Click through a real drift alert: what changed, why it triggered, confidence level, data coverage.
              </p>
            </div>

            <div style={{padding: spacing.lg, background: colors.bgLight, borderRadius: radius.md, borderLeft: `4px solid ${colors.success}`}}>
              <h3 style={{fontSize: typography.h3, fontWeight: typography.weightBold, color: colors.textPrimary, marginBottom: spacing.sm}}>
                3. Action → Proof Story
              </h3>
              <p style={{fontSize: typography.body, color: colors.textSecondary, lineHeight: typography.lineHeightRelaxed}}>
                "What we saw → What we recommended → What happened after." Complete before/after metrics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{...styles.section, textAlign:'center', background: colors.bgSubtle}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Want to Try It Now?</h2>
          <p style={styles.sectionLead}>
            Request early access to explore SignalTrue with your team's real data.
          </p>
          <div style={{display: 'flex', gap: spacing.md, justifyContent: 'center', flexWrap: 'wrap'}}>
            <ButtonUnified as={Link} to="/register" variant="primary" size="lg">
              Request Early Access
            </ButtonUnified>
            <ButtonUnified as={Link} to="/product" variant="secondary" size="lg">
              See How It Works
            </ButtonUnified>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default Demo;
