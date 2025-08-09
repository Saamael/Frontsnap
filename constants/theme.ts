// FrontSnap Design System - Centralized Theme Configuration

export const LightColors = {
  // Primary Brand Colors
  primary: '#007AFF',
  primaryLight: '#4DA3FF',
  primaryDark: '#0056CC',
  
  // Secondary Colors
  secondary: '#5856D6',
  secondaryLight: '#7B7AE8',
  secondaryDark: '#3C3BA3',
  
  // Semantic Colors
  success: '#34C759',
  successLight: '#5FD77A',
  successDark: '#248A3D',
  
  warning: '#FF9500',
  warningLight: '#FFB340',
  warningDark: '#CC7700',
  
  error: '#FF3B30',
  errorLight: '#FF6B61',
  errorDark: '#CC2E24',
  
  info: '#007AFF',
  infoLight: '#4DA3FF',
  infoDark: '#0056CC',
  
  // Neutral Colors
  black: '#000000',
  white: '#FFFFFF',
  
  // Grays
  gray900: '#1C1C1E',
  gray800: '#2C2C2E',
  gray700: '#3A3A3C',
  gray600: '#48484A',
  gray500: '#636366',
  gray400: '#8E8E93',
  gray300: '#AEAEB2',
  gray200: '#C6C6C8',
  gray100: '#E5E5EA',
  gray50: '#F2F2F7',
  
  // Background Colors
  background: '#FFFFFF',
  backgroundSecondary: '#F9F9F9',
  backgroundTertiary: '#F2F2F7',
  
  // Surface Colors
  surface: '#FFFFFF',
  surfaceSecondary: '#F9F9F9',
  surfaceTertiary: '#F2F2F7',
  
  // Text Colors
  textPrimary: '#000000',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  textPlaceholder: '#AEAEB2',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#FFFFFF',
  
  // Border Colors
  border: '#E5E5EA',
  borderSecondary: '#C6C6C8',
  borderLight: '#F2F2F7',
  
  // Interactive Colors
  link: '#007AFF',
  linkPressed: '#0056CC',
  selection: 'rgba(0, 122, 255, 0.2)',
  
  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  overlayDark: 'rgba(0, 0, 0, 0.6)',
  
  // Status Colors
  online: '#34C759',
  offline: '#8E8E93',
  away: '#FF9500',
  busy: '#FF3B30',
  
  // Transparent
  transparent: 'transparent',
} as const;

export const DarkColors = {
  // Primary Brand Colors (same as light for consistency)
  primary: '#007AFF',
  primaryLight: '#4DA3FF',
  primaryDark: '#0056CC',
  
  // Secondary Colors
  secondary: '#5856D6',
  secondaryLight: '#7B7AE8',
  secondaryDark: '#3C3BA3',
  
  // Semantic Colors
  success: '#34C759',
  successLight: '#5FD77A',
  successDark: '#248A3D',
  
  warning: '#FF9500',
  warningLight: '#FFB340',
  warningDark: '#CC7700',
  
  error: '#FF3B30',
  errorLight: '#FF6B61',
  errorDark: '#CC2E24',
  
  info: '#007AFF',
  infoLight: '#4DA3FF',
  infoDark: '#0056CC',
  
  // Neutral Colors
  black: '#FFFFFF', // Inverted for dark mode
  white: '#000000', // Inverted for dark mode
  
  // Grays (inverted hierarchy)
  gray900: '#F2F2F7',
  gray800: '#E5E5EA',
  gray700: '#C6C6C8',
  gray600: '#AEAEB2',
  gray500: '#8E8E93',
  gray400: '#636366',
  gray300: '#48484A',
  gray200: '#3A3A3C',
  gray100: '#2C2C2E',
  gray50: '#1C1C1E',
  
  // Background Colors
  background: '#000000',
  backgroundSecondary: '#1C1C1E',
  backgroundTertiary: '#2C2C2E',
  
  // Surface Colors
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',
  surfaceTertiary: '#3A3A3C',
  
  // Text Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textTertiary: '#8E8E93',
  textPlaceholder: '#636366',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#000000',
  
  // Border Colors
  border: '#3A3A3C',
  borderSecondary: '#48484A',
  borderLight: '#2C2C2E',
  
  // Interactive Colors
  link: '#007AFF',
  linkPressed: '#4DA3FF',
  selection: 'rgba(0, 122, 255, 0.3)',
  
  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  overlayDark: 'rgba(0, 0, 0, 0.9)',
  
  // Status Colors
  online: '#34C759',
  offline: '#8E8E93',
  away: '#FF9500',
  busy: '#FF3B30',
  
  // Transparent
  transparent: 'transparent',
} as const;

