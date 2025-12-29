/**
 * Button Component - Unified Design System
 * CRITICAL: This component replaces ALL button/CTA styles across the site
 * 
 * Usage:
 * <Button variant="primary">Click me</Button>
 * <Button variant="secondary" size="lg">Learn more</Button>
 * <Button as={Link} to="/pricing">Get started</Button>
 * 
 * RULES:
 * - Same colors on all pages
 * - CTA must NEVER change color based on route
 * - Active route styles apply ONLY to navigation links, not buttons
 */

import React from 'react';
import { spacing, typography, colors, radius } from '../styles/designSystem';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  as: Component = 'button',
  ...props 
}) => {
  // Base styles (always applied)
  const baseStyles = {
    fontFamily: typography.sans,
    fontWeight: typography.weightSemibold,
    lineHeight: '1',
    borderRadius: radius.md,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    opacity: disabled ? 0.6 : 1,
    pointerEvents: disabled ? 'none' : 'auto'
  };
  
  // Variant styles
  const variantStyles = {
    primary: {
      backgroundColor: colors.primary,
      color: colors.white,
      ':hover': {
        backgroundColor: colors.primaryHover
      }
    },
    secondary: {
      backgroundColor: colors.white,
      color: colors.primary,
      border: `2px solid ${colors.primary}`,
      ':hover': {
        backgroundColor: colors.gray50
      }
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.textPrimary,
      ':hover': {
        backgroundColor: colors.gray100
      }
    },
    inverse: {
      backgroundColor: colors.white,
      color: colors.primary,
      ':hover': {
        backgroundColor: colors.gray100
      }
    }
  };
  
  // Size styles
  const sizeStyles = {
    sm: {
      fontSize: typography.bodySmall,
      padding: `${spacing.sm} ${spacing.base}`
    },
    md: {
      fontSize: typography.body,
      padding: `${spacing.md} ${spacing.lg}`
    },
    lg: {
      fontSize: typography.bodyLarge,
      padding: `${spacing.base} ${spacing.xl}`
    }
  };
  
  // Merge styles
  const buttonStyle = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant]
  };
  
  // Handle hover state inline (prevents route-based style pollution)
  const [isHovered, setIsHovered] = React.useState(false);
  
  const finalStyle = {
    ...buttonStyle,
    ...(isHovered && !disabled && variantStyles[variant][':hover'])
  };
  
  return (
    <Component
      style={finalStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Button;
