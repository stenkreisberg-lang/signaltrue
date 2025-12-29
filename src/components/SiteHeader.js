import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { spacing, typography, colors } from '../styles/designSystem';
import ButtonUnified from './ButtonUnified';

/**
 * Shared Site Header Component - UNIFIED DESIGN SYSTEM
 * 
 * MANDATORY RULES:
 * - Same logo asset, size, padding on ALL pages
 * - Same navigation order everywhere
 * - Same primary CTA everywhere
 * - Active route styles ONLY on nav links, NEVER on buttons
 * - No per-page variations allowed
 */

function SiteHeader({ theme = 'dark' }) {
  const location = useLocation();
  
  const isDark = theme === 'dark';
  
  const styles = {
    nav: {
      backgroundColor: isDark ? colors.bgDark : colors.white,
      borderBottom: isDark ? 'none' : `1px solid ${colors.gray200}`,
      padding: `${spacing.base} ${spacing.lg}`,
      position: 'sticky',
      top: 0,
      zIndex: 1000,
    },
    navContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      maxWidth: spacing.containerMaxWidth,
      margin: '0 auto',
      paddingLeft: spacing.containerPaddingDesktop,
      paddingRight: spacing.containerPaddingDesktop,
    },
    logoLink: {
      display: 'flex',
      alignItems: 'center',
      textDecoration: 'none',
      gap: spacing.sm,
    },
    logoText: {
      color: isDark ? colors.textInverse : colors.textPrimary,
      fontSize: typography.h3,
      fontWeight: typography.weightBold,
      fontFamily: typography.sans,
    },
    navLinks: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing.xl,
    },
    navLink: (isActive) => ({
      color: isDark ? colors.textInverseSecondary : colors.textSecondary,
      textDecoration: 'none',
      fontSize: typography.body,
      fontWeight: typography.weightMedium,
      fontFamily: typography.sans,
      padding: `${spacing.sm} 0`,
      borderBottom: isActive ? `2px solid ${isDark ? colors.white : colors.primary}` : '2px solid transparent',
      transition: 'all 200ms ease',
    }),
    navLinkHover: {
      color: isDark ? colors.textInverse : colors.textPrimary,
    },
  };
  
  const [hoveredLink, setHoveredLink] = React.useState(null);
  
  const NavLink = ({ to, children }) => {
    const isActive = location.pathname === to;
    const isHovered = hoveredLink === to;
    
    return (
      <Link
        to={to}
        style={{
          ...styles.navLink(isActive),
          ...(isHovered ? styles.navLinkHover : {}),
        }}
        onMouseEnter={() => setHoveredLink(to)}
        onMouseLeave={() => setHoveredLink(null)}
      >
        {children}
      </Link>
    );
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.navContent}>
        <Link to="/" style={styles.logoLink}>
          {/* MANDATORY: Same logo SVG on ALL pages - exact same size */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="6" fill={colors.primary}/>
            <path d="M16 8L22 12V20L16 24L10 20V12L16 8Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="16" cy="16" r="3" fill="white"/>
          </svg>
          <span style={styles.logoText}>SignalTrue</span>
        </Link>
        
        <div style={styles.navLinks}>
          {/* MANDATORY: Same navigation order on ALL pages */}
          <NavLink to="/product">Product</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          
          {/* CRITICAL: CTA buttons use ButtonUnified - NEVER inherits active state */}
          <ButtonUnified
            as={Link}
            to="/login"
            variant="ghost"
            size="md"
          >
            Login
          </ButtonUnified>
          
          <ButtonUnified
            as={Link}
            to="/register"
            variant="primary"
            size="md"
          >
            Get Started
          </ButtonUnified>
        </div>
      </div>
    </nav>
  );
}

export default SiteHeader;
