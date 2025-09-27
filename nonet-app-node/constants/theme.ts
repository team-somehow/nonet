/**
 * Bold, high-contrast, modern design with sharp edges and striking visuals
 */

import { Platform } from 'react-native';
import { NeoBrutalismColors } from './neoBrutalism';

const tintColor = NeoBrutalismColors.primary; // Electric Green

export const Colors = {
  light: {
    text: '#000000',
    background: '#FFFFFF',
    tint: '#007AFF',
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: '#007AFF',
  },
  dark: {
    text: '#000000',
    background: '#FFFFFF',
    tint: '#007AFF',
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: '#007AFF',
  },
  // Neo-Brutalism Theme - Primary theme for hackathon
  neoBrutalism: {
    text: NeoBrutalismColors.textPrimary,
    textSecondary: NeoBrutalismColors.textSecondary,
    textTertiary: NeoBrutalismColors.textTertiary,
    textInverse: NeoBrutalismColors.textInverse,
    background: NeoBrutalismColors.background,
    backgroundAlt: NeoBrutalismColors.backgroundAlt,
    surface: NeoBrutalismColors.surface,
    surfaceAlt: NeoBrutalismColors.surfaceAlt,
    primary: NeoBrutalismColors.primary,
    primaryDark: NeoBrutalismColors.primaryDark,
    primaryLight: NeoBrutalismColors.primaryLight,
    secondary: NeoBrutalismColors.secondary,
    secondaryDark: NeoBrutalismColors.secondaryDark,
    accent: NeoBrutalismColors.accent,
    warning: NeoBrutalismColors.warning,
    error: NeoBrutalismColors.error,
    success: NeoBrutalismColors.success,
    border: NeoBrutalismColors.border,
    borderAlt: NeoBrutalismColors.borderAlt,
    borderSubtle: NeoBrutalismColors.borderSubtle,
    shadow: NeoBrutalismColors.shadow,
    shadowAlt: NeoBrutalismColors.shadowAlt,
    tint: NeoBrutalismColors.primary,
    icon: NeoBrutalismColors.textSecondary,
    tabIconDefault: NeoBrutalismColors.textSecondary,
    tabIconSelected: NeoBrutalismColors.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
