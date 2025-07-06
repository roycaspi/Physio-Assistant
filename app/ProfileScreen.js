import './firebase';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Appbar, Avatar, Button, Text, Card } from 'react-native-paper';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(getAuth());
    } catch (error) {
      console.error('❌ Error signing out:', error);
    }
  };

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>לא מחובר</Text>
      </View>
    );
  }

  return (
    <>
      <Appbar.Header>
        <Appbar.Content
          title="פרופיל"
          titleStyle={{
            fontFamily: 'SpaceMono',
            textAlign: 'center',
            fontSize: 28,
            fontWeight: 'bold',
            color: '#7F7FD5',
            textShadowColor: '#86A8E7',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 8,
            letterSpacing: 1.5,
          }}
        />
      </Appbar.Header>
      <View style={{ flex: 1, alignItems: 'center', padding: 32 }}>
        <Avatar.Text size={80} label={user.displayName ? user.displayName[0] : user.email[0]} style={{ marginBottom: 16 }} />
        <Card style={{ width: '100%', marginBottom: 24 }}>
          <Card.Content>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
              {user.displayName || 'משתמש ללא שם'}
            </Text>
            <Text style={{ fontSize: 16, color: '#7f8c8d', textAlign: 'center' }}>{user.email}</Text>
          </Card.Content>
        </Card>
        <Button mode="contained" onPress={handleSignOut} style={{ marginTop: 16, backgroundColor: '#e74c3c' }}>
          התנתק
        </Button>
      </View>
    </>
  );
} 