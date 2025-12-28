import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { colors, typography, spacing } from '../styles/tokens';
import Button from './Button';

/**
 * Shared Site Header Component
 * 
 * CRITICAL RULES:
 * - Same logo SVG across ALL pages
 * - Login is ALWAYS tertiary variant (never colored like CTA)
 * - Same layout and spacing everywhere
 * - Theme can be 'dark' or 'light' based on page background
 * - Active nav links get subtle underline indicator
 */

function SiteHeader({ theme = 'dark' }) {
  const location = useLocation();
  
  const isDark = theme === 'dark';
  
  const styles = {
    nav: {
      backgroundColor: isDark ? colors.bgDark : colors.bgLight,
      borderBottom: isDark ? 'none' : `1px solid ${colors.border}`,
      padding: `${spacing.md} ${spacing.xl}`,
    },
    navContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      maxWidth: spacing.containerMaxWidth,
      margin: '0 auto',
    },
    logoLink: {
      display: 'flex',
      alignItems: 'center',
      textDecoration: 'none',
    },
    logoText: {
      color: isDark ? colors.textInverse : colors.textPrimary,
      fontSize: typography.h3,
      fontWeight: typography.weightBold,
      fontFamily: typography.sans,
      marginLeft: spacing.sm,
    },
    navLinks: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing.lg,
    },
    navLink: (isActive) => ({
      color: isDark ? colors.textInverseSecondary : colors.textSecondary,
      textDecoration: 'none',
      fontSize: typography.body,
      fontWeight: typography.weightMedium,
      fontFamily: typography.sans,
      padding: `${spacing.xs} ${spacing.sm}`,
      borderBottom: isActive ? `2px solid ${isDark ? colors.textInverse : colors.primary}` : '2px solid transparent',
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
          {/* CRITICAL: Same logo SVG on ALL pages - no variations */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="6" fill={isDark ? colors.primary : colors.primary}/>
            <path d="M16 8L22 12V20L16 24L10 20V12L16 8Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="16" cy="16" r="3" fill="white"/>
          </svg>
          <span style={styles.logoText}>SignalTrue</span>
        </Link>
        
        <div style={styles.navLinks}>
          <NavLink to="/product">Product</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          
          {/* CRITICAL: Login must ALWAYS be tertiary variant */}
          <Button
            as={Link}
            to="/login"
            variant="tertiary"
            inverse={isDark}
          >
            Login
          </Button>
        </div>
      </div>
    </nav>
  );
}

export default SiteHeader;
