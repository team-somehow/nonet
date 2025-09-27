// Neo-Brutalism Custom Components for ETH Delhi Hackathon
// Bold, striking components with sharp edges and dramatic shadows

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Surface } from 'react-native-paper';
import { 
  NeoBrutalismColors, 
  NeoBrutalismShadows, 
  NeoBrutalismBorders, 
  NeoBrutalismSpacing,
  NeoBrutalismTypography 
} from '@/constants/neoBrutalism';

// Neo-Brutalism Button Component
interface NeoBrutalButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const NeoBrutalButton: React.FC<NeoBrutalButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = () => {
    const baseStyle = {
      ...styles.buttonBase,
      ...styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles],
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: NeoBrutalismColors.primary,
          borderColor: NeoBrutalismColors.primary,
          ...NeoBrutalismShadows.brutal,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: NeoBrutalismColors.secondary,
          borderColor: NeoBrutalismColors.secondary,
          ...NeoBrutalismShadows.brutalAlt,
        };
      case 'accent':
        return {
          ...baseStyle,
          backgroundColor: NeoBrutalismColors.accent,
          borderColor: NeoBrutalismColors.accent,
          ...NeoBrutalismShadows.brutalHeavy,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderColor: NeoBrutalismColors.primary,
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = () => {
    const baseTextStyle = {
      ...styles.buttonText,
      ...styles[`buttonText${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles],
    };

    return {
      ...baseTextStyle,
      color: variant === 'outline' ? NeoBrutalismColors.primary : NeoBrutalismColors.textInverse,
    };
  };

  return (
    <TouchableOpacity
      style={[
        getButtonStyle(),
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[getTextStyle(), disabled && styles.buttonTextDisabled, textStyle]}>
        {title.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
};

// Neo-Brutalism Card Component
interface NeoBrutalCardProps {
  children: React.ReactNode;
  variant?: 'primary' | 'accent' | 'minimal';
  style?: ViewStyle;
}

export const NeoBrutalCard: React.FC<NeoBrutalCardProps> = ({
  children,
  variant = 'primary',
  style,
}) => {
  const getCardStyle = () => {
    const baseStyle = styles.cardBase;

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: NeoBrutalismColors.surface,
          borderColor: NeoBrutalismColors.border,
          ...NeoBrutalismShadows.brutal,
        };
      case 'accent':
        return {
          ...baseStyle,
          backgroundColor: NeoBrutalismColors.surfaceAlt,
          borderColor: NeoBrutalismColors.borderAlt,
          ...NeoBrutalismShadows.brutalAlt,
        };
      case 'minimal':
        return {
          ...baseStyle,
          backgroundColor: NeoBrutalismColors.surface,
          borderColor: NeoBrutalismColors.borderSubtle,
          ...NeoBrutalismShadows.soft,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <Surface style={[getCardStyle(), style]} elevation={0}>
      {children}
    </Surface>
  );
};

// Neo-Brutalism Header Component
interface NeoBrutalHeaderProps {
  title: string;
  subtitle?: string;
  variant?: 'hero' | 'section' | 'card';
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

export const NeoBrutalHeader: React.FC<NeoBrutalHeaderProps> = ({
  title,
  subtitle,
  variant = 'section',
  style,
  titleStyle,
  subtitleStyle,
}) => {
  const getTitleStyle = () => {
    switch (variant) {
      case 'hero':
        return styles.heroTitle;
      case 'section':
        return styles.sectionTitle;
      case 'card':
        return styles.cardTitle;
      default:
        return styles.sectionTitle;
    }
  };

  return (
    <View style={[styles.headerContainer, style]}>
      <Text style={[getTitleStyle(), titleStyle]}>
        {title.toUpperCase()}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, subtitleStyle]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

// Neo-Brutalism Badge/Chip Component
interface NeoBrutalBadgeProps {
  text: string;
  variant?: 'success' | 'warning' | 'error' | 'info';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const NeoBrutalBadge: React.FC<NeoBrutalBadgeProps> = ({
  text,
  variant = 'info',
  style,
  textStyle,
}) => {
  const getBadgeStyle = () => {
    const baseStyle = styles.badgeBase;

    switch (variant) {
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: NeoBrutalismColors.success,
          borderColor: NeoBrutalismColors.success,
        };
      case 'warning':
        return {
          ...baseStyle,
          backgroundColor: NeoBrutalismColors.warning,
          borderColor: NeoBrutalismColors.warning,
        };
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: NeoBrutalismColors.error,
          borderColor: NeoBrutalismColors.error,
        };
      case 'info':
        return {
          ...baseStyle,
          backgroundColor: NeoBrutalismColors.accent,
          borderColor: NeoBrutalismColors.accent,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <View style={[getBadgeStyle(), style]}>
      <Text style={[styles.badgeText, textStyle]}>
        {text.toUpperCase()}
      </Text>
    </View>
  );
};

// Neo-Brutalism Divider Component
interface NeoBrutalDividerProps {
  variant?: 'primary' | 'secondary' | 'accent';
  thickness?: 'thin' | 'medium' | 'thick';
  style?: ViewStyle;
}

export const NeoBrutalDivider: React.FC<NeoBrutalDividerProps> = ({
  variant = 'primary',
  thickness = 'medium',
  style,
}) => {
  const getDividerStyle = () => {
    const baseStyle = styles.dividerBase;
    
    const thicknessMap = {
      thin: NeoBrutalismBorders.thin,
      medium: NeoBrutalismBorders.medium,
      thick: NeoBrutalismBorders.thick,
    };

    const colorMap = {
      primary: NeoBrutalismColors.border,
      secondary: NeoBrutalismColors.borderAlt,
      accent: NeoBrutalismColors.accent,
    };

    return {
      ...baseStyle,
      height: thicknessMap[thickness],
      backgroundColor: colorMap[variant],
    };
  };

  return <View style={[getDividerStyle(), style]} />;
};

const styles = StyleSheet.create({
  // Button Styles
  buttonBase: {
    borderWidth: NeoBrutalismBorders.thick,
    borderRadius: NeoBrutalismBorders.md,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: 0 }, { translateY: 0 }], // For animation
  },
  buttonSmall: {
    paddingHorizontal: NeoBrutalismSpacing.md,
    paddingVertical: NeoBrutalismSpacing.sm,
    minHeight: 36,
  },
  buttonMedium: {
    paddingHorizontal: NeoBrutalismSpacing.lg,
    paddingVertical: NeoBrutalismSpacing.md,
    minHeight: 48,
  },
  buttonLarge: {
    paddingHorizontal: NeoBrutalismSpacing.xl,
    paddingVertical: NeoBrutalismSpacing.lg,
    minHeight: 56,
  },
  buttonText: {
    fontWeight: NeoBrutalismTypography.weights.bold,
    letterSpacing: 1,
  },
  buttonTextSmall: {
    fontSize: NeoBrutalismTypography.sizes.sm,
  },
  buttonTextMedium: {
    fontSize: NeoBrutalismTypography.sizes.md,
  },
  buttonTextLarge: {
    fontSize: NeoBrutalismTypography.sizes.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextDisabled: {
    color: NeoBrutalismColors.textTertiary,
  },

  // Card Styles
  cardBase: {
    borderWidth: NeoBrutalismBorders.thick,
    borderRadius: NeoBrutalismBorders.lg,
    padding: NeoBrutalismSpacing.lg,
  },

  // Header Styles
  headerContainer: {
    marginBottom: NeoBrutalismSpacing.lg,
  },
  heroTitle: {
    fontSize: NeoBrutalismTypography.sizes.hero,
    fontWeight: NeoBrutalismTypography.weights.heavy,
    color: NeoBrutalismColors.textPrimary,
    lineHeight: NeoBrutalismTypography.lineHeights.tight * NeoBrutalismTypography.sizes.hero,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sectionTitle: {
    fontSize: NeoBrutalismTypography.sizes.xxxl,
    fontWeight: NeoBrutalismTypography.weights.bold,
    color: NeoBrutalismColors.textPrimary,
    lineHeight: NeoBrutalismTypography.lineHeights.tight * NeoBrutalismTypography.sizes.xxxl,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: NeoBrutalismTypography.sizes.xl,
    fontWeight: NeoBrutalismTypography.weights.bold,
    color: NeoBrutalismColors.textPrimary,
    lineHeight: NeoBrutalismTypography.lineHeights.normal * NeoBrutalismTypography.sizes.xl,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: NeoBrutalismTypography.sizes.md,
    fontWeight: NeoBrutalismTypography.weights.medium,
    color: NeoBrutalismColors.textSecondary,
    marginTop: NeoBrutalismSpacing.sm,
    lineHeight: NeoBrutalismTypography.lineHeights.normal * NeoBrutalismTypography.sizes.md,
  },

  // Badge Styles
  badgeBase: {
    paddingHorizontal: NeoBrutalismSpacing.md,
    paddingVertical: NeoBrutalismSpacing.xs,
    borderRadius: NeoBrutalismBorders.sm,
    borderWidth: NeoBrutalismBorders.medium,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: NeoBrutalismTypography.sizes.xs,
    fontWeight: NeoBrutalismTypography.weights.bold,
    color: NeoBrutalismColors.textInverse,
    letterSpacing: 0.5,
  },

  // Divider Styles
  dividerBase: {
    marginVertical: NeoBrutalismSpacing.md,
  },
});

export default {
  NeoBrutalButton,
  NeoBrutalCard,
  NeoBrutalHeader,
  NeoBrutalBadge,
  NeoBrutalDivider,
};
