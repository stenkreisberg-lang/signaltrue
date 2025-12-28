import React from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import Button from '../components/Button';
import { colors, typography, spacing, radius, shadows } from '../styles/tokens';

function Pricing() {
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
    
    // Pricing grid
    pricingGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: spacing.xl,
      marginTop: spacing['2xl'],
    },
    
    // Pricing cards
    pricingCard: {
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      padding: spacing['2xl'],
      position: 'relative',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    pricingCardFeatured: {
      background: colors.surface,
      border: `3px solid ${colors.primary}`,
      borderRadius: radius.lg,
      padding: spacing['2xl'],
      position: 'relative',
      boxShadow: shadows.lg,
      transform: 'scale(1.05)',
    },
    planBadge: {
      fontSize: typography.bodySmall,
      fontWeight: typography.weightBold,
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: spacing.sm,
    },
    planName: {
      fontSize: typography.h2,
      fontWeight: typography.weightBold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    planSubtitle: {
      fontSize: typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    priceSection: {
      marginBottom: spacing.xl,
      paddingBottom: spacing.lg,
      borderBottom: `1px solid ${colors.border}`,
    },
    priceAmount: {
      fontSize: '2.5rem',
      fontWeight: typography.weightBold,
      color: colors.textPrimary,
    },
    pricePeriod: {
      fontSize: typography.body,
      color: colors.textMuted,
    },
    featureList: {
      listStyle: 'none',
      padding: 0,
      margin: `0 0 ${spacing.xl}`,
    },
    featureItem: {
      padding: `${spacing.sm} 0`,
      color: colors.textSecondary,
      fontSize: typography.body,
      lineHeight: typography.lineHeightNormal,
      display: 'flex',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    featureIcon: {
      color: colors.primary,
      fontWeight: typography.weightBold,
      flexShrink: 0,
    },
    
    // Privacy callout
    privacyCallout: {
      background: colors.bgSubtle,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginTop: spacing.sm,
      fontSize: typography.bodySmall,
      color: colors.textSecondary,
      lineHeight: typography.lineHeightNormal,
    },
    privacyLabel: {
      fontWeight: typography.weightBold,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
      display: 'block',
    },
    
    // FAQ section
    faqSection: {
      maxWidth: '800px',
      margin: `${spacing['3xl']} auto 0`,
    },
    faqItem: {
      marginBottom: spacing.xl,
      paddingBottom: spacing.xl,
      borderBottom: `1px solid ${colors.border}`,
    },
    faqQuestion: {
      fontSize: typography.h3,
      fontWeight: typography.weightBold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    faqAnswer: {
      fontSize: typography.body,
      color: colors.textSecondary,
      lineHeight: typography.lineHeightRelaxed,
    },
  };

  const tiers = [
    {
      id: 'detection',
      name: 'Detection',
      subtitle: 'Early warning for small teams',
      price: '€99',
      period: '/month',
      badge: 'Most Popular',
      features: [
        {
          text: 'Drift detection for up to 3 teams',
          privacy: 'Team-level aggregation (min 5 people/team)',
        },
        {
          text: 'Weekly health summaries',
          privacy: 'No individual metrics',
        },
        {
          text: 'Slack + Calendar integration',
          privacy: 'OAuth access only, metadata only',
        },
        {
          text: 'Signal explanations',
          privacy: 'What changed, not who',
        },
        {
          text: '30-day data retention',
          privacy: 'Auto-delete after 30 days',
        },
      ],
      cta: 'Start 7-day baseline',
    },
    {
      id: 'impact-proof',
      name: 'Impact Proof',
      subtitle: 'For growing organizations',
      price: '€199',
      period: '/month',
      featured: true,
      features: [
        {
          text: 'Everything in Detection',
          privacy: null,
        },
        {
          text: 'Drift detection for up to 10 teams',
          privacy: 'Minimum 5 people per team enforced',
        },
        {
          text: 'Baseline comparison over time',
          privacy: 'Aggregated trends only',
        },
        {
          text: 'Recommended action library',
          privacy: 'Team-level guidance',
        },
        {
          text: 'Jira + Linear integration',
          privacy: 'Task metadata only',
        },
        {
          text: '90-day data retention',
          privacy: 'Configurable auto-delete',
        },
        {
          text: 'Priority support',
          privacy: null,
        },
      ],
      cta: 'Start 14-day baseline',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      subtitle: 'Custom deployment & compliance',
      price: 'Custom',
      period: '',
      features: [
        {
          text: 'Everything in Impact Proof',
          privacy: null,
        },
        {
          text: 'Unlimited teams',
          privacy: 'Custom aggregation thresholds',
        },
        {
          text: 'Regional data residency (EU/US)',
          privacy: 'GDPR + SOC2 compliance',
        },
        {
          text: 'SSO & advanced permissions',
          privacy: 'Role-based access control',
        },
        {
          text: 'Custom retention periods',
          privacy: 'Up to 2 years, encrypted at rest',
        },
        {
          text: 'Dedicated success manager',
          privacy: null,
        },
        {
          text: 'API access for BI tools',
          privacy: 'Aggregated exports only',
        },
      ],
      cta: 'Contact sales',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: colors.bgLight }}>
      <SiteHeader theme="light" />

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>
            Pricing
          </h1>
          <p style={styles.heroSubtitle}>
            You don't pay for data. You pay for avoiding slow organizational decay.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section style={{...styles.section, background: colors.bgLight}}>
        <div style={styles.sectionInner}>
          <div style={styles.pricingGrid}>
            {tiers.map((tier) => (
              <div
                key={tier.id}
                style={tier.featured ? styles.pricingCardFeatured : styles.pricingCard}
              >
                {tier.badge && (
                  <div style={{
                    ...styles.planBadge,
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: colors.primary,
                    color: colors.textInverse,
                    padding: `${spacing.xs} ${spacing.md}`,
                    borderRadius: radius.full,
                    fontSize: typography.bodySmall,
                  }}>
                    {tier.badge}
                  </div>
                )}
                
                <div style={styles.planBadge}>{tier.id.toUpperCase()}</div>
                <h2 style={styles.planName}>{tier.name}</h2>
                <p style={styles.planSubtitle}>{tier.subtitle}</p>
                
                <div style={styles.priceSection}>
                  <span style={styles.priceAmount}>{tier.price}</span>
                  <span style={styles.pricePeriod}>{tier.period}</span>
                </div>
                
                <ul style={styles.featureList}>
                  {tier.features.map((feature, idx) => (
                    <li key={idx} style={styles.featureItem}>
                      <span style={styles.featureIcon}>✓</span>
                      <div>
                        <div style={{color: colors.textPrimary}}>
                          {feature.text}
                        </div>
                        {feature.privacy && (
                          <div style={{
                            fontSize: typography.bodySmall,
                            color: colors.textMuted,
                            marginTop: spacing.xs,
                            fontStyle: 'italic',
                          }}>
                            {feature.privacy}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                
                <Button
                  as={Link}
                  to={tier.id === 'enterprise' ? '/contact' : '/register'}
                  variant={tier.featured ? 'primary' : 'secondary'}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {tier.cta}
                </Button>
                
                {/* SPECIFICATION REQUIREMENT: Privacy callout per tier */}
                <div style={styles.privacyCallout}>
                  <span style={styles.privacyLabel}>Privacy guarantee:</span>
                  All plans enforce team-level aggregation only. No individual dashboards. No message content access. GDPR-compliant by design.
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{...styles.section, background: colors.bgSubtle}}>
        <div style={styles.sectionInner}>
          <h2 style={{
            fontSize: typography.h2,
            fontWeight: typography.weightBold,
            color: colors.textPrimary,
            textAlign: 'center',
            marginBottom: spacing['2xl'],
          }}>
            Frequently Asked Questions
          </h2>
          
          <div style={styles.faqSection}>
            <div style={styles.faqItem}>
              <h3 style={styles.faqQuestion}>What happens during the baseline period?</h3>
              <p style={styles.faqAnswer}>
                SignalTrue observes your team's normal collaboration patterns for 7–14 days without generating signals. This creates a unique baseline for your team. You're not charged during this period.
              </p>
            </div>

            <div style={styles.faqItem}>
              <h3 style={styles.faqQuestion}>What data do you collect?</h3>
              <p style={styles.faqAnswer}>
                We collect only metadata: timestamps, thread lengths, meeting durations, response times, after-hours activity patterns. We never access message content, email bodies, or document text. All data is aggregated at team level (minimum 5 people per team).
              </p>
            </div>

            <div style={styles.faqItem}>
              <h3 style={styles.faqQuestion}>Can I see individual employee data?</h3>
              <p style={styles.faqAnswer}>
                No. SignalTrue does not provide individual metrics, dashboards, or performance scores. All signals are team-level only. This is enforced by design, not just policy.
              </p>
            </div>

            <div style={styles.faqItem}>
              <h3 style={styles.faqQuestion}>What is the minimum team size?</h3>
              <p style={styles.faqAnswer}>
                5 people minimum per team to ensure aggregation prevents individual identification. Smaller teams cannot be monitored.
              </p>
            </div>

            <div style={styles.faqItem}>
              <h3 style={styles.faqQuestion}>How is data retained?</h3>
              <p style={styles.faqAnswer}>
                Detection: 30 days. Impact Proof: 90 days (configurable). Enterprise: Custom (up to 2 years). All data is encrypted at rest and auto-deleted after retention period.
              </p>
            </div>

            <div style={styles.faqItem}>
              <h3 style={styles.faqQuestion}>Is SignalTrue GDPR compliant?</h3>
              <p style={styles.faqAnswer}>
                Yes. We enforce data minimization, purpose limitation, and privacy by design. EU data residency available on Enterprise plan. We never process personal data beyond what's necessary for team-level health signals.
              </p>
            </div>

            <div style={styles.faqItem}>
              <h3 style={styles.faqQuestion}>Can I get a discount?</h3>
              <p style={styles.faqAnswer}>
                Nonprofits and educational institutions: 50% off Detection or Impact Proof. Contact <a href="mailto:sales@signaltrue.ai" style={{color: colors.primary, textDecoration: 'none'}}>sales@signaltrue.ai</a> for eligibility.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{...styles.section, textAlign:'center', background:colors.bgLight}}>
        <div style={styles.sectionInner}>
          <h2 style={{
            fontSize: typography.h2,
            fontWeight: typography.weightBold,
            color: colors.textPrimary,
            marginBottom: spacing.md,
          }}>
            Ready to detect drift early?
          </h2>
          <p style={{
            fontSize: typography.bodyLarge,
            color: colors.textSecondary,
            maxWidth: '600px',
            margin: `0 auto ${spacing.xl}`,
          }}>
            Start with a free baseline calibration. No credit card required.
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
            <Button as={Link} to="/contact" variant="secondary">
              Talk to sales
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default Pricing;
