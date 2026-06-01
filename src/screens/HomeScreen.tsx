import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
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

const LARGE_TITLE_THRESHOLD = 52;

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const [players, setPlayers] = useState<FeaturedPlayer[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getFeaturedPlayers().then(setPlayers).catch(() => {});
  }, []);

  const smallTitleOpacity = scrollY.interpolate({
    inputRange: [LARGE_TITLE_THRESHOLD - 12, LARGE_TITLE_THRESHOLD + 12],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const largeTitleOpacity = scrollY.interpolate({
    inputRange: [0, LARGE_TITLE_THRESHOLD],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const largeTitleTranslateY = scrollY.interpolate({
    inputRange: [0, LARGE_TITLE_THRESHOLD],
    outputRange: [0, -14],
    extrapolate: 'clamp',
  });

  const categoryTabs = [
    { key: 'MyTeam' as const, label: t('home.myTeam') },
    { key: 'MatchSchedule' as const, label: t('match.schedule') },
    { key: 'Inbox' as const, label: t('inbox.title') },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Fixed nav bar — small title fades in on scroll */}
      <View style={styles.navBar}>
        <View style={styles.navSpacer} />
        <Animated.Text style={[styles.navTitle, { opacity: smallTitleOpacity }]}>
          Comuna League
        </Animated.Text>
        <View style={styles.navRight}>
          <TouchableOpacity hitSlop={12}>
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Large title */}
        <Animated.View
          style={{
            opacity: largeTitleOpacity,
            transform: [{ translateY: largeTitleTranslateY }],
          }}
        >
          <Text style={styles.largeTitle}>Comuna{'\n'}League</Text>
        </Animated.View>

        {/* Horizontal category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          style={styles.tabsWrapper}
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

        {/* Statistics */}
        <Text style={styles.sectionTitle}>{t('home.statistics')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {STATS_CARDS.map((card) => (
            <TouchableOpacity key={card.key} style={styles.statsCard} activeOpacity={0.82}>
              <View style={[styles.statsCardImage, { backgroundColor: card.color }]}>
                <Text style={styles.statsCardIcon}>{card.icon}</Text>
              </View>
              <Text style={styles.statsCardLabel}>{t(`home.${card.key}`)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Players */}
        {players.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('home.featuredPlayers')}</Text>
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
          </>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const card_shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.11,
  shadowRadius: 12,
  elevation: 4,
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  // Fixed nav bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  navSpacer: { width: 32 },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: 0.1,
  },
  navRight: { width: 32, alignItems: 'flex-end' },
  bellIcon: { fontSize: 20 },

  // Scrollable content
  content: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xl },

  // Large title
  largeTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.black,
    letterSpacing: -1,
    lineHeight: 44,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
    textAlign: 'center',
  },

  // Category tabs
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  tabsContent: { gap: spacing.lg, paddingBottom: spacing.sm, justifyContent: 'center', flexGrow: 1 },
  tab: { paddingBottom: spacing.sm, paddingTop: spacing.xs, alignItems: 'center' },
  tabText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.black },
  tabUnderline: { height: 2, backgroundColor: colors.black, marginTop: spacing.xs, borderRadius: 1 },

  // Section titles
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.black,
    letterSpacing: -0.3,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // Horizontal rows
  horizontalList: { gap: spacing.md, paddingBottom: spacing.lg, paddingRight: spacing.sm, justifyContent: 'center', flexGrow: 1 },

  // Stats cards
  statsCard: { width: 165, marginBottom: spacing.xs },
  statsCardImage: {
    width: 165,
    height: 135,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...card_shadow,
  },
  statsCardIcon: { fontSize: 44 },
  statsCardLabel: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.black },

  // Player cards
  playerCard: {
    width: 110,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...card_shadow,
  },
  playerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  playerInitials: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.white },
  playerName: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.black,
    textAlign: 'center',
  },
  playerPosition: {
    fontSize: fontSizes.xs,
    color: colors.gray,
    textAlign: 'center',
  },
});
