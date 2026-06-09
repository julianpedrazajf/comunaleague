import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import Monogram from './Monogram';
import { colors, font, space } from '../../theme/tokens';

interface PlayerRowProps {
  name: string;
  lastName: string;
  position?: string;
  foot?: string;
  isCaptain?: boolean;
  guestBadge?: boolean;
  memberBadge?: boolean;
  number?: number;
  avatarUrl?: string | null;
  actionLabel?: string;
  onAction?: () => void;
  attendanceConfirmed?: boolean;
  matchDate?: string;
}

export default function PlayerRow({ name, lastName, position, foot, isCaptain, guestBadge, memberBadge, number, avatarUrl, actionLabel, onAction, attendanceConfirmed, matchDate }: PlayerRowProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <Monogram name={name} lastName={lastName} size={44} imageUri={avatarUrl} />

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name} {lastName}
          </Text>
          {isCaptain && <View style={styles.capBadge}><Text style={styles.capText}>CAP</Text></View>}
          {memberBadge && !isCaptain && <View style={styles.memberBadge}><Text style={styles.memberText}>{t('team.memberBadge')}</Text></View>}
          {guestBadge && <View style={styles.guestBadge}><Text style={styles.guestText}>{t('team.guestBadge')}</Text></View>}
        </View>
        {(position || foot || matchDate) && (
          <Text style={styles.detail}>
            {[position, foot, matchDate].filter(Boolean).join(' · ')}
          </Text>
        )}
        {attendanceConfirmed !== undefined && (
          <View style={styles.attendanceRow}>
            <View style={[styles.attendanceDot, attendanceConfirmed ? styles.dotGreen : styles.dotGray]} />
            <Text style={[styles.attendanceLabel, attendanceConfirmed ? styles.labelGreen : styles.labelGray]}>
              {attendanceConfirmed ? t('team.confirmed') : t('team.pending')}
            </Text>
          </View>
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
  memberBadge: {
    backgroundColor: 'rgba(73,115,115,0.18)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  memberText: { fontFamily: font.sansBold, fontSize: 8.5, letterSpacing: 1, color: '#497373', textTransform: 'uppercase' },
  guestBadge: {
    backgroundColor: 'rgba(242,179,102,0.15)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  guestText: { fontFamily: font.sansBold, fontSize: 8.5, letterSpacing: 1, color: '#F2B366', textTransform: 'uppercase' },
  detail: { fontFamily: font.sans, fontSize: 12, color: colors.gray500 },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  attendanceDot: { width: 6, height: 6, borderRadius: 3 },
  dotGreen: { backgroundColor: colors.green },
  dotGray: { backgroundColor: colors.gray500 },
  attendanceLabel: { fontFamily: font.sans, fontSize: 11 },
  labelGreen: { color: colors.green },
  labelGray: { color: colors.gray500 },
  number: { fontFamily: font.serifItalic, fontSize: 20, color: colors.cream45 },
  actionBtn: {
    backgroundColor: 'rgba(222,219,200,0.10)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  actionText: { fontFamily: font.sansBold, fontSize: 11, color: colors.cream70 },
});
