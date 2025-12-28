/**
 * SignalTrue Design System Tokens
 * 
 * CRITICAL RULE: No raw hex/color values allowed outside this file.
 * All components must import and use these tokens only.
 */

export const colors = {
  // Backgrounds
  bgDark: '#0f172a',           // Dark navy for hero sections
  bgLight: '#ffffff',          // White for content sections
  bgSubtle: '#f9fafb',         // Very light gray for alternating sections
  
  // Surfaces
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  
  // Text
  textPrimary: '#1e293b',      // Dark slate for headings
  textSecondary: '#64748b',    // Mid slate for body text
  textMuted: '#94a3b8',        // Light slate for captions
  textInverse: '#ffffff',      // White text on dark backgrounds
  textInverseSecondary: 'rgba(255,255,255,0.8)',
  
  // Borders
  border: '#e5e7eb',           // Subtle gray borders
  borderLight: '#f1f5f9',
  
  // Brand Primary (ONE COLOR FOR PRIMARY CTA)
  primary: '#3b82f6',          // Blue - used for main CTAs only
  primaryHover: '#2563eb',
  primaryActive: '#1d4ed8',
  
  // Secondary (neutral actions)
  secondary: '#64748b',
  secondaryHover: '#475569',
  
  // Focus & States
  focus: '#3b82f6',
  focusRing: 'rgba(59, 130, 246, 0.5)',
  
  // Semantic colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

export const typography = {
  // Font families
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  
  // Font sizes (mobile-first)
  hero: '2.5rem',              // 40px
  h1: '2rem',                  // 32px
  h2: '1.5rem',                // 24px
  h3: '1.25rem',               // 20px
  body: '1rem',                // 16px
  bodyLarge: '1.125rem',       // 18px
  bodySmall: '0.875rem',       // 14px
  caption: '0.75rem',          // 12px
  
  // Line heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
  
  // Font weights
  weightNormal: 400,
  weightMedium: 500,
  weightSemibold: 600,
  weightBold: 700,
};

export const spacing = {
  // Base spacing scale (rem units)
  xs: '0.5rem',      // 8px
  sm: '0.75rem',     // 12px
  md: '1rem',        // 16px
  lg: '1.5rem',      // 24px
  xl: '2rem',        // 32px
  '2xl': '3rem',     // 48px
  '3xl': '4rem',     // 64px
  '4xl': '6rem',     // 96px
  
  // Section padding (vertical rhythm)
  sectionPadding: '4rem 2rem',
  sectionPaddingSmall: '3rem 1.5rem',
  
  // Container
  containerMaxWidth: '72rem',   // 1152px
  containerPadding: '0 1.5rem',
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

export const radius = {
  sm: '0.25rem',     // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  full: '9999px',
};

export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
};

// Composite tokens for common patterns
export const patterns = {
  card: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.lg,
    padding: spacing.xl,
    boxShadow: shadows.sm,
  },
  
  input: {
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: typography.body,
    transition: transitions.normal,
  },
  
  focusRing: {
    outline: 'none',
    boxShadow: `0 0 0 3px ${colors.focusRing}`,
  },
};

export default {
  colors,
  typography,
  spacing,
  shadows,
  radius,
  transitions,
  patterns,
};
