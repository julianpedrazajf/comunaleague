import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Calendar, Shield, User } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, font } from '../theme/tokens';

const TABS = [
  { route: 'Home',          Icon: Home,     label: 'Inicio' },
  { route: 'MatchSchedule', Icon: Calendar, label: 'Partidos' },
  { route: 'MyTeam',        Icon: Shield,   label: 'Equipo' },
  { route: 'Profile',       Icon: User,     label: 'Perfil' },
] as const;

export default function BottomActionBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const currentRoute = state.routes[state.index]?.name;

  return (
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom, 16) + 8 }]} pointerEvents="box-none">
      <View style={styles.pill}>
        {TABS.map(({ route, Icon, label }) => {
          const active = currentRoute === route;
          const iconColor = active ? colors.cream : colors.cream45;

          return (
            <TouchableOpacity
              key={route}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => navigation.navigate(route as never)}
              activeOpacity={0.75}
            >
              <Icon size={20} color={iconColor} strokeWidth={2} />
              <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10,10,10,0.88)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(222,219,200,0.10)',
    padding: 6,
    gap: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
    }),
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 3,
  },
  tabActive: { backgroundColor: 'rgba(222,219,200,0.10)' },
  label: { fontFamily: font.sansBold, fontSize: 9.5, color: colors.cream45 },
  labelActive: { color: colors.cream },
});
