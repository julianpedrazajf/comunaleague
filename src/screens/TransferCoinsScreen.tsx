import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { X, Check } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getMyTeam, getTeamMembers } from '../services/teams';
import { getMyCoins, transferCoins } from '../services/wallet';
import { User } from '../types';
import { RootStackParamList } from '../navigation/types';
import { isInsufficientCoinsError, showInsufficientCoins } from '../utils/coins';
import CoinIcon from '../components/ui/CoinIcon';
import Monogram from '../components/ui/Monogram';
import CreamButton from '../components/ui/CreamButton';
import { colors, font, space, radius } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'TransferCoins'>;
type Member = Pick<User, 'id' | 'name' | 'lastName' | 'position' | 'avatarUrl'>;

export default function TransferCoinsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();

  const [members, setMembers] = useState<Member[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const team = await getMyTeam(session.user.id);
      const [m, bal] = await Promise.all([
        team ? getTeamMembers(team.playerIds) : Promise.resolve([]),
        getMyCoins(),
      ]);
      setMembers(m.filter((x) => x.id !== session.user.id));
      setBalance(bal);
    } catch {
      // best-effort; the send call validates server-side anyway
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const amountNum = parseInt(amount, 10);
  const validAmount = Number.isFinite(amountNum) && amountNum > 0;
  const overBalance = validAmount && balance != null && amountNum > balance;
  const canSend = !!selectedId && validAmount && !overBalance && !submitting;

  const handleSend = () => {
    if (!canSend || !selectedId) return;
    const recipient = members.find((m) => m.id === selectedId);
    const name = recipient ? `${recipient.name} ${recipient.lastName}` : '';
    Alert.alert(
      t('team.transferCoinsConfirmTitle'),
      t('team.transferCoinsConfirmMessage', { amount: amountNum, name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('team.transferCoinsSend'),
          onPress: async () => {
            setSubmitting(true);
            try {
              await transferCoins(selectedId, amountNum);
              Alert.alert(
                t('team.transferCoinsDoneTitle'),
                t('team.transferCoinsDoneMessage', { amount: amountNum, name }),
                [{ text: t('common.done'), onPress: () => navigation.goBack() }],
              );
            } catch (e: any) {
              if (isInsufficientCoinsError(e)) {
                showInsufficientCoins(t, () => navigation.navigate('BuyCoins'));
              } else {
                Alert.alert(t('common.error'), e?.message ?? t('common.error'));
              }
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('team.transferCoins')}</Text>
          <Text style={styles.subtitle}>{t('team.transferCoinsSubtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <X size={20} color={colors.cream45} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cream45} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Balance */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceEyebrow}>{t('coins.balance').toUpperCase()}</Text>
              <View style={styles.balanceRow}>
                <CoinIcon size={26} />
                <Text style={styles.balanceValue}>{balance ?? '—'}</Text>
              </View>
            </View>

            {members.length === 0 ? (
              <Text style={styles.emptyText}>{t('team.transferCoinsNoTeammates')}</Text>
            ) : (
              <>
                {/* Recipient */}
                <Text style={styles.sectionLabel}>{t('team.transferCoinsTo').toUpperCase()}</Text>
                <View style={styles.memberList}>
                  {members.map((m, i) => {
                    const selected = selectedId === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.memberRow, i > 0 && styles.memberRowBorder]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedId(m.id)}
                      >
                        <Monogram name={`${m.name} ${m.lastName}`} size={38} imageUri={m.avatarUrl} />
                        <View style={styles.memberText}>
                          <Text style={styles.memberName} numberOfLines={1}>{m.name} {m.lastName}</Text>
                          <Text style={styles.memberPos}>{t(`positions.${m.position}`)}</Text>
                        </View>
                        <View style={[styles.radio, selected && styles.radioOn]}>
                          {selected && <Check size={14} color={colors.black} strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Amount */}
                <Text style={styles.sectionLabel}>{t('team.transferCoinsAmount').toUpperCase()}</Text>
                <View style={[styles.amountField, overBalance && styles.amountFieldError]}>
                  <CoinIcon size={22} />
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={colors.cream45}
                    selectionColor={colors.cream}
                    keyboardType="number-pad"
                    keyboardAppearance="dark"
                    maxLength={7}
                  />
                </View>
                {overBalance ? <Text style={styles.fieldError}>{t('team.transferCoinsOverBalance')}</Text> : null}

                <CreamButton
                  label={t('team.transferCoinsSend')}
                  full
                  loading={submitting}
                  disabled={!canSend}
                  onPress={handleSend}
                />
              </>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

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
  balanceEyebrow: { fontFamily: font.sansBold, fontSize: 10.5, letterSpacing: 1.5, color: colors.cream45 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  balanceValue: { fontFamily: font.sansXBold, fontSize: 36, color: colors.cream },

  emptyText: { fontFamily: font.sans, fontSize: 14, color: colors.cream45, textAlign: 'center', paddingVertical: space.xl },

  sectionLabel: {
    fontFamily: font.sansBold,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: colors.cream45,
    marginTop: space.sm,
    marginBottom: 2,
  },

  memberList: { backgroundColor: colors.surface1, borderRadius: radius.card, paddingHorizontal: space.lg },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  memberRowBorder: { borderTopWidth: 1, borderTopColor: colors.hairline },
  memberText: { flex: 1, gap: 2 },
  memberName: { fontFamily: font.sansBold, fontSize: 15, color: colors.cream },
  memberPos: { fontFamily: font.sans, fontSize: 12.5, color: colors.cream45 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.cream25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.cream2, borderColor: colors.cream2 },

  amountField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  amountFieldError: { borderColor: 'rgba(239,68,68,0.6)' },
  amountInput: { flex: 1, fontFamily: font.sansBold, fontSize: 20, color: colors.cream, padding: 0 },
  fieldError: { fontFamily: font.sans, fontSize: 11.5, color: '#EF4444' },
});
