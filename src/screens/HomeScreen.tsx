import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, Zap, Users, Plus, Check } from 'lucide-react-native';
import SoccerBallIcon from '../components/ui/SoccerBallIcon';
import { AppTabParamList, RootStackParamList } from '../navigation/types';
import { getDailyTournaments } from '../services/tournaments';
import { getMyTeam } from '../services/teams';
import { getTeamMatches, confirmAttendance, MatchWithTeams } from '../services/matches';
import { Tournament, Team } from '../types';
import { useAuth } from '../context/AuthContext';
import SectionHeader from '../components/ui/SectionHeader';
import Monogram from '../components/ui/Monogram';
import TournamentCard from '../components/ui/TournamentCard';
import CreamButton from '../components/ui/CreamButton';
import { colors, font, space, radius } from '../theme/tokens';

const homeBg = require('../../assets/textures/Night_Pitch_Dew_Bokeh.png');
const grain   = require('../../assets/textures/grain.png');

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function formatMatchDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatMatchTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${minutes} ${ampm}`;
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { session } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [nextMatch, setNextMatch] = useState<MatchWithTeams | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const load = useCallback(async () => {
    getDailyTournaments().then(setTournaments).catch(() => {});
    if (!session) return;
    try {
      const team = await getMyTeam(session.user.id);
      setMyTeam(team);
      if (team) {
        const matches = await getTeamMatches(team.id);
        const next = matches[0] ?? null;
        setNextMatch(next);
        if (next) {
          const saved = await AsyncStorage.getItem(`@confirmed_${session.user.id}_${next.id}`);
          setConfirmed(saved === 'true');
        }
      }
    } catch { /* silently fail */ }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCreateTeam = () => {
    if (myTeam) {
      Alert.alert(t('team.alreadyMemberTitle'), t('team.cantCreateAlreadyMember'));
      return;
    }
    navigation.navigate('CreateTeam');
  };

  const handleConfirm = async () => {
    if (!nextMatch) return;
    if (confirmed) {
      const matchDateTime = new Date(`${nextMatch.date}T${nextMatch.time}`);
      const hoursUntilMatch = (matchDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilMatch <= 24) {
        Alert.alert(t('home.cancelLockTitle'), t('home.cancelLockMessage'));
        return;
      }
    }
    const next = !confirmed;
    setConfirmed(next);
    const storageKey = `@confirmed_${session!.user.id}_${nextMatch.id}`;
    await AsyncStorage.setItem(storageKey, next.toString());
    try {
      await confirmAttendance(nextMatch.id, next);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
      // Revert local state if DB sync failed
      setConfirmed(!next);
      await AsyncStorage.setItem(storageKey, (!next).toString());
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Background */}
      <ImageBackground source={homeBg} style={styles.bg} resizeMode="cover">
        <View style={styles.scrim} pointerEvents="none" />
        <View style={styles.grainWrap} pointerEvents="none">
          <Image source={grain} style={styles.grain} resizeMode="repeat" />
        </View>
      </ImageBackground>

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
            onPress={() => route === 'CreateTeam' ? handleCreateTeam() : navigation.navigate(route as never)}
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

          {nextMatch ? (
            <>
              <View style={styles.teamsRow}>
                <View style={styles.teamCol}>
                  <Monogram
                    name={nextMatch.homeTeam.name}
                    size={52}
                    shape="square"
                    imageUri={nextMatch.homeTeam.badgeUrl}
                  />
                  <Text style={styles.teamName} numberOfLines={2}>
                    {nextMatch.homeTeam.name}
                  </Text>
                </View>
                <Text style={styles.vsText}>vs</Text>
                <View style={styles.teamCol}>
                  <Monogram
                    name={nextMatch.awayTeam.name}
                    size={52}
                    shape="square"
                    imageUri={nextMatch.awayTeam.badgeUrl}
                  />
                  <Text style={styles.teamName} numberOfLines={2}>
                    {nextMatch.awayTeam.name}
                  </Text>
                </View>
              </View>

              <View style={styles.matchMeta}>
                <Text style={styles.matchMetaText}>
                  {formatMatchDate(nextMatch.date, i18n.language)} · {formatMatchTime(nextMatch.time)}
                </Text>
                {nextMatch.location ? (
                  <Text style={styles.matchMetaLocation}>{nextMatch.location}</Text>
                ) : null}
              </View>

              {confirmed ? (
                <TouchableOpacity style={styles.confirmedPill} onPress={handleConfirm} activeOpacity={0.8}>
                  <Check size={15} color={colors.black} strokeWidth={2.5} />
                  <Text style={styles.confirmedText}>{t('home.attendanceConfirmed')}</Text>
                </TouchableOpacity>
              ) : (
                <CreamButton label={t('home.confirmAttendance')} full onPress={handleConfirm} />
              )}
            </>
          ) : (
            <Text style={styles.noMatchText}>{t('match.noMatches')}</Text>
          )}
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

  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.68)' },
  grainWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  grain: { width: '100%', height: '100%', opacity: 0.07 },

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
  matchMeta: { alignItems: 'center', alignSelf: 'stretch', gap: 4 },
  matchMetaText: { fontFamily: font.sans, fontSize: 12.5, color: colors.cream45 },
  matchMetaLocation: { fontFamily: font.sans, fontSize: 11.5, color: colors.cream25 },
  noMatchText: { fontFamily: font.sans, fontSize: 14, color: colors.cream45, textAlign: 'center', paddingVertical: space.md },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignSelf: 'stretch',
    gap: space.sm,
  },
  confirmedText: { fontFamily: font.sansBold, fontSize: 15, color: colors.black },

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
