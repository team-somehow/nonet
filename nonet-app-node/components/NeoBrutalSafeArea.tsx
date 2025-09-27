// Neo-Brutalism SafeAreaView wrapper component
// Ensures consistent safe area handling across all screens

import React from 'react';
import { SafeAreaView, StyleSheet, ViewStyle } from 'react-native';
import { NeoBrutalismColors } from '@/constants/neoBrutalism';

interface NeoBrutalSafeAreaProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
}

export const NeoBrutalSafeArea: React.FC<NeoBrutalSafeAreaProps> = ({
  children,
  style,
  backgroundColor = NeoBrutalismColors.background,
}) => {
  return (
    <SafeAreaView 
      style={[
        styles.container, 
        { backgroundColor }, 
        style
      ]}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default NeoBrutalSafeArea;
