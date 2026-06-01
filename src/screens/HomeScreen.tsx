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
import { AppTabParamList, RootStackParamList } from '../navigation/types';
import { getFeaturedPlayers, FeaturedPlayer } from '../services/users';
import { colors, spacing, fontSizes } from '../utils/theme';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const STATS_CARDS = [
  { key: 'topScorers', color: colors.primary, icon: '⚽' },
  { key: 'rankings', color: colors.teal, icon: '🏆' },
  { key: 'recentResults', color: colors.orange, icon: '📊' },
] as const;

const AVATAR_COLORS = [colors.primary, colors.teal, colors.orange, colors.accent, '#7B68EE', '#20B2AA'];

function avatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const [players, setPlayers] = useState<FeaturedPlayer[]>([]);

  useEffect(() => {
    getFeaturedPlayers().then(setPlayers).catch(() => {});
  }, []);

  const categoryTabs = [
    { key: 'MyTeam' as const, label: t('home.myTeam') },
    { key: 'MatchSchedule' as const, label: t('match.schedule') },
    { key: 'Inbox' as const, label: t('inbox.title') },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* App header */}
      <View style={styles.appHeader}>
        <View style={styles.headerSpacer} />
        <Text style={styles.appTitle}>Comuna League</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity hitSlop={12}>
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal category tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {categoryTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => navigation.navigate(tab.key)}
            >
              <Text style={styles.tabText}>{tab.label}</Text>
              <View style={styles.tabUnderline} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main scrollable content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Statistics */}
        <Text style={styles.sectionTitle}>{t('home.statistics')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {STATS_CARDS.map((card) => (
            <TouchableOpacity key={card.key} style={styles.statsCard} activeOpacity={0.85}>
              <View style={[styles.statsCardImage, { backgroundColor: card.color }]}>
                <Text style={styles.statsCardIcon}>{card.icon}</Text>
              </View>
              <Text style={styles.statsCardLabel}>{t(`home.${card.key}`)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Players */}
        <Text style={styles.sectionTitle}>{t('home.featuredPlayers')}</Text>
        {players.length === 0 ? null : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {players.map((player, i) => (
              <View key={player.id} style={styles.playerCard}>
                <View style={[styles.playerAvatar, { backgroundColor: avatarColor(i) }]}>
                  <Text style={styles.playerInitials}>
                    {player.name[0]}{player.lastName[0]}
                  </Text>
                </View>
                <Text style={styles.playerName} numberOfLines={1}>
                  {player.name} {player.lastName}
                </Text>
                <Text style={styles.playerPosition} numberOfLines={1}>
                  {t(`positions.${player.position}`)}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  // Header
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerSpacer: { width: 32 },
  appTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.darkGray,
    letterSpacing: 0.3,
  },
  headerRight: { width: 32, alignItems: 'flex-end' },
  bellIcon: { fontSize: 20 },

  // Category tabs
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsContent: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  tab: { paddingBottom: spacing.sm, paddingTop: spacing.xs },
  tabText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.darkGray },
  tabUnderline: { height: 2, backgroundColor: colors.darkGray, marginTop: spacing.xs, borderRadius: 1 },

  // Main content
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.darkGray,
    marginBottom: spacing.xs,
  },

  // Horizontal scroll rows
  horizontalList: { gap: spacing.md, paddingBottom: spacing.xs },

  // Stats cards
  statsCard: { width: 170 },
  statsCardImage: {
    width: 170,
    height: 140,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statsCardIcon: { fontSize: 48 },
  statsCardLabel: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.darkGray },

  // Player cards
  playerCard: { width: 130, alignItems: 'center', gap: spacing.xs },
  playerAvatar: {
    width: 130,
    height: 150,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInitials: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.white },
  playerName: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.darkGray,
    textAlign: 'center',
  },
  playerPosition: {
    fontSize: fontSizes.xs,
    color: colors.gray,
    textAlign: 'center',
  },
});
