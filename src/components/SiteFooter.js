import React from 'react';
import { Link } from 'react-router-dom';
import { spacing, typography, colors } from '../styles/designSystem';

/**
 * Site Footer Component - UNIFIED DESIGN SYSTEM
 *
 * MANDATORY RULES:
 * - Must include: Privacy, Terms, Contact, Security/Data usage link
 * - Visually identical across ALL pages
 * - No per-page variations allowed
 */

const styles = {
  footer: {
    background: colors.bgDark,
    color: colors.textInverse,
    padding: `${spacing['3xl']} ${spacing.lg} ${spacing.xl}`,
    marginTop: spacing['4xl'],
  },
  footerContent: {
    maxWidth: spacing.containerMaxWidth,
    margin: '0 auto',
    paddingLeft: spacing.containerPaddingDesktop,
    paddingRight: spacing.containerPaddingDesktop,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  footerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  footerHeading: {
    fontSize: typography.body,
    fontWeight: typography.weightSemibold,
    marginBottom: spacing.xs,
    color: colors.textInverse,
  },
  footerLink: {
    color: colors.textInverseSecondary,
    textDecoration: 'none',
    fontSize: typography.bodySmall,
    transition: 'color 0.2s ease',
  },
  footerLinkHover: {
    color: colors.textInverse,
  },
  footerBottom: {
    maxWidth: spacing.containerMaxWidth,
    margin: '0 auto',
    paddingLeft: spacing.containerPaddingDesktop,
    paddingRight: spacing.containerPaddingDesktop,
    paddingTop: spacing.xl,
    borderTop: `1px solid ${colors.gray700}`,
    textAlign: 'center',
    color: colors.textInverseSecondary,
    fontSize: typography.bodySmall,
  },
};

function FooterLink({ to, children, hoveredLink, setHoveredLink }) {
  return (
    <Link
      to={to}
      style={{
        ...styles.footerLink,
        ...(hoveredLink === to ? styles.footerLinkHover : {}),
      }}
      onMouseEnter={() => setHoveredLink(to)}
      onMouseLeave={() => setHoveredLink(null)}
    >
      {children}
    </Link>
  );
}

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const [hoveredLink, setHoveredLink] = React.useState(null);
  const linkProps = { hoveredLink, setHoveredLink };

  return (
    <footer style={styles.footer}>
      <div style={styles.footerContent}>
        <div style={styles.footerSection}>
          <h4 style={styles.footerHeading}>Product</h4>
          <FooterLink to="/product" {...linkProps}>
            Overview
          </FooterLink>
          <FooterLink to="/how-it-works" {...linkProps}>
            How It Works
          </FooterLink>
          <FooterLink to="/pricing" {...linkProps}>
            Pricing
          </FooterLink>
        </div>

        <div style={styles.footerSection}>
          <h4 style={styles.footerHeading}>Company</h4>
          <FooterLink to="/about" {...linkProps}>
            About
          </FooterLink>
          <FooterLink to="/contact" {...linkProps}>
            Contact
          </FooterLink>
        </div>

        <div style={styles.footerSection}>
          <h4 style={styles.footerHeading}>Legal & Privacy</h4>
          <FooterLink to="/terms" {...linkProps}>
            Terms of Service
          </FooterLink>
          <FooterLink to="/privacy" {...linkProps}>
            Privacy Policy
          </FooterLink>
          <FooterLink to="/app/privacy" {...linkProps}>
            Data Usage & Security
          </FooterLink>
        </div>
      </div>

      <div style={styles.footerBottom}>
        <p>© {year} SignalTrue. All rights reserved.</p>
      </div>
    </footer>
  );
}
