import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Monogram from './Monogram';
import { colors, font, space } from '../../theme/tokens';

interface PlayerRowProps {
  name: string;
  lastName: string;
  position?: string;
  foot?: string;
  isCaptain?: boolean;
  number?: number;
  avatarUrl?: string | null;
  actionLabel?: string;
  onAction?: () => void;
}

export default function PlayerRow({ name, lastName, position, foot, isCaptain, number, avatarUrl, actionLabel, onAction }: PlayerRowProps) {
  return (
    <View style={styles.row}>
      <Monogram name={name} lastName={lastName} size={44} imageUri={avatarUrl} />

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name} {lastName}
          </Text>
          {isCaptain && <View style={styles.capBadge}><Text style={styles.capText}>CAP</Text></View>}
        </View>
        {(position || foot) && (
          <Text style={styles.detail}>
            {[position, foot].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>

      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction} hitSlop={8}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : number !== undefined ? (
        <Text style={styles.number}>{number}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  body: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { fontFamily: font.sansBold, fontSize: 14, color: colors.cream },
  capBadge: {
    backgroundColor: 'rgba(222,219,200,0.12)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  capText: { fontFamily: font.sansBold, fontSize: 8.5, letterSpacing: 1, color: colors.cream70, textTransform: 'uppercase' },
  detail: { fontFamily: font.sans, fontSize: 12, color: colors.gray500 },
  number: { fontFamily: font.serifItalic, fontSize: 20, color: colors.cream45 },
  actionBtn: {
    backgroundColor: 'rgba(222,219,200,0.10)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  actionText: { fontFamily: font.sansBold, fontSize: 11, color: colors.cream70 },
});
