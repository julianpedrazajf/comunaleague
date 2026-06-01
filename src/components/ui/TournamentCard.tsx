import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trophy, MapPin, Calendar, Plus } from 'lucide-react-native';
import Chip from './Chip';
import { colors, font, radius, space } from '../../theme/tokens';

interface TournamentCardProps {
  name: string;
  format: string;
  location?: string;
  date?: string;
  price?: string | number;
  onRegister?: () => void;
}

export default function TournamentCard({ name, format, location, date, price, onRegister }: TournamentCardProps) {
  const priceLabel = price === 0 || price === 'Gratis' ? 'Gratis' : `$${price}`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Trophy size={16} color={colors.cream45} strokeWidth={2} />
        <Chip label={format} />
      </View>

      <Text style={styles.name} numberOfLines={2}>{name}</Text>

      <View style={styles.meta}>
        {location && (
          <View style={styles.metaRow}>
            <MapPin size={11} color={colors.gray500} strokeWidth={2} />
            <Text style={styles.metaText}>{location}</Text>
          </View>
        )}
        {date && (
          <View style={styles.metaRow}>
            <Calendar size={11} color={colors.gray500} strokeWidth={2} />
            <Text style={styles.metaText}>{date}</Text>
          </View>
        )}
      </View>

      <View style={styles.hairline} />

      <View style={styles.footer}>
        <Text style={styles.price}>{priceLabel}</Text>
        <TouchableOpacity style={styles.plusBtn} onPress={onRegister} hitSlop={6}>
          <Plus size={18} color={colors.black} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 230,
    backgroundColor: colors.surface2,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontFamily: font.sansBold, fontSize: 16, color: colors.cream, lineHeight: 22 },
  meta: { gap: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: font.sans, fontSize: 11.5, color: colors.gray500 },
  hairline: { height: 1, backgroundColor: colors.hairline },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontFamily: font.serifItalic, fontSize: 20, color: colors.cream },
  plusBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: colors.cream2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
