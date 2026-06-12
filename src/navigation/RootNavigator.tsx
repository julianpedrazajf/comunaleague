import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { MessagesProvider } from '../context/MessagesContext';
import { RootStackParamList } from './types';

import AuthStack from './AuthStack';
import AppTabs from './AppTabs';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import JoinTeamScreen from '../screens/JoinTeamScreen';
import CreateTeamScreen from '../screens/CreateTeamScreen';
import OneGameScreen from '../screens/OneGameScreen';
import ChatScreen from '../screens/ChatScreen';
import LanguageScreen from '../screens/LanguageScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import PaymentScreen from '../screens/PaymentScreen';
import DailyMatchPlayersScreen from '../screens/DailyMatchPlayersScreen';

const Root = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, loading, profileComplete } = useAuth();

  if (loading) return null;

  const navigator = (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        <>
          {!profileComplete && (
            <Root.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          )}
          <Root.Screen name="AppTabs" component={AppTabs} />
          <Root.Screen name="JoinTeam" component={JoinTeamScreen} options={{ presentation: 'modal' }} />
          <Root.Screen name="CreateTeam" component={CreateTeamScreen} options={{ presentation: 'modal' }} />
          <Root.Screen name="OneGame" component={OneGameScreen} options={{ presentation: 'modal' }} />
          <Root.Screen name="Chat" component={ChatScreen} />
          <Root.Screen name="Language" component={LanguageScreen} options={{ presentation: 'modal' }} />
          <Root.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'modal' }} />
          <Root.Screen name="Preferences" component={PreferencesScreen} options={{ presentation: 'modal' }} />
          <Root.Screen name="Payment" component={PaymentScreen} options={{ presentation: 'modal', gestureEnabled: false }} />
          <Root.Screen name="DailyMatchPlayers" component={DailyMatchPlayersScreen} options={{ presentation: 'modal' }} />
        </>
      ) : (
        // Different name ("Auth") so React Navigation doesn't confuse it with the authenticated "AppTabs" screen
        <Root.Screen name="Auth" component={AuthStack} />
      )}
    </Root.Navigator>
  );

  return session ? <MessagesProvider>{navigator}</MessagesProvider> : navigator;
}
