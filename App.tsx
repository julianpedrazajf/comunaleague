import './src/services/i18n';
import './src/utils/webAlert';
import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Almarai_300Light,
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
} from '@expo-google-fonts/almarai';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import WebFrame from './src/components/WebFrame';

export default function App() {
  const [fontsLoaded] = useFonts({
    Almarai_300Light,
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
    InstrumentSerif_400Regular_Italic,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <WebFrame>
            <NavigationContainer>
              <RootNavigator />
              <StatusBar style="light" />
            </NavigationContainer>
          </WebFrame>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
