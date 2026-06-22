import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { useAuth } from '../context/AuthContext';

import SplashScreen from '../screens/SplashScreen';
import GuestHomeScreen from '../screens/GuestHomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  const { authIntent } = useAuth();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={authIntent === 'register' ? 'Register' : 'Splash'}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="GuestHome" component={GuestHomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
