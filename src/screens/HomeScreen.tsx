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
import { Bell } from 'lucide-react-native';
import { AppTabParamList, RootStackParamList } from '../navigation/types';
import { getFeaturedPlayers, FeaturedPlayer } from '../services/users';
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
  const [players, setPlayers] = useState<FeaturedPlayer[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const firstName = session?.user?.user_metadata?.name ?? 'Jugador';

  useEffect(() => {
    getFeaturedPlayers().then(setPlayers).catch(() => {});
    getDailyTournaments().then(setTournaments).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <Text style={styles.greeting}>{t('home.greeting', { name: firstName })}</Text>
        <TouchableOpacity hitSlop={12} style={styles.bellWrap}>
          <Bell size={20} color={colors.cream45} strokeWidth={2} />
          <View style={styles.bellDot} />
        </TouchableOpacity>
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
              <Text style={styles.teamName}>Mi equipo</Text>
            </View>
            <Text style={styles.vsText}>vs</Text>
            <View style={styles.teamCol}>
              <Monogram name="Ri" lastName="val" size={52} />
              <Text style={styles.teamName}>Rival</Text>
            </View>
          </View>
          <View style={styles.matchMeta}>
            <Text style={styles.matchMetaText}>Domingo · 9:00 am · Cancha Norte</Text>
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

        {/* Jugadores destacados */}
        {players.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label={t('home.featured')} />
            <View style={styles.playerGrid}>
              {players.slice(0, 6).map((p) => (
                <View key={p.id} style={styles.playerChip}>
                  <Monogram name={p.name} lastName={p.lastName} size={38} />
                  <Text style={styles.playerName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.playerPos} numberOfLines={1}>
                    {t(`positions.${p.position}`)}
                  </Text>
                </View>
              ))}
            </View>
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
  greeting: { fontFamily: font.sansXBold, fontSize: 27, letterSpacing: -0.5, color: colors.cream },
  bellWrap: { position: 'relative' },
  bellDot: {
    position: 'absolute',
    top: -1, right: -1,
    width: 7, height: 7,
    borderRadius: 999,
    backgroundColor: colors.green,
  },

  content: { paddingHorizontal: 18, paddingTop: space.sm },

  nextMatchCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
    marginBottom: space.xl,
  },
  nextMatchEyebrow: {
    fontFamily: font.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.cream45,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.sm,
  },
  teamCol: { alignItems: 'center', gap: space.xs, flex: 1 },
  teamName: { fontFamily: font.sansBold, fontSize: 12, color: colors.cream70, textAlign: 'center' },
  vsText: { fontFamily: font.serifItalic, fontSize: 22, color: colors.cream45, textAlign: 'center' },
  matchMeta: { alignItems: 'center' },
  matchMetaText: { fontFamily: font.sans, fontSize: 12.5, color: colors.cream45 },

  section: { marginBottom: space.xl },
  hList: { gap: space.md, paddingRight: 18 },

  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  playerChip: {
    width: '30%',
    backgroundColor: colors.surface1,
    borderRadius: radius.cardSm,
    padding: space.md,
    alignItems: 'center',
    gap: space.xs,
  },
  playerName: { fontFamily: font.sansBold, fontSize: 11, color: colors.cream, textAlign: 'center' },
  playerPos: { fontFamily: font.sans, fontSize: 10, color: colors.gray500, textAlign: 'center' },
});
