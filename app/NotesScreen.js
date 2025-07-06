import './firebase';
import React, { useState, useEffect } from 'react';
import { View, FlatList } from 'react-native';
import { Appbar, Card, Avatar, Searchbar, ActivityIndicator, Text } from 'react-native-paper';
import { getFirestore, doc, collection, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export default function NotesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const db = getFirestore();
      const userEmail = user.email?.replace(/[.@]/g, '_') || 'unknown';
      const userDocRef = doc(db, 'users', user.uid);
      const userCollection = collection(userDocRef, userEmail);
      const patientsSnapshot = await getDocs(userCollection);
      const allNotes = [];
      for (const patientDoc of patientsSnapshot.docs) {
        const patientData = patientDoc.data();
        const meetingsCollection = collection(patientDoc.ref, 'meetings');
        const meetingsSnapshot = await getDocs(meetingsCollection);
        meetingsSnapshot.forEach(meeting => {
          const meetingData = meeting.data();
          allNotes.push({
            id: meeting.id,
            patient: patientData.name || patientDoc.id,
            transcript: meetingData.transcript,
            timestamp: meetingData.timestamp?.toDate?.() || new Date(0),
          });
        });
      }
      // Sort notes by timestamp (newest first)
      allNotes.sort((a, b) => b.timestamp - a.timestamp);
      setNotes(allNotes);
    } catch (error) {
      console.error('❌ Error fetching notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNotes = notes.filter(n =>
    n.patient.includes(searchQuery) ||
    (n.transcript && n.transcript.includes(searchQuery))
  );

  return (
    <>
      <Appbar.Header>
        <Appbar.Content
          title="כל ההערות"
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
      <Searchbar
        placeholder="חפש לפי מטופל או טקסט..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={{ margin: 16 }}
      />
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={filteredNotes}
          keyExtractor={n => n.id}
          renderItem={({ item }) => (
            <Card style={{ margin: 8 }}>
              <Card.Title
                title={item.patient}
                subtitle={item.timestamp ? item.timestamp.toLocaleString('he-IL') : 'תאריך לא ידוע'}
                left={props => <Avatar.Text {...props} label={item.patient[0]} />}
              />
              <Card.Content>
                <Text style={{ fontSize: 16, textAlign: 'right' }}>{item.transcript}</Text>
              </Card.Content>
            </Card>
          )}
        />
      )}
    </>
  );
} 