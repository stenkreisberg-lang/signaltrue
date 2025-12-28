import React from 'react';
import { colors, typography, spacing, radius, shadows, transitions } from '../styles/tokens';

/**
 * Button Component System
 * 
 * Variants:
 * - primary: Main conversion actions (Request access, Sign up)
 * - secondary: Secondary actions (Learn more, See sample)
 * - tertiary: Navigation actions (Login, plain text links)
 * 
 * RULES:
 * - Login must ALWAYS use variant="tertiary"
 * - Only ONE primary button per screen section
 * - No per-page color overrides allowed
 */

const baseStyles = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: typography.sans,
  fontSize: typography.body,
  fontWeight: typography.weightMedium,
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
  transition: transitions.normal,
  outline: 'none',
};

const variants = {
  primary: {
    default: {
      ...baseStyles,
      backgroundColor: colors.primary,
      color: colors.textInverse,
      padding: `${spacing.md} ${spacing.xl}`,
      borderRadius: radius.md,
      boxShadow: shadows.sm,
    },
    hover: {
      backgroundColor: colors.primaryHover,
      boxShadow: shadows.md,
      transform: 'translateY(-1px)',
    },
    active: {
      backgroundColor: colors.primaryActive,
      transform: 'translateY(0)',
    },
    focus: {
      boxShadow: `0 0 0 3px ${colors.focusRing}`,
    },
  },
  
  secondary: {
    default: {
      ...baseStyles,
      backgroundColor: 'transparent',
      color: colors.textPrimary,
      padding: `${spacing.md} ${spacing.xl}`,
      borderRadius: radius.md,
      border: `2px solid ${colors.border}`,
    },
    hover: {
      backgroundColor: colors.bgSubtle,
      borderColor: colors.secondary,
    },
    active: {
      backgroundColor: colors.border,
    },
    focus: {
      boxShadow: `0 0 0 3px ${colors.focusRing}`,
    },
  },
  
  tertiary: {
    default: {
      ...baseStyles,
      backgroundColor: 'transparent',
      color: colors.textSecondary,
      padding: `${spacing.sm} ${spacing.md}`,
      borderRadius: radius.sm,
    },
    hover: {
      color: colors.textPrimary,
      textDecoration: 'underline',
      textUnderlineOffset: '4px',
    },
    active: {
      color: colors.primary,
    },
    focus: {
      textDecoration: 'underline',
      textUnderlineOffset: '4px',
      color: colors.primary,
    },
  },
};

// Inverse variants for dark backgrounds
const inverseVariants = {
  primary: {
    default: {
      ...variants.primary.default,
      // Primary stays same on dark backgrounds
    },
  },
  secondary: {
    default: {
      ...variants.secondary.default,
      color: colors.textInverse,
      borderColor: colors.textInverseSecondary,
    },
    hover: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderColor: colors.textInverse,
    },
  },
  tertiary: {
    default: {
      ...variants.tertiary.default,
      color: colors.textInverseSecondary,
    },
    hover: {
      color: colors.textInverse,
      textDecoration: 'underline',
      textUnderlineOffset: '4px',
    },
  },
};

function Button({ 
  children, 
  variant = 'primary', 
  inverse = false,
  as = 'button',
  className = '',
  style = {},
  ...props 
}) {
  const Component = as;
  const variantSet = inverse ? inverseVariants : variants;
  const defaultStyle = variantSet[variant]?.default || variants.primary.default;
  
  const [isHover, setIsHover] = React.useState(false);
  const [isActive, setIsActive] = React.useState(false);
  const [isFocus, setIsFocus] = React.useState(false);
  
  // Combine styles based on state
  let combinedStyle = { ...defaultStyle, ...style };
  
  if (isHover && variantSet[variant]?.hover) {
    combinedStyle = { ...combinedStyle, ...variantSet[variant].hover };
  }
  if (isActive && variantSet[variant]?.active) {
    combinedStyle = { ...combinedStyle, ...variantSet[variant].active };
  }
  if (isFocus && variantSet[variant]?.focus) {
    combinedStyle = { ...combinedStyle, ...variantSet[variant].focus };
  }
  
  return (
    <Component
      className={className}
      style={combinedStyle}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => { setIsHover(false); setIsActive(false); }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onFocus={() => setIsFocus(true)}
      onBlur={() => setIsFocus(false)}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Button;
