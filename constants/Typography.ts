import { Platform, PixelRatio } from 'react-native';

// iOS Dynamic Type size mapping
export const DynamicTypeSize = {
  xSmall: -3,
  small: -2,
  medium: -1,
  large: 0,
  xLarge: 1,
  xxLarge: 2,
  xxxLarge: 3,
} as const;

// Base font sizes following iOS Human Interface Guidelines
export const FontSizes = {
  caption2: 11,
  caption1: 12,
  footnote: 13,
  subheadline: 15,
  callout: 16,
  body: 17,
  headline: 18,
  title3: 20,
  title2: 22,
  title1: 28,
  largeTitle: 34,
} as const;

// Font weights following iOS system
export const FontWeights = {
  ultraLight: '100',
  thin: '200',
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
  black: '900',
} as const;

// Line heights for optimal readability
export const LineHeights = {
  tight: 1.1,
  normal: 1.2,
  relaxed: 1.4,
  loose: 1.6,
} as const;

// Responsive scaling function
export const scaleFont = (size: number, factor: number = 1): number => {
  const pixelRatio = PixelRatio.get();
  const deviceScale = Platform.OS === 'ios' 
    ? Math.min(pixelRatio, 3) / 3 // Limit scaling on iOS
    : Math.min(pixelRatio, 2.5) / 2; // Limit scaling on Android
    
  return Math.round(size * factor * deviceScale);
};

// Typography styles for consistent usage
export const Typography = {
  largeTitle: {
    fontSize: Platform.OS === 'ios' ? FontSizes.largeTitle : scaleFont(FontSizes.largeTitle, 0.95),
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes.largeTitle * LineHeights.tight,
    letterSpacing: Platform.OS === 'ios' ? -0.5 : 0,
  },
  title1: {
    fontSize: Platform.OS === 'ios' ? FontSizes.title1 : scaleFont(FontSizes.title1, 0.95),
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes.title1 * LineHeights.tight,
    letterSpacing: Platform.OS === 'ios' ? -0.3 : 0,
  },
  title2: {
    fontSize: Platform.OS === 'ios' ? FontSizes.title2 : scaleFont(FontSizes.title2, 0.95),
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes.title2 * LineHeights.normal,
    letterSpacing: Platform.OS === 'ios' ? -0.2 : 0,
  },
  title3: {
    fontSize: Platform.OS === 'ios' ? FontSizes.title3 : scaleFont(FontSizes.title3, 0.95),
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.title3 * LineHeights.normal,
    letterSpacing: Platform.OS === 'ios' ? -0.2 : 0,
  },
  headline: {
    fontSize: Platform.OS === 'ios' ? FontSizes.headline : scaleFont(FontSizes.headline),
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.headline * LineHeights.normal,
    letterSpacing: Platform.OS === 'ios' ? -0.1 : 0,
  },
  body: {
    fontSize: Platform.OS === 'ios' ? FontSizes.body : scaleFont(FontSizes.body),
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.body * LineHeights.relaxed,
  },
  callout: {
    fontSize: Platform.OS === 'ios' ? FontSizes.callout : scaleFont(FontSizes.callout),
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.callout * LineHeights.normal,
  },
  subheadline: {
    fontSize: Platform.OS === 'ios' ? FontSizes.subheadline : scaleFont(FontSizes.subheadline),
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.subheadline * LineHeights.normal,
  },
  footnote: {
    fontSize: Platform.OS === 'ios' ? FontSizes.footnote : scaleFont(FontSizes.footnote),
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.footnote * LineHeights.normal,
  },
  caption1: {
    fontSize: Platform.OS === 'ios' ? FontSizes.caption1 : scaleFont(FontSizes.caption1),
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.caption1 * LineHeights.normal,
  },
  caption2: {
    fontSize: Platform.OS === 'ios' ? FontSizes.caption2 : scaleFont(FontSizes.caption2),
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.caption2 * LineHeights.normal,
  },
} as const;

// Color system for text
export const TextColors = {
  primary: '#1D1D1F',
  secondary: '#8E8E93',
  tertiary: '#C7C7CC',
  accent: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  white: '#FFFFFF',
  black: '#000000',
} as const;

// Helper function to get accessible text color
export const getAccessibleTextColor = (backgroundColor: string): string => {
  // Simple contrast check - in production, you might want a more sophisticated algorithm
  const isLight = backgroundColor === '#FFFFFF' || backgroundColor.includes('F') || backgroundColor.includes('E');
  return isLight ? TextColors.primary : TextColors.white;
};