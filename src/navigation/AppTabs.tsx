import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from './types';
import BottomActionBar from '../components/BottomActionBar';

import HomeScreen from '../screens/HomeScreen';
import MyTeamScreen from '../screens/MyTeamScreen';
import MatchScheduleScreen from '../screens/MatchScheduleScreen';
import InboxScreen from '../screens/InboxScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomActionBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MyTeam" component={MyTeamScreen} />
      <Tab.Screen name="MatchSchedule" component={MatchScheduleScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
