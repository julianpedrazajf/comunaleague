import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from './types';

import AuthStack from './AuthStack';
import AppTabs from './AppTabs';
import JoinTeamScreen from '../screens/JoinTeamScreen';
import CreateTeamScreen from '../screens/CreateTeamScreen';
import OneGameScreen from '../screens/OneGameScreen';

const Root = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) return null;

  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        <>
          <Root.Screen name="AppTabs" component={AppTabs} />
          <Root.Screen name="JoinTeam" component={JoinTeamScreen} options={{ presentation: 'modal' }} />
          <Root.Screen name="CreateTeam" component={CreateTeamScreen} options={{ presentation: 'modal' }} />
          <Root.Screen name="OneGame" component={OneGameScreen} options={{ presentation: 'modal' }} />
        </>
      ) : (
        <Root.Screen name="AppTabs" component={AuthStack} />
      )}
    </Root.Navigator>
  );
}
