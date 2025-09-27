// Neo-Brutalism Design System for ETH Delhi Hackathon
// Bold, high-contrast, modern design with sharp edges and striking visuals

export const NeoBrutalismColors = {
  // Primary Brand Colors - Bold Blue Theme
  primary: '#007AFF', // iOS Blue
  primaryDark: '#0056CC',
  primaryLight: '#3395FF',
  
  // Secondary Colors - Complementary
  secondary: '#5856D6', // Purple
  secondaryDark: '#4A4AB8',
  secondaryLight: '#7B7AE8',
  
  // Accent Colors - Supporting Blues
  accent: '#00C7FF', // Light Blue
  accentDark: '#0099CC',
  accentLight: '#33D1FF',
  
  // Warning & Status Colors
  warning: '#FF9500', // Orange
  error: '#FF3B30', // Red
  success: '#34C759', // Green
  
  // Background Colors - Light Theme
  background: '#FFFFFF', // Pure White
  backgroundAlt: '#F8F9FA', // Light Gray
  surface: '#FFFFFF', // White surface
  surfaceAlt: '#F1F3F4', // Light Gray surface
  
  // Text Colors - Dark on Light
  textPrimary: '#000000', // Pure Black
  textSecondary: '#666666', // Medium Gray
  textTertiary: '#999999', // Light Gray
  textInverse: '#FFFFFF', // White text for dark backgrounds
  
  // Border Colors - Bold Outlines
  border: '#007AFF', // Primary color borders
  borderAlt: '#5856D6', // Secondary color borders
  borderSubtle: '#E5E5EA', // Subtle borders
  
  // Shadow Colors - Dramatic Shadows
  shadow: '#007AFF', // Colored shadows for Neo-Brutalism effect
  shadowAlt: '#5856D6',
  shadowDark: '#000000',
};

export const NeoBrutalismTypography = {
  // Font Weights - Bold and Heavy
  weights: {
    regular: '400',
    medium: '600',
    bold: '800', // Extra bold for impact
    heavy: '900', // Maximum weight
  },
  
  // Font Sizes - Hierarchical Scale
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 32,
    display: 48, // Large display text
    hero: 64, // Hero text for impact
  },
  
  // Line Heights - Tight for impact
  lineHeights: {
    tight: 1.1,
    normal: 1.2,
    relaxed: 1.4,
  },
};

export const NeoBrutalismSpacing = {
  // Spacing Scale - Bold and Generous
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  huge: 96, // Extra large spacing for impact
};

export const NeoBrutalismBorders = {
  // Border Widths - Thick and Bold
  thin: 1,
  medium: 2,
  thick: 4,
  heavy: 6, // Extra thick for Neo-Brutalism
  
  // Border Radius - Sharp edges with occasional rounded elements
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  round: 999, // For pills/circles
};

export const NeoBrutalismShadows = {
  // Dramatic Shadows - Offset and Colored
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  
  // Neo-Brutalism signature: offset colored shadows
  brutal: {
    shadowColor: NeoBrutalismColors.primary,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0, // Sharp shadows, no blur
    elevation: 8,
  },
  
  brutalAlt: {
    shadowColor: NeoBrutalismColors.secondary,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 12,
  },
  
  brutalHeavy: {
    shadowColor: NeoBrutalismColors.accent,
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 16,
  },
  
  // Traditional shadows for subtle elements
  soft: {
    shadowColor: NeoBrutalismColors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
};

export const NeoBrutalismAnimations = {
  // Animation Durations - Snappy and Responsive
  fast: 150,
  normal: 250,
  slow: 350,
  
  // Easing Functions - Sharp and Impactful
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Bouncy effect
  },
};

// Component-specific styles for consistency
export const NeoBrutalismComponents = {
  button: {
    primary: {
      backgroundColor: NeoBrutalismColors.primary,
      borderColor: NeoBrutalismColors.primary,
      borderWidth: NeoBrutalismBorders.thick,
      borderRadius: NeoBrutalismBorders.md,
      ...NeoBrutalismShadows.brutal,
    },
    secondary: {
      backgroundColor: NeoBrutalismColors.secondary,
      borderColor: NeoBrutalismColors.secondary,
      borderWidth: NeoBrutalismBorders.thick,
      borderRadius: NeoBrutalismBorders.md,
      ...NeoBrutalismShadows.brutalAlt,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: NeoBrutalismColors.primary,
      borderWidth: NeoBrutalismBorders.thick,
      borderRadius: NeoBrutalismBorders.md,
    },
  },
  
  card: {
    primary: {
      backgroundColor: NeoBrutalismColors.surface,
      borderColor: NeoBrutalismColors.border,
      borderWidth: NeoBrutalismBorders.thick,
      borderRadius: NeoBrutalismBorders.lg,
      ...NeoBrutalismShadows.brutal,
    },
    accent: {
      backgroundColor: NeoBrutalismColors.surfaceAlt,
      borderColor: NeoBrutalismColors.borderAlt,
      borderWidth: NeoBrutalismBorders.thick,
      borderRadius: NeoBrutalismBorders.lg,
      ...NeoBrutalismShadows.brutalAlt,
    },
  },
  
  input: {
    primary: {
      backgroundColor: NeoBrutalismColors.surface,
      borderColor: NeoBrutalismColors.border,
      borderWidth: NeoBrutalismBorders.thick,
      borderRadius: NeoBrutalismBorders.md,
      color: NeoBrutalismColors.textPrimary,
    },
  },
};

// Gradient definitions for modern look
export const NeoBrutalismGradients = {
  primary: ['#007AFF', '#0056CC', '#003D99'],
  secondary: ['#5856D6', '#4A4AB8', '#3C3C9A'],
  accent: ['#00C7FF', '#0099CC', '#006B99'],
  cyber: ['#007AFF', '#00C7FF', '#5856D6'], // Multi-color blue gradient
  light: ['#FFFFFF', '#F8F9FA', '#F1F3F4'],
};

export default {
  colors: NeoBrutalismColors,
  typography: NeoBrutalismTypography,
  spacing: NeoBrutalismSpacing,
  borders: NeoBrutalismBorders,
  shadows: NeoBrutalismShadows,
  animations: NeoBrutalismAnimations,
  components: NeoBrutalismComponents,
  gradients: NeoBrutalismGradients,
};
