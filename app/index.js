import { getAuth, onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import LoginScreen from './LoginScreen';
import MainNavigator from './MainNavigator';

export default function Index() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = not logged in

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  if (user === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return user ? <MainNavigator /> : <LoginScreen />;
} 