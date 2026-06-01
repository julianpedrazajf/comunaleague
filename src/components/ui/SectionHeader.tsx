import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Eyebrow from './Eyebrow';
import { colors, space, font } from '../../theme/tokens';

interface SectionHeaderProps {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function SectionHeader({ label, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Eyebrow>{label}</Eyebrow>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.action} onPress={onAction} hitSlop={8}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <ChevronRight size={12} color={colors.cream45} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.md,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { fontFamily: font.sansBold, fontSize: 10.5, color: colors.cream45 },
});
