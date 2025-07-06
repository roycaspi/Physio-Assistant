import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import './firebase';
import LoginScreen from './LoginScreen';
import MainNavigator from './MainNavigator';
import { ActivityIndicator, View, I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import * as Font from 'expo-font';

// Force RTL globally before anything else
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
  // A full reload of the app is required for this to take effect
}

export default function RootLayout() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading, null = not logged in
  const [fontLoaded, setFontLoaded] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => setUser(firebaseUser));
    // Load custom font
    Font.loadAsync({
      'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
    }).then(() => setFontLoaded(true));
    return unsubscribe;
  }, []);

  if (user === undefined || !fontLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <PaperProvider>
      <NavigationContainer>
        {user ? <MainNavigator /> : <LoginScreen />}
      </NavigationContainer>
    </PaperProvider>
  );
} 