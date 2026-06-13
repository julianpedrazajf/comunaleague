import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { X, Check, CreditCard } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { createTeam, requestJoinTeam } from '../services/teams';
import { registerForDaily } from '../services/tournaments';
import { expressInterest } from '../services/playerRequests';
import { RootStackParamList } from '../navigation/types';
import { formatCOP } from '../utils/prices';
import CreamButton from '../components/ui/CreamButton';
import { colors, font, space, radius } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

export default function PaymentScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { kind, amount, title, payload } = route.params;

  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);

  const conceptLabel =
    kind === 'create_team' ? t('payment.conceptCreateTeam')
    : kind === 'join_team' ? t('payment.conceptJoinTeam')
    : kind === 'daily_match' ? t('payment.conceptDailyMatch')
    : t('payment.conceptOneMatch');

  const successMessage =
    kind === 'create_team' ? t('payment.successCreateTeam')
    : kind === 'join_team' ? t('payment.successJoinTeam')
    : kind === 'daily_match' ? t('payment.successDailyMatch')
    : t('payment.successOneMatch');

  const executeAction = async () => {
    if (kind === 'create_team') {
      if (!session || !payload.name || !payload.format) throw new Error(t('common.error'));
      await createTeam(payload.name, payload.format, session.user.id);
    } else if (kind === 'join_team') {
      if (!payload.teamId) throw new Error(t('common.error'));
      await requestJoinTeam(payload.teamId);
    } else if (kind === 'daily_match') {
      if (!payload.tournamentId) throw new Error(t('common.error'));
      await registerForDaily(payload.tournamentId);
    } else {
      if (!payload.requestId) throw new Error(t('common.error'));
      await expressInterest(payload.requestId);
    }
  };

  const handlePay = async () => {
    setProcessing(true);
    try {
      // Simulated payment — replace with MercadoPago when credentials are ready
      await new Promise((resolve) => setTimeout(resolve, 1400));
      await executeAction();
      setPaid(true);
    } catch (e: any) {
      Alert.alert(t('payment.failed'), e?.message ?? t('common.error'));
    } finally {
      setProcessing(false);
    }
  };

  const handleDone = () => {
    if (kind === 'create_team') {
      navigation.navigate('AppTabs');
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('payment.title')}</Text>
          <Text style={styles.subtitle}>{t('payment.subtitle')}</Text>
        </View>
        {!paid && (
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={12}>
            <X size={20} color={colors.cream45} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {paid ? (
          <View style={styles.successWrap}>
            <View style={styles.successCircle}>
              <Check size={34} color={colors.black} strokeWidth={2.5} />
            </View>
            <Text style={styles.successTitle}>{t('payment.success')}</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <View style={styles.doneBtnWrap}>
              <CreamButton label={t('common.done')} full done onPress={handleDone} />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <CreditCard size={16} color={colors.cream45} strokeWidth={2} />
                <Text style={styles.summaryEyebrow}>{conceptLabel.toUpperCase()}</Text>
              </View>
              <Text style={styles.summaryTitle}>{title}</Text>
              <View style={styles.hairline} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('payment.total')}</Text>
                <Text style={styles.totalPrice}>{formatCOP(amount)}</Text>
              </View>
            </View>

            <CreamButton
              label={processing ? t('payment.processing') : `${t('payment.payNow')} ${formatCOP(amount)}`}
              full
              loading={processing}
              onPress={handlePay}
            />
          </>
        )}
      </View>
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
  headerText: { gap: 4 },
  title: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },
  subtitle: { fontFamily: font.sans, fontSize: 13, color: colors.cream70 },
  closeBtn: { padding: 4, marginTop: 4 },

  content: { flex: 1, paddingHorizontal: 18, gap: space.lg },

  summaryCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  summaryEyebrow: {
    fontFamily: font.sansBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.cream45,
  },
  summaryTitle: { fontFamily: font.sansBold, fontSize: 18, color: colors.cream, lineHeight: 24 },
  hairline: { height: 1, backgroundColor: colors.hairline },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: font.sans, fontSize: 14, color: colors.cream70 },
  totalPrice: { fontFamily: font.serifItalic, fontSize: 26, color: colors.cream },

  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingBottom: 80 },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  successTitle: { fontFamily: font.sansXBold, fontSize: 22, color: colors.cream },
  successMessage: {
    fontFamily: font.sans,
    fontSize: 14,
    color: colors.cream70,
    textAlign: 'center',
    paddingHorizontal: space.lg,
    lineHeight: 20,
  },
  doneBtnWrap: { alignSelf: 'stretch', marginTop: space.lg },
});
