import React from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import ButtonUnified from '../components/ButtonUnified';
import { spacing, typography, colors, radius } from '../styles/designSystem';

/**
 * TRUST PAGE - Addresses Kaidi's biggest hesitation
 * 
 * Must include: Data collection per integration, What NOT collected, Aggregation rules,
 * Data retention, GDPR basis, Security basics
 */

function Trust() {
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
    },
    sectionLead: {
      fontSize: typography.bodyLarge,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
      lineHeight: typography.lineHeightRelaxed,
    },
    
    dataTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: spacing.xl,
    },
    tableHeader: {
      background: colors.bgSubtle,
      fontWeight: typography.weightBold,
      fontSize: typography.body,
      color: colors.textPrimary,
      padding: spacing.md,
      textAlign: 'left',
      borderBottom: `2px solid ${colors.border}`,
    },
    tableCell: {
      padding: spacing.md,
      fontSize: typography.body,
      color: colors.textSecondary,
      borderBottom: `1px solid ${colors.border}`,
      lineHeight: typography.lineHeightRelaxed,
    },
    
    notCollectedBox: {
      background: colors.bgSubtle,
      border: `3px solid ${colors.success}`,
      borderRadius: radius.lg,
      padding: spacing.xl,
      marginBottom: spacing.xl,
    },
    notCollectedTitle: {
      fontSize: typography.h3,
      fontWeight: typography.weightBold,
      color: colors.success,
      marginBottom: spacing.md,
    },
    notCollectedList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    notCollectedItem: {
      fontSize: typography.body,
      color: colors.textPrimary,
      padding: `${spacing.sm} 0`,
      display: 'flex',
      alignItems: 'center',
      gap: spacing.sm,
    },
    
    policyBox: {
      background: colors.bgWhite,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      padding: spacing.xl,
      marginBottom: spacing.lg,
    },
    policyTitle: {
      fontSize: typography.h3,
      fontWeight: typography.weightBold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    policyText: {
      fontSize: typography.body,
      color: colors.textSecondary,
      lineHeight: typography.lineHeightRelaxed,
      marginBottom: spacing.md,
    },
    
    highlightBox: {
      background: colors.bgSubtle,
      borderLeft: `4px solid ${colors.primary}`,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderRadius: radius.sm,
    },
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgLight }}>
      <SiteHeader />

      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>
            Trust and Privacy
          </h1>
          <p style={styles.heroSubtitle}>
            We measure work patterns, not private lives. Signals are aggregated and baseline-based. You can always see what triggered an alert.
          </p>
        </div>
      </section>

      {/* WHAT DATA IS COLLECTED */}
      <section style={{...styles.section, background: colors.bgWhite}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>What Data Is Collected</h2>
          <p style={styles.sectionLead}>
            SignalTrue only collects metadata to detect behavioral drift. No message content, no document content, no private communication.
          </p>

          <table style={styles.dataTable}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Integration</th>
                <th style={styles.tableHeader}>What We Collect</th>
                <th style={styles.tableHeader}>Why</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.tableCell}><strong>Slack</strong></td>
                <td style={styles.tableCell}>
                  Message timestamps, thread depth, channel activity, response latency, @mentions count, emoji reactions count
                </td>
                <td style={styles.tableCell}>
                  Detect communication fragmentation, response pattern changes, collaboration network shifts
                </td>
              </tr>
              <tr>
                <td style={styles.tableCell}><strong>Google Calendar</strong></td>
                <td style={styles.tableCell}>
                  Meeting duration, meeting frequency, attendee count, time blocks, after-hours events
                </td>
                <td style={styles.tableCell}>
                  Detect meeting overload, focus erosion, after-hours drift
                </td>
              </tr>
              <tr>
                <td style={styles.tableCell}><strong>Microsoft Teams</strong></td>
                <td style={styles.tableCell}>
                  Message timestamps, thread depth, channel activity, response latency, meeting metadata
                </td>
                <td style={styles.tableCell}>
                  Same as Slack + Google Calendar combined
                </td>
              </tr>
              <tr>
                <td style={styles.tableCell}><strong>Jira / Linear</strong></td>
                <td style={styles.tableCell}>
                  Task status changes, assignment patterns, cycle time, comment frequency
                </td>
                <td style={styles.tableCell}>
                  Detect execution capacity changes, workload distribution shifts
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* WHAT IS NOT COLLECTED */}
      <section style={{...styles.section, background: colors.bgLight}}>
        <div style={styles.sectionInner}>
          <div style={styles.notCollectedBox}>
            <h2 style={styles.notCollectedTitle}>✓ What We Do NOT Collect</h2>
            <ul style={styles.notCollectedList}>
              <li style={styles.notCollectedItem}>
                <span style={{fontSize: '1.5rem', color: colors.success}}>✗</span>
                <span><strong>No message content.</strong> We never read Slack messages, emails, or Teams chats.</span>
              </li>
              <li style={styles.notCollectedItem}>
                <span style={{fontSize: '1.5rem', color: colors.success}}>✗</span>
                <span><strong>No document content.</strong> We never access Google Docs, Notion, or file contents.</span>
              </li>
              <li style={styles.notCollectedItem}>
                <span style={{fontSize: '1.5rem', color: colors.success}}>✗</span>
                <span><strong>No screenshots or keystroke logging.</strong> This is not employee surveillance software.</span>
              </li>
              <li style={styles.notCollectedItem}>
                <span style={{fontSize: '1.5rem', color: colors.success}}>✗</span>
                <span><strong>No location tracking.</strong> We do not track where you work from.</span>
              </li>
              <li style={styles.notCollectedItem}>
                <span style={{fontSize: '1.5rem', color: colors.success}}>✗</span>
                <span><strong>No individual performance scores.</strong> No rankings, no "top performers" lists.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* AGGREGATION RULES */}
      <section style={{...styles.section, background: colors.bgWhite}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Aggregation Rules</h2>
          <p style={styles.sectionLead}>
            All signals are aggregated at team level by default. No individual dashboards.
          </p>

          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Team-Level Only (Default)</h3>
            <p style={styles.policyText}>
              Minimum team size: <strong>5 people</strong>. Signals are calculated across the entire team. No per-person metrics are ever shown.
            </p>
          </div>

          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Custom Thresholds (Enterprise)</h3>
            <p style={styles.policyText}>
              Organizations can set higher minimums (e.g., 8 or 10 people) for additional privacy. Smaller teams are not displayed.
            </p>
          </div>

          <div style={styles.highlightBox}>
            <p style={{fontSize: typography.body, color: colors.textPrimary, margin: 0}}>
              <strong>Example:</strong> If a team has 4 people, no signals are generated. If a team has 15 people, signals show team-level trends only.
            </p>
          </div>
        </div>
      </section>

      {/* DATA RETENTION */}
      <section style={{...styles.section, background: colors.bgSubtle}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Data Retention and Deletion</h2>
          
          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Detection Plan</h3>
            <p style={styles.policyText}>
              30 days retention. Data is automatically deleted after 30 days.
            </p>
          </div>

          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Impact Proof Plan</h3>
            <p style={styles.policyText}>
              90 days retention (configurable). Auto-delete after 90 days or your custom period.
            </p>
          </div>

          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Enterprise</h3>
            <p style={styles.policyText}>
              Custom retention periods (up to 2 years). Configurable auto-delete schedules.
            </p>
          </div>

          <div style={styles.highlightBox}>
            <p style={{fontSize: typography.body, color: colors.textPrimary, margin: 0}}>
              <strong>Data Export:</strong> You can export your data at any time. Deletion requests are processed within 48 hours.
            </p>
          </div>
        </div>
      </section>

      {/* GDPR AND COMPLIANCE */}
      <section style={{...styles.section, background: colors.bgWhite}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>GDPR and Compliance</h2>
          
          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Legal Basis</h3>
            <p style={styles.policyText}>
              <strong>Legitimate interest</strong> for organizational health monitoring. Team members can opt out of specific integrations. Data Processing Agreement (DPA) available for all customers.
            </p>
          </div>

          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Regional Data Residency (Enterprise)</h3>
            <p style={styles.policyText}>
              Choose EU or US data hosting. All data encrypted at rest and in transit. SOC2 Type II compliance in progress.
            </p>
          </div>

          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Employee Rights</h3>
            <p style={styles.policyText}>
              Right to access: See what data is collected about your team.<br />
              Right to deletion: Request removal of your team's data.<br />
              Right to object: Opt out of specific integrations while remaining part of the team.
            </p>
          </div>
        </div>
      </section>

      {/* SECURITY BASICS */}
      <section style={{...styles.section, background: colors.bgLight}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Security Basics</h2>
          
          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Encryption</h3>
            <p style={styles.policyText}>
              All data encrypted at rest (AES-256) and in transit (TLS 1.3). OAuth tokens stored encrypted.
            </p>
          </div>

          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Access Control</h3>
            <p style={styles.policyText}>
              Role-based access control (RBAC). Only authorized org admins can view signals. SSO available (Enterprise).
            </p>
          </div>

          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Audit Logs</h3>
            <p style={styles.policyText}>
              All data access logged. Audit trails available on request (Enterprise).
            </p>
          </div>

          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>OAuth-Only Access</h3>
            <p style={styles.policyText}>
              We never ask for passwords. All integrations use OAuth 2.0. You can revoke access at any time through your Slack/Google/Microsoft admin console.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{...styles.section, textAlign:'center', background: colors.bgWhite}}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Questions?</h2>
          <p style={{...styles.sectionLead, margin: `0 auto ${spacing.xl}`}}>
            Contact us about privacy, compliance, or custom data handling requirements.
          </p>
          <div style={{display: 'flex', gap: spacing.md, justifyContent: 'center', flexWrap: 'wrap'}}>
            <ButtonUnified as={Link} to="/contact" variant="primary" size="lg">
              Contact Us
            </ButtonUnified>
            <ButtonUnified as={Link} to="/demo" variant="secondary" size="lg">
              See Demo
            </ButtonUnified>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default Trust;
