import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Auth stack
export type AuthStackParamList = {
  Splash: undefined;
  GuestHome: undefined;
  Login: undefined;
  Register: undefined;
  ProfileSetup: undefined;
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
  AppTabs: undefined;
  JoinTeam: undefined;
  CreateTeam: undefined;
  OneGame: undefined;
};

export type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;
export type AppTabNavProp = BottomTabNavigationProp<AppTabParamList>;
