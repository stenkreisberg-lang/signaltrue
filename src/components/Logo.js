import React from 'react';
import { Link } from 'react-router-dom';
import { colors, typography, spacing } from '../styles/designSystem';

const Logo = ({ size = 32 }) => {
  const styles = {
    logoLink: {
      display: 'flex',
      alignItems: 'center',
      textDecoration: 'none',
      gap: spacing.sm,
    },
    logoText: {
      color: colors.textPrimary,
      fontSize: typography.h3,
      fontWeight: typography.weightBold,
      fontFamily: typography.sans,
    },
  };

  return (
    <Link to="/" style={styles.logoLink}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="6" fill={colors.primary}/>
        <path d="M16 8L22 12V20L16 24L10 20V12L16 8Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="16" cy="16" r="3" fill="white"/>
      </svg>
      <span style={styles.logoText}>SignalTrue</span>
    </Link>
  );
};

export default Logo;
