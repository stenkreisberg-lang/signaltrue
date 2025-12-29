/**
 * SignalTrue Design System
 * Single source of truth for spacing, typography, colors, and layout
 * MANDATORY: Use these values everywhere. No custom spacing/sizes.
 */

export const spacing = {
  // Only use these spacing values (no arbitrary margins/padding)
  xs: '4px',
  sm: '8px',
  md: '12px',
  base: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '96px',
  
  // Container constraints
  containerMaxWidth: '1200px',
  containerPaddingDesktop: '24px',
  containerPaddingMobile: '16px',
  
  // Section padding (vertical rhythm)
  sectionPaddingDesktop: '64px',
  sectionPaddingTablet: '48px',
  sectionPaddingMobile: '32px',
  
  // Hero specific
  heroPaddingTopDesktop: '96px',
  heroPaddingTopMobile: '48px'
};

export const typography = {
  // Font families
  sans: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
  mono: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
  
  // Font sizes (semantic naming)
  hero: '56px',          // H1 - page hero only
  heroMobile: '36px',
  h2: '40px',            // H2 - section titles only
  h2Mobile: '28px',
  h3: '28px',            // H3 - cards or subsections
  h3Mobile: '22px',
  bodyLarge: '20px',     // Subheadings
  body: '16px',          // Body text
  bodySmall: '14px',     // Secondary text
  
  // Font weights
  weightNormal: 400,
  weightMedium: 500,
  weightSemibold: 600,
  weightBold: 700,
  
  // Line heights (increased for readability)
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.7,
  
  // Max width for text blocks (60-75 characters)
  maxWidthParagraph: '65ch',
  maxWidthHeadline: '20ch'
};

export const colors = {
  // Primary palette
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryActive: '#1e40af',
  
  // Neutral palette
  white: '#ffffff',
  black: '#000000',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  
  // Semantic colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Background alternation (creates visual rhythm)
  bgWhite: '#ffffff',
  bgLight: '#f9fafb',
  bgSubtle: '#f3f4f6',
  
  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textInverse: '#ffffff',
  textInverseSecondary: 'rgba(255,255,255,0.8)',
  
  // Dark mode
  bgDark: '#1f2937',
  bgDarkAlt: '#111827'
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  none: 'none'
};

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px'
};

export const breakpoints = {
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px'
};

/**
 * Layout Components (reusable styles)
 */
export const layout = {
  // Container (max width, centered, padding)
  container: {
    maxWidth: spacing.containerMaxWidth,
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: spacing.containerPaddingDesktop,
    paddingRight: spacing.containerPaddingDesktop,
    [`@media (max-width: ${breakpoints.mobile})`]: {
      paddingLeft: spacing.containerPaddingMobile,
      paddingRight: spacing.containerPaddingMobile
    }
  },
  
  // Section (vertical padding)
  section: {
    paddingTop: spacing.sectionPaddingDesktop,
    paddingBottom: spacing.sectionPaddingDesktop,
    [`@media (max-width: ${breakpoints.tablet})`]: {
      paddingTop: spacing.sectionPaddingTablet,
      paddingBottom: spacing.sectionPaddingTablet
    },
    [`@media (max-width: ${breakpoints.mobile})`]: {
      paddingTop: spacing.sectionPaddingMobile,
      paddingBottom: spacing.sectionPaddingMobile
    }
  },
  
  // Hero section
  hero: {
    paddingTop: spacing.heroPaddingTopDesktop,
    paddingBottom: spacing.sectionPaddingDesktop,
    [`@media (max-width: ${breakpoints.mobile})`]: {
      paddingTop: spacing.heroPaddingTopMobile,
      paddingBottom: spacing.sectionPaddingMobile
    }
  },
  
  // Two column layout (hero, features)
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing['2xl'],
    alignItems: 'center',
    [`@media (max-width: ${breakpoints.tablet})`]: {
      gridTemplateColumns: '1fr',
      gap: spacing.xl
    }
  },
  
  // Three column grid (features, pricing)
  threeColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing.xl,
    [`@media (max-width: ${breakpoints.tablet})`]: {
      gridTemplateColumns: '1fr',
      gap: spacing.lg
    }
  }
};

/**
 * Button System (unified across all pages)
 */
export const buttonStyles = {
  base: {
    fontFamily: typography.sans,
    fontSize: typography.body,
    fontWeight: typography.weightSemibold,
    lineHeight: '1',
    padding: `${spacing.md} ${spacing.lg}`,
    borderRadius: radius.md,
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  },
  
  variants: {
    primary: {
      backgroundColor: colors.primary,
      color: colors.white,
      ':hover': {
        backgroundColor: colors.primaryHover
      },
      ':active': {
        backgroundColor: colors.primaryActive
      },
      ':focus-visible': {
        outline: `2px solid ${colors.primary}`,
        outlineOffset: '2px'
      },
      ':disabled': {
        backgroundColor: colors.gray300,
        cursor: 'not-allowed',
        opacity: 0.6
      }
    },
    
    secondary: {
      backgroundColor: colors.white,
      color: colors.primary,
      border: `2px solid ${colors.primary}`,
      ':hover': {
        backgroundColor: colors.gray50
      },
      ':active': {
        backgroundColor: colors.gray100
      },
      ':focus-visible': {
        outline: `2px solid ${colors.primary}`,
        outlineOffset: '2px'
      },
      ':disabled': {
        borderColor: colors.gray300,
        color: colors.gray400,
        cursor: 'not-allowed'
      }
    },
    
    ghost: {
      backgroundColor: 'transparent',
      color: colors.textPrimary,
      ':hover': {
        backgroundColor: colors.gray100
      },
      ':active': {
        backgroundColor: colors.gray200
      }
    },
    
    // Inverse (for dark backgrounds)
    inverse: {
      backgroundColor: colors.white,
      color: colors.primary,
      ':hover': {
        backgroundColor: colors.gray100
      }
    }
  },
  
  sizes: {
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
  }
};

export default {
  spacing,
  typography,
  colors,
  shadows,
  radius,
  breakpoints,
  layout,
  buttonStyles
};
