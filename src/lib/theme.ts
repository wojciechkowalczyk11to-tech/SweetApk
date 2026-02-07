// src/lib/theme.ts

export const COLORS = {
  // Primary palette - warm pinks
  primary: '#FF6B9D',
  primaryLight: '#FF9EC0',
  primaryDark: '#E0456E',
  primaryFaded: 'rgba(255, 107, 157, 0.15)',

  // Secondary - soft lavender
  secondary: '#B39DDB',
  secondaryLight: '#D1C4E9',

  // Accent - warm gold
  accent: '#FFD54F',
  accentDark: '#FFC107',

  // Backgrounds
  background: '#FFF8FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFF0F5',

  // Text
  text: '#2D1B30',
  textSecondary: '#7A6B7F',
  textLight: '#B8A9BC',
  textOnPrimary: '#FFFFFF',

  // Status
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  info: '#42A5F5',

  // Pet mood colors
  petEcstatic: '#FFD54F',
  petHappy: '#81C784',
  petContent: '#90CAF9',
  petSad: '#FFAB91',
  petMiserable: '#EF9A9A',

  // Rarity colors
  rarityCommon: '#9E9E9E',
  rarityRare: '#7C4DFF',
  rarityLegendary: '#FFD700',

  // Misc
  border: '#F0E0E8',
  shadow: 'rgba(45, 27, 48, 0.08)',
  overlay: 'rgba(45, 27, 48, 0.5)',
  transparent: 'transparent',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
  hero: 36,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
