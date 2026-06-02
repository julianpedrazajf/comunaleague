import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bell, Zap, Users, Plus } from 'lucide-react-native';
import SoccerBallIcon from '../components/ui/SoccerBallIcon';
import { AppTabParamList, RootStackParamList } from '../navigation/types';
import { getDailyTournaments } from '../services/tournaments';
import { Tournament } from '../types';
import { useAuth } from '../context/AuthContext';
import SectionHeader from '../components/ui/SectionHeader';
import Monogram from '../components/ui/Monogram';
import TournamentCard from '../components/ui/TournamentCard';
import CreamButton from '../components/ui/CreamButton';
import { colors, font, space, radius } from '../theme/tokens';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { session } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const firstName = session?.user?.user_metadata?.name ?? 'Jugador';

  useEffect(() => {
    getDailyTournaments().then(setTournaments).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <View style={styles.wordmarkWrap}>
          <View style={styles.leagueRow}>
            <Text style={styles.wordmarkTitle}>{'Comuna'}</Text>
          </View>
          <View style={styles.leagueRow}>
            <Text style={styles.wordmarkTitle}>{'League'}</Text>
            <SoccerBallIcon size={16} color={colors.cream2} />
          </View>
          <Text style={styles.wordmarkTagline}>pibes de barrio.</Text>
        </View>
        <TouchableOpacity hitSlop={12} style={styles.bellWrap}>
          <Bell size={20} color={colors.cream45} strokeWidth={2} />
          <View style={styles.bellDot} />
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        {([
          { Icon: Zap,   labelKey: 'home.playSolo',   route: 'OneGame'    },
          { Icon: Users, labelKey: 'home.joinTeam',   route: 'JoinTeam'   },
          { Icon: Plus,  labelKey: 'home.createTeam', route: 'CreateTeam' },
        ] as const).map(({ Icon, labelKey, route }) => (
          <TouchableOpacity
            key={route}
            style={styles.quickBtn}
            onPress={() => navigation.navigate(route as never)}
            activeOpacity={0.75}
          >
            <Icon size={18} color={colors.cream} strokeWidth={2} />
            <Text style={styles.quickBtnLabel}>{t(labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Next match card */}
        <View style={styles.nextMatchCard}>
          <Text style={styles.nextMatchEyebrow}>{t('home.nextMatch').toUpperCase()}</Text>
          <View style={styles.teamsRow}>
            <View style={styles.teamCol}>
              <Monogram name="Mi" lastName="Equipo" size={52} />
              <Text style={styles.teamName}>{t('home.myTeam')}</Text>
            </View>
            <Text style={styles.vsText}>vs</Text>
            <View style={styles.teamCol}>
              <Monogram name="Ri" lastName="val" size={52} />
              <Text style={styles.teamName}>{t('match.opponent')}</Text>
            </View>
          </View>
          <View style={styles.matchMeta}>
            <Text style={styles.matchMetaText}>{t('home.nextMatchMeta')}</Text>
          </View>
          <CreamButton
            label={t('home.confirmAttendance')}
            full
            onPress={() => navigation.navigate('MatchSchedule')}
          />
        </View>

        {/* Torneos abiertos */}
        {tournaments.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label={t('home.openTournaments')} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            >
              {tournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  name={tournament.name}
                  format={tournament.format === 5 ? 'Fútbol 5' : 'Fútbol 11'}
                  location={tournament.location}
                  price={tournament.price}
                  onRegister={() => navigation.navigate('OneGame')}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Spacer for floating tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: space.md,
  },
  wordmarkWrap: { gap: -2 },
  leagueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  wordmarkTitle: {
    fontFamily: font.sansXBold,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -1.2,
    color: colors.cream,
  },
  wordmarkTagline: {
    fontFamily: font.serifItalic,
    fontSize: 12,
    color: colors.cream45,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  bellWrap: { position: 'relative' },
  bellDot: {
    position: 'absolute',
    top: -1, right: -1,
    width: 7, height: 7,
    borderRadius: 999,
    backgroundColor: colors.green,
  },

  content: { paddingHorizontal: 18, paddingTop: space.sm, flexGrow: 1, justifyContent: 'center' },

  nextMatchCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
    marginBottom: space.xl,
    alignItems: 'center',
  },
  nextMatchEyebrow: {
    fontFamily: font.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.cream45,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.sm,
    alignSelf: 'stretch',
  },
  teamCol: { alignItems: 'center', gap: space.xs, flex: 1 },
  teamName: { fontFamily: font.sansBold, fontSize: 12, color: colors.cream70, textAlign: 'center' },
  vsText: { fontFamily: font.serifItalic, fontSize: 22, color: colors.cream45, textAlign: 'center' },
  matchMeta: { alignItems: 'center', alignSelf: 'stretch' },
  matchMetaText: { fontFamily: font.sans, fontSize: 12.5, color: colors.cream45 },

  section: { marginBottom: space.xl },
  hList: { gap: space.md, paddingRight: 18 },

  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    paddingVertical: space.md,
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 1,
    borderColor: 'rgba(222,219,200,0.08)',
  },
  quickBtnLabel: {
    fontFamily: font.sansBold,
    fontSize: 10.5,
    color: colors.cream70,
    textAlign: 'center',
  },
});
