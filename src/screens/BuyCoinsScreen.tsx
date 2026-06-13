import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { X, ChevronRight } from 'lucide-react-native';
import { getMyCoins } from '../services/wallet';
import { RootStackParamList } from '../navigation/types';
import { COIN_BUNDLES, formatCOP } from '../utils/prices';
import CoinIcon from '../components/ui/CoinIcon';
import { colors, font, space, radius } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'BuyCoins'>;

export default function BuyCoinsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [balance, setBalance] = useState<number | null>(null);

  const load = useCallback(() => {
    getMyCoins().then(setBalance).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('coins.title')}</Text>
          <Text style={styles.subtitle}>{t('coins.subtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <X size={20} color={colors.cream45} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceEyebrow}>{t('coins.balance').toUpperCase()}</Text>
          <View style={styles.balanceRow}>
            <CoinIcon size={28} />
            <Text style={styles.balanceValue}>{balance ?? '—'}</Text>
          </View>
        </View>

        {/* Bundles */}
        <Text style={styles.sectionLabel}>{t('coins.bundles').toUpperCase()}</Text>
        {COIN_BUNDLES.map((bundle) => (
          <TouchableOpacity
            key={bundle.coins}
            style={styles.bundleCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Payment', {
              kind: 'buy_coins',
              amount: bundle.price,
              title: t('coins.bundleTitle', { coins: bundle.coins }),
              payload: { coins: bundle.coins },
            })}
          >
            <CoinIcon size={34} />
            <View style={styles.bundleInfo}>
              <Text style={styles.bundleCoins}>{t('coins.bundleTitle', { coins: bundle.coins })}</Text>
              <Text style={styles.bundlePrice}>{formatCOP(bundle.price)}</Text>
            </View>
            <ChevronRight size={18} color={colors.cream45} strokeWidth={2} />
          </TouchableOpacity>
        ))}

        <Text style={styles.note}>{t('coins.note')}</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  headerText: { gap: 4, flex: 1, paddingRight: space.md },
  title: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },
  subtitle: { fontFamily: font.sans, fontSize: 13, color: colors.cream70 },
  closeBtn: { padding: 4, marginTop: 4 },

  content: { paddingHorizontal: 18, gap: space.md },

  balanceCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space.lg,
    alignItems: 'center',
    gap: space.sm,
  },
  balanceEyebrow: {
    fontFamily: font.sansBold,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: colors.cream45,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  balanceValue: { fontFamily: font.sansXBold, fontSize: 40, color: colors.cream },

  sectionLabel: {
    fontFamily: font.sansBold,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: colors.cream45,
    marginTop: space.sm,
    marginBottom: 2,
  },
  bundleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space.lg,
  },
  bundleInfo: { flex: 1, gap: 2 },
  bundleCoins: { fontFamily: font.sansBold, fontSize: 17, color: colors.cream },
  bundlePrice: { fontFamily: font.sans, fontSize: 13, color: colors.cream70 },

  note: {
    fontFamily: font.sans,
    fontSize: 12,
    color: colors.cream45,
    textAlign: 'center',
    marginTop: space.sm,
    paddingHorizontal: space.md,
    lineHeight: 17,
  },
});