// Default to light colors for backward compatibility
export const Colors = LightColors;

export const Typography = {
  // Font Families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
    monospace: 'Menlo',
  },
  
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },
  
  // Line Heights
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
    '2xl': 36,
    '3xl': 40,
    '4xl': 44,
    '5xl': 56,
    '6xl': 72,
  },
  
  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Text Styles
  styles: {
    // Headlines
    h1: {
      fontSize: 36,
      lineHeight: 44,
      fontWeight: '700',
      color: Colors.textPrimary,
    },
    h2: {
      fontSize: 30,
      lineHeight: 40,
      fontWeight: '600',
      color: Colors.textPrimary,
    },
    h3: {
      fontSize: 24,
      lineHeight: 36,
      fontWeight: '600',
      color: Colors.textPrimary,
    },
    h4: {
      fontSize: 20,
      lineHeight: 32,
      fontWeight: '600',
      color: Colors.textPrimary,
    },
    h5: {
      fontSize: 18,
      lineHeight: 28,
      fontWeight: '600',
      color: Colors.textPrimary,
    },
    h6: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
      color: Colors.textPrimary,
    },
    
    // Body Text
    body1: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400',
      color: Colors.textPrimary,
    },
    body2: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
      color: Colors.textSecondary,
    },
    
    // Captions
    caption1: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400',
      color: Colors.textTertiary,
    },
    caption2: {
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '400',
      color: Colors.textTertiary,
    },
    
    // Button Text
    button: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
      color: Colors.textOnPrimary,
    },
    buttonSmall: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      color: Colors.textOnPrimary,
    },
    
    // Labels
    label: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
      color: Colors.textSecondary,
    },
    
    // Links
    link: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400',
      color: Colors.link,
    },
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
  '7xl': 96,
  '8xl': 128,
} as const;

export const BorderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

export const Layout = {
  // Container Widths
  container: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
  
  // Common Dimensions
  dimensions: {
    buttonHeight: 48,
    buttonHeightSmall: 36,
    buttonHeightLarge: 56,
    inputHeight: 48,
    headerHeight: 64,
    tabBarHeight: 80,
    cardPadding: 16,
    screenPadding: 20,
  },
  
  // Z-Index Scale
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
} as const;

export const Animation = {
  // Duration
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  // Easing
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
  
  // Common Transitions
  transitions: {
    fade: {
      duration: 300,
      easing: 'ease-in-out',
    },
    slide: {
      duration: 250,
      easing: 'ease-out',
    },
    scale: {
      duration: 200,
      easing: 'ease-out',
    },
  },
} as const;

// Theme object combining all design tokens
export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  layout: Layout,
  animation: Animation,
} as const;

// Theme helper function for accessing current color scheme
export const getColors = (isDark: boolean = false) => {
  return isDark ? DarkColors : LightColors;
};

// Type definitions for TypeScript
export type ThemeColors = typeof LightColors;
export type ThemeTypography = typeof Typography;
export type ThemeSpacing = typeof Spacing;
export type ThemeBorderRadius = typeof BorderRadius;
export type ThemeShadows = typeof Shadows;
export type ThemeLayout = typeof Layout;
export type ThemeAnimation = typeof Animation;
export type ThemeType = typeof Theme;

export default Theme;