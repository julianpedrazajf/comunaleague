import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, font, space, radius } from '../../theme/tokens';

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstWeekDay = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstWeekDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const _today = new Date();
const todayStr = toDateStr(_today.getFullYear(), _today.getMonth(), _today.getDate());

type Props = {
  markedDates: Set<string>;
  secondaryMarkedDates?: Set<string>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
};

export default function MonthCalendar({ markedDates, secondaryMarkedDates, selectedDate, onSelectDate }: Props) {
  const { i18n } = useTranslation();
  const [calMonth, setCalMonth] = useState({ year: _today.getFullYear(), month: _today.getMonth() });

  const calDays = useMemo(() => buildCalendarDays(calMonth.year, calMonth.month), [calMonth]);

  const monthLabel = useMemo(() =>
    new Date(calMonth.year, calMonth.month, 1)
      .toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' }),
    [calMonth, i18n.language]
  );

  const weekDayLabels = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2025, 0, 6 + i); // Jan 6 2025 = Monday
      return d.toLocaleDateString(i18n.language, { weekday: 'narrow' });
    }),
    [i18n.language]
  );

  const prevMonth = useCallback(() =>
    setCalMonth(m => {
      const d = new Date(m.year, m.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    }), []);

  const nextMonth = useCallback(() =>
    setCalMonth(m => {
      const d = new Date(m.year, m.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    }), []);

  return (
    <View style={styles.calendar}>
      <View style={styles.calHeader}>
        <TouchableOpacity hitSlop={12} onPress={prevMonth}>
          <ChevronLeft size={18} color={colors.cream45} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.calMonthLabel}>{monthLabel}</Text>
        <TouchableOpacity hitSlop={12} onPress={nextMonth}>
          <ChevronRight size={18} color={colors.cream45} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.calWeekRow}>
        {weekDayLabels.map((d, i) => (
          <Text key={i} style={styles.calWeekDay}>{d}</Text>
        ))}
      </View>

      <View style={styles.calGrid}>
        {calDays.map((day, idx) => {
          if (!day) return <View key={`e-${idx}`} style={styles.calCell} />;
          const dateStr = toDateStr(calMonth.year, calMonth.month, day);
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === todayStr;
          const hasMatch = markedDates.has(dateStr);
          const hasRequest = secondaryMarkedDates?.has(dateStr) ?? false;
          return (
            <TouchableOpacity
              key={dateStr}
              style={styles.calCell}
              onPress={() => onSelectDate(isSelected ? null : dateStr)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.calCellCircle,
                isSelected && styles.calCellCircleActive,
                isToday && !isSelected && styles.calCellCircleToday,
              ]}>
                <Text style={[styles.calDayText, isSelected && styles.calDayTextActive]}>
                  {day}
                </Text>
              </View>
              {hasMatch || hasRequest ? (
                <View style={styles.calDotRow}>
                  {hasMatch && <View style={[styles.calDot, isSelected && styles.calDotActive]} />}
                  {hasRequest && <View style={[styles.calDotRed, isSelected && styles.calDotActive]} />}
                </View>
              ) : (
                <View style={styles.calDotEmpty} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: 16,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calMonthLabel: {
    fontFamily: font.sansBold,
    fontSize: 14,
    color: colors.cream,
    textTransform: 'capitalize',
  },
  calWeekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.sansBold,
    fontSize: 10,
    color: colors.cream45,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.2857%',
    alignItems: 'center',
    paddingVertical: 3,
    gap: 2,
  },
  calCellCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellCircleActive: {
    backgroundColor: colors.cream,
  },
  calCellCircleToday: {
    borderWidth: 1,
    borderColor: 'rgba(222,219,200,0.35)',
  },
  calDayText: {
    fontFamily: font.sans,
    fontSize: 13,
    color: colors.cream70,
  },
  calDayTextActive: {
    fontFamily: font.sansBold,
    color: colors.black,
  },
  calDotRow: {
    flexDirection: 'row',
    gap: 3,
    height: 4,
  },
  calDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.green,
  },
  calDotRed: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },
  calDotActive: {
    backgroundColor: colors.black,
  },
  calDotEmpty: {
    width: 4,
    height: 4,
  },
});
