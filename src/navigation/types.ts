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

// Modal / nested stacks reachable from tabs
export type RootStackParamList = {
  Auth: undefined;        // unauthenticated branch (AuthStack)
  ProfileSetup: undefined;
  AppTabs: undefined;
  JoinTeam: undefined;
  CreateTeam: undefined;
  OneGame: undefined;
  Chat: { peerId: string; peerName: string };
  Language: undefined;
  Notifications: undefined;
  Preferences: undefined;
};

export type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;
export type AppTabNavProp = BottomTabNavigationProp<AppTabParamList>;
