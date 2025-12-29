import React from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import Button from '../components/Button';
import { colors, typography, spacing, radius, shadows } from '../styles/tokens';

function About() {
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
      margin: `0 auto`,
      maxWidth: '700px',
    },
    
    // Section styles
    section: {
      padding: `${spacing['3xl']} ${spacing.xl}`,
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
      marginBottom: spacing.lg,
      lineHeight: typography.lineHeightTight,
    },
    
    // Philosophy section
    philosophyText: {
      fontSize: typography.bodyLarge,
      color: colors.textSecondary,
      lineHeight: typography.lineHeightRelaxed,
      maxWidth: '700px',
      margin: `0 auto ${spacing.lg}`,
    },
    emphasisText: {
      fontSize: typography.h3,
      fontWeight: typography.weightBold,
      color: colors.textPrimary,
      lineHeight: typography.lineHeightNormal,
      maxWidth: '700px',
      margin: `${spacing['2xl']} auto`,
      textAlign: 'center',
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
    cardTitle: {
      fontSize: typography.h3,
      fontWeight: typography.weightBold,
      color: colors.primary,
      marginBottom: spacing.sm,
    },
    cardDesc: {
      fontSize: typography.body,
      color: colors.textSecondary,
      lineHeight: typography.lineHeightRelaxed,
    },
    
    // Safeguards section
    safeguardItem: {
      background: colors.bgSubtle,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    safeguardTitle: {
      fontSize: typography.h3,
      fontWeight: typography.weightBold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
      display: 'flex',
      alignItems: 'center',
      gap: spacing.sm,
    },
    safeguardIcon: {
      fontSize: '1.5rem',
    },
    safeguardDesc: {
      fontSize: typography.body,
      color: colors.textSecondary,
      lineHeight: typography.lineHeightRelaxed,
    },
    
    // "Not For" section
    notForSection: {
      background: colors.surface,
      border: `3px solid ${colors.warning}`,
      borderRadius: radius.lg,
      padding: spacing['2xl'],
      maxWidth: '800px',
      margin: `${spacing['2xl']} auto 0`,
    },
    notForTitle: {
      fontSize: typography.h2,
      fontWeight: typography.weightBold,
      color: colors.warning,
      marginBottom: spacing.lg,
      textAlign: 'center',
    },
    notForList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    notForItem: {
      padding: `${spacing.md} 0`,
      fontSize: typography.body,
      color: colors.textPrimary,
      lineHeight: typography.lineHeightNormal,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    notForIcon: {
      color: colors.warning,
      fontWeight: typography.weightBold,
      fontSize: '1.25rem',
      flexShrink: 0,
    },
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgLight }}>
      <SiteHeader theme="light" />

      {/* SPECIFICATION REQUIREMENT: Philosophy First */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>
            Why SignalTrue exists
          </h1>
          <p style={styles.heroSubtitle}>
            We watched talented people burn out. Not because leaders didn't care — but because the warning signs came too late.
          </p>
        </div>
      </section>

      {/* Philosophy Section */}
      <section style={{...styles.section, background: colors.bgLight}}>
        <div style={styles.sectionInner}>
          <div style={{maxWidth: '700px', margin: '0 auto'}}>
            <p style={styles.philosophyText}>
              Surveys were slow. Dashboards were backward-looking. Monitoring tools destroyed trust.
            </p>
            <p style={styles.philosophyText}>
              So we built something different.
            </p>
            
            <p style={styles.emphasisText}>
              The data to prevent burnout already exists. It's hidden in how teams collaborate over time.
            </p>
            
            <p style={styles.philosophyText}>
              Not in what people say in surveys. Not in individual productivity scores. But in patterns: How response times drift. How meeting load creeps. How after-hours work becomes the norm.
            </p>
            
            <p style={{...styles.philosophyText, fontStyle: 'italic', marginTop: spacing['2xl']}}>
              SignalTrue detects early behavioral signals that predict burnout, overload, and execution breakdown before leaders feel the impact.
            </p>
          </div>
        </div>
      </section>

      {/* What We Refuse to Solve - SPECIFICATION REQUIREMENT */}
      <section style={{...styles.section, background: colors.bgSubtle}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>What We Refuse to Solve</h2>
          <p style={{
            fontSize: typography.bodyLarge,
            color: colors.textSecondary,
            textAlign: 'center',
            maxWidth: '700px',
            margin: `0 auto ${spacing['2xl']}`,
            lineHeight: typography.lineHeightRelaxed,
          }}>
            SignalTrue is not surveillance. We deliberately exclude capabilities that would undermine trust.
          </p>
          
          <div style={styles.grid2}>
            <div style={{...styles.card, borderLeft: `4px solid ${colors.error}`}}>
              <h3 style={{...styles.cardTitle, color: colors.error}}>❌ Individual Performance Tracking</h3>
              <p style={styles.cardDesc}>
                We will never show you which employee sent the most messages, worked the longest hours, or had the fastest response times. This creates toxic comparison dynamics.
              </p>
            </div>

            <div style={{...styles.card, borderLeft: `4px solid ${colors.error}`}}>
              <h3 style={{...styles.cardTitle, color: colors.error}}>❌ Content Surveillance</h3>
              <p style={styles.cardDesc}>
                We will never read message text, email bodies, or document content. We only access timestamps, thread lengths, and meeting durations — metadata, not meaning.
              </p>
            </div>

            <div style={{...styles.card, borderLeft: `4px solid ${colors.error}`}}>
              <h3 style={{...styles.cardTitle, color: colors.error}}>❌ Productivity Scoring</h3>
              <p style={styles.cardDesc}>
                We will never assign scores to individuals or rank team members. Output is a terrible proxy for health, and rankings destroy psychological safety.
              </p>
            </div>

            <div style={{...styles.card, borderLeft: `4px solid ${colors.error}`}}>
              <h3 style={{...styles.cardTitle, color: colors.error}}>❌ Automated Interventions</h3>
              <p style={styles.cardDesc}>
                We will never automatically send warnings, reassign work, or trigger HR processes. Humans must decide when and how to act on signals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SPECIFICATION REQUIREMENT: Trust & Safeguards */}
      <section style={{...styles.section, background: colors.bgLight}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Trust & Technical Safeguards</h2>
          <p style={{
            fontSize: typography.bodyLarge,
            color: colors.textSecondary,
            textAlign: 'center',
            maxWidth: '700px',
            margin: `0 auto ${spacing['2xl']}`,
            lineHeight: typography.lineHeightRelaxed,
          }}>
            Privacy isn't just policy — it's enforced by architecture.
          </p>
          
          <div style={{maxWidth: '800px', margin: '0 auto'}}>
            <div style={styles.safeguardItem}>
              <h3 style={styles.safeguardTitle}>
                <span style={styles.safeguardIcon}>🔒</span>
                Aggregation Logic
              </h3>
              <p style={styles.safeguardDesc}>
                All metrics require minimum 5 people per team. Smaller teams cannot be monitored. Individual contributions are mathematically obscured in team-level aggregates.
              </p>
            </div>

            <div style={styles.safeguardItem}>
              <h3 style={styles.safeguardTitle}>
                <span style={styles.safeguardIcon}>✓</span>
                GDPR Alignment
              </h3>
              <p style={styles.safeguardDesc}>
                Data minimization: we only collect metadata needed for health signals. Purpose limitation: data is never used for performance evaluation. Right to erasure: auto-delete after retention period (30–90 days, configurable).
              </p>
            </div>

            <div style={styles.safeguardItem}>
              <h3 style={styles.safeguardTitle}>
                <span style={styles.safeguardIcon}>🔐</span>
                OAuth & Encryption
              </h3>
              <p style={styles.safeguardDesc}>
                We never ask for passwords. All integrations use OAuth 2.0 with minimal scopes (metadata read-only). Data encrypted at rest (AES-256) and in transit (TLS 1.3).
              </p>
            </div>

            <div style={styles.safeguardItem}>
              <h3 style={styles.safeguardTitle}>
                <span style={styles.safeguardIcon}>🌍</span>
                Regional Data Residency
              </h3>
              <p style={styles.safeguardDesc}>
                Enterprise plans support EU or US data residency. Data never crosses regions. SOC 2 Type II compliance in progress.
              </p>
            </div>

            <div style={styles.safeguardItem}>
              <h3 style={styles.safeguardTitle}>
                <span style={styles.safeguardIcon}>⏰</span>
                Automatic Deletion
              </h3>
              <p style={styles.safeguardDesc}>
                Metadata is auto-deleted after retention period (30/90 days standard, up to 2 years for Enterprise with explicit consent). No indefinite storage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SPECIFICATION REQUIREMENT: Who It's Not For */}
      <section style={{...styles.section, background: colors.bgSubtle}}>
        <div style={styles.sectionInner}>
          <div style={styles.notForSection}>
            <h2 style={styles.notForTitle}>Who SignalTrue Is NOT For</h2>
            <p style={{
              fontSize: typography.body,
              color: colors.textSecondary,
              textAlign: 'center',
              marginBottom: spacing.lg,
            }}>
              We believe in clarity about fit. If your goal is any of the following, SignalTrue is the wrong tool.
            </p>
            <ul style={styles.notForList}>
              <li style={styles.notForItem}>
                <span style={styles.notForIcon}>⚠</span>
                <div>
                  <strong>Micromanagement:</strong> If you want to track who's online, monitor individual work hours, or measure personal productivity, use time-tracking software instead.
                </div>
              </li>
              <li style={styles.notForItem}>
                <span style={styles.notForIcon}>⚠</span>
                <div>
                  <strong>Performance Rankings:</strong> If you want to rank employees by output or identify "low performers," use performance management software instead.
                </div>
              </li>
              <li style={styles.notForItem}>
                <span style={styles.notForIcon}>⚠</span>
                <div>
                  <strong>Content Monitoring:</strong> If you want to read employee messages, emails, or documents, use compliance/eDiscovery tools instead.
                </div>
              </li>
              <li style={styles.notForItem}>
                <span style={styles.notForIcon}>⚠</span>
                <div>
                  <strong>Automated Enforcement:</strong> If you want software to automatically reassign work, block after-hours access, or send warnings, use workforce automation tools instead.
                </div>
              </li>
              <li style={{...styles.notForItem, borderBottom: 'none'}}>
                <span style={styles.notForIcon}>⚠</span>
                <div>
                  <strong>Individual Attribution:</strong> If your culture requires knowing "who did what," SignalTrue won't give you that data. We only show team-level patterns.
                </div>
              </li>
            </ul>
          </div>
          
          <p style={{
            fontSize: typography.body,
            color: colors.textSecondary,
            textAlign: 'center',
            maxWidth: '600px',
            margin: `${spacing['2xl']} auto 0`,
            fontStyle: 'italic',
          }}>
            SignalTrue is for leaders who trust their teams and want early warning systems — not surveillance infrastructure.
          </p>
        </div>
      </section>

      {/* Principles */}
      <section style={{...styles.section, background: colors.bgLight}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Our Principles</h2>
          <div style={styles.grid2}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Trust over surveillance</h3>
              <p style={styles.cardDesc}>
                We never show individual data. We build for leaders who want to support their teams, not spy on them.
              </p>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Teams over individuals</h3>
              <p style={styles.cardDesc}>
                Work happens in groups. We measure the friction and flow of the team unit, not the person.
              </p>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Context over raw metrics</h3>
              <p style={styles.cardDesc}>
                A number without context is dangerous. We always explain what changed and why it might matter.
              </p>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Judgment over automation</h3>
              <p style={styles.cardDesc}>
                We provide signals and guidance, but we trust human leaders to make the final call on when and how to act.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{...styles.section, textAlign:'center', background:colors.bgSubtle}}>
        <div style={styles.sectionInner}>
          <h2 style={{
            fontSize: typography.h2,
            fontWeight: typography.weightBold,
            color: colors.textPrimary,
            marginBottom: spacing.md,
          }}>
            Detect organizational drift before it becomes damage.
          </h2>
          <p style={{
            fontSize: typography.bodyLarge,
            color: colors.textSecondary,
            maxWidth: '600px',
            margin: `0 auto ${spacing.xl}`,
          }}>
            Start with a free baseline calibration.
          </p>
          <div style={{
            display: 'flex',
            gap: spacing.md,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <Button as={Link} to="/register" variant="primary">
              Request early access
            </Button>
            <Button as={Link} to="/product" variant="secondary">
              See how it works
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default About;
