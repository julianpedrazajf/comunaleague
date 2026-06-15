import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Auth stack
export type AuthStackParamList = {
  Splash: undefined;
  GuestHome: undefined;
  Login: undefined;
  Register: undefined;
};

// Authenticated tab bar
export type AppTabParamList = {
  Home: undefined;
  MyTeam: undefined;
  MatchSchedule: undefined;
  Inbox: undefined;
  Profile: undefined;
};

export type PaymentKind = 'buy_coins';

export type PaymentParams = {
  kind: PaymentKind;
  amount: number;
  title: string;
  payload: {
    coins?: number;
  };
};

// Modal / nested stacks reachable from tabs
export type RootStackParamList = {
  Auth: undefined;        // unauthenticated branch (AuthStack)
  ProfileSetup: undefined;
  AppTabs: undefined;
  JoinTeam: undefined;
  CreateTeam: undefined;
  OneGame: undefined;
  Tournaments: undefined;
  Chat: { peerId: string; peerName: string };
  Language: undefined;
  Notifications: undefined;
  Preferences: undefined;
  Payment: PaymentParams;
  BuyCoins: undefined;
  DailyMatchPlayers: {
    tournamentName: string;
    tournamentId?: string;  // daily match: list registered players
    requestId?: string;     // player request: team roster + accepted guests
    matchId?: string;       // guest match in My Matches: same list via match id
  };
  UserProfile: { userId: string };
};

export type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;
export type AppTabNavProp = BottomTabNavigationProp<AppTabParamList>;
