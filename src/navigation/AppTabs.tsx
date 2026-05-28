import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from './types';

import HomeScreen from '../screens/HomeScreen';
import MyTeamScreen from '../screens/MyTeamScreen';
import MatchScheduleScreen from '../screens/MatchScheduleScreen';
import InboxScreen from '../screens/InboxScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();

// Brand colors
const PRIMARY = '#F21D2F';
const INACTIVE = '#9E9E9E';

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MyTeam" component={MyTeamScreen} />
      <Tab.Screen name="MatchSchedule" component={MatchScheduleScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
