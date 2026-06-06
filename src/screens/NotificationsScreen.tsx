import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/types';
import { colors, font, space, radius } from '../theme/tokens';

const NOTIF_KEY = '@notifications';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export default function NotificationsScreen({ navigation: _ }: Props) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((val) => {
      if (val !== null) setEnabled(val === 'true');
    });
  }, []);

  const toggle = async (value: boolean) => {
    setEnabled(value);
    await AsyncStorage.setItem(NOTIF_KEY, value.toString());
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.handle} />
      <View style={styles.navBar}>
        <Text style={styles.pageTitle}>{t('notifications.title')}</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>{t('notifications.push')}</Text>
            <Text style={styles.rowDesc}>{t('notifications.pushDesc')}</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggle}
            trackColor={{ false: colors.surface2, true: colors.green }}
            thumbColor={colors.black}
            ios_backgroundColor={colors.surface2}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.hairline,
    alignSelf: 'center', marginTop: space.sm,
  },
  navBar: { paddingHorizontal: 18, paddingTop: space.md, paddingBottom: space.lg },
  pageTitle: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },
  card: {
    marginHorizontal: 18,
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    paddingHorizontal: space.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    gap: space.md,
  },
  rowBody: { flex: 1, gap: 4 },
  rowLabel: { fontFamily: font.sansBold, fontSize: 15, color: colors.cream },
  rowDesc: { fontFamily: font.sans, fontSize: 13, color: colors.cream70 },
});
