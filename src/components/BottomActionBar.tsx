import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, fontSizes } from '../utils/theme';

export default function BottomActionBar({ navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  const actions = [
    { label: t('home.playSolo'), onPress: () => rootNav?.navigate('OneGame') },
    { label: t('home.joinTeam'), onPress: () => rootNav?.navigate('JoinTeam') },
    { label: t('home.createTeam'), onPress: () => rootNav?.navigate('CreateTeam') },
    { label: t('home.profile'), onPress: () => navigation.navigate('Profile' as never) },
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.sm }]}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.label}
          style={styles.btn}
          onPress={action.onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText} numberOfLines={1}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
});
