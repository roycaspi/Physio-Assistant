import * as Font from 'expo-font';
import { Slot } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, I18nManager, Text, View } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';

// Force RTL globally before anything else
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
  // A full reload of the app is required for this to take effect
}

export default function RootLayout() {
  const [fontLoaded, setFontLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let didCancel = false;
    console.log("Loading font...");
    Font.loadAsync({
      'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
    })
      .then(() => { 
        console.log("Font loaded!");
        if (!didCancel) setFontLoaded(true); 
      })
      .catch((err) => { 
        console.log("Font load error:", err);
        if (!didCancel) setError('שגיאת טעינת גופן: ' + err.message); 
      });
    return () => { didCancel = true; };
  }, []);

  if (error) {
    return (
      <Text style={{ color: 'red', fontSize: 20, textAlign: 'center' }}>{error}</Text>
    );
  }
  if (!fontLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <PaperProvider>
      <Slot />
    </PaperProvider>
  );
} 