import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Appbar, Button, Card, Dialog, FAB, Portal, Text } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import '../app/firebase';

export default function PatientNotesScreen({ route, navigation }) {
  const { patientId, patientName } = route.params;
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordedUris, setRecordedUris] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [recordingModalVisible, setRecordingModalVisible] = useState(false);
  const [playbackObj, setPlaybackObj] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [uploading, setUploading] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [action, setAction] = useState(''); // add, overwrite, append
  const [editTranscriptVisible, setEditTranscriptVisible] = useState(false);
  const [editTranscriptText, setEditTranscriptText] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [appendMode, setAppendMode] = useState(false);
  const [appendNoteId, setAppendNoteId] = useState(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState('');
  const [webviewTranscript, setWebviewTranscript] = useState('');
  const [baseTranscriptForAppend, setBaseTranscriptForAppend] = useState('');
  const [newTranscriptForAppend, setNewTranscriptForAppend] = useState('');
  const [webviewInitialValue, setWebviewInitialValue] = useState('');
  const [webviewInitialValueMain, setWebviewInitialValueMain] = useState('');
  const [pendingTranscript, setPendingTranscript] = useState('');
  const [editTranscriptTitle, setEditTranscriptTitle] = useState('עריכת תמלול');

  const soundRef = useRef(null);
  const webviewRef = useRef(null);
  const webviewEditRef = useRef(null);

  useEffect(() => {
    fetchNotes();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const userDocRef = doc(db, 'users', user.uid);
      const patientDocRef = doc(userDocRef, user.email.replace(/[.@]/g, '_'), patientId);
      const meetingsCollection = collection(patientDocRef, 'meetings');
      const meetingsSnapshot = await getDocs(meetingsCollection);
      const allNotes = meetingsSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          transcript: data.transcript,
          audioUrls: data.audioUrls || (data.audioUrl ? [data.audioUrl] : []),
          timestamp: data.timestamp?.toDate?.() || new Date(0),
        };
      });
      allNotes.sort((a, b) => b.timestamp - a.timestamp);
      setNotes(allNotes);
    } catch (error) {
      console.error('❌ Error fetching notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Recording logic
  const startRecording = async (mode = 'add', noteId = null) => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      setRecordingModalVisible(true);
      setAction(mode);
      setAppendNoteId(noteId);
    } catch (err) {
      alert('Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setRecordingModalVisible(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecordedUris(prev => [...prev, uri]);
    setModalVisible(true);
    setRecording(null);
  };

  const playAllRecordings = async () => {
    for (const uri of recordedUris) {
      if (!uri) continue;
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }
      const { sound } = await Audio.Sound.createAsync({ uri });
    soundRef.current = sound;
    await sound.playAsync();
      await new Promise(resolve => {
        sound.setOnPlaybackStatusUpdate(status => {
          if (status.didJustFinish) {
            sound.unloadAsync();
            resolve();
          }
        });
      });
    }
  };

  const uploadRecording = async () => {
    setUploading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const db = getFirestore();
      const userDocRef = doc(db, 'users', user.uid);
      const patientDocRef = doc(userDocRef, user.email.replace(/[.@]/g, '_'), patientId);
      const meetingsCollection = collection(patientDocRef, 'meetings');
      // Prevent saving if there is no transcript
      if (!transcript || !transcript.trim()) {
        alert('יש לתמלל את ההקלטה לפני שמירה.');
        setUploading(false);
        return;
      }
      if (action === 'add') {
        await addDoc(meetingsCollection, {
          transcript,
          timestamp: serverTimestamp(),
        });
        // Update notesCount after adding
        const meetingsSnapshot = await getDocs(meetingsCollection);
        const notesCount = meetingsSnapshot.docs.length;
        await updateDoc(patientDocRef, { notesCount });
      } else if (action === 'overwrite' && currentNoteId) {
        const noteDoc = doc(meetingsCollection, currentNoteId);
        await updateDoc(noteDoc, {
          transcript,
          timestamp: serverTimestamp(),
        });
      } else if (action === 'append' && appendNoteId) {
        // Just save the current transcript state directly
        const noteDoc = doc(meetingsCollection, appendNoteId);
        await updateDoc(noteDoc, {
          transcript,
          timestamp: serverTimestamp(),
        });
      }
      setRecordedUris([]);
      setModalVisible(false);
      setAppendMode(false);
      setAppendNoteId(null);
      fetchNotes();
    } catch (err) {
      alert('שגיאה בשמירת הערה: ' + (err.message || err));
    } finally {
      setUploading(false);
    }
  };

  const transcribeRecording = async () => {
    if (editTranscriptVisible) return;
    setTranscriptionStatus('מזהה דיבור...');
    try {
      // 1. Get audio as base64
      let uri = recordedUris.length > 0 ? recordedUris[recordedUris.length - 1] : null;
      if (!uri && notes.length > 0 && notes[0].audioUrls && notes[0].audioUrls[0]) {
        // fallback: use first note's first audio
        uri = notes[0].audioUrls[0];
      }
      if (!uri) {
        setTranscriptionStatus('לא נמצאה הקלטה לתמלול');
        return;
      }
      let fileData;
      if (uri.startsWith('http')) {
        // Download remote file to local cache, then read as base64
        const localUri = FileSystem.cacheDirectory + 'temp_audio.m4a';
        await FileSystem.downloadAsync(uri, localUri);
        fileData = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
      } else {
        // Local file
        fileData = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      }
      // 2. Try ivrit.ai
      setTranscriptionStatus('מתמלל...');
      try {
        const res = await fetch('https://physio-assistant.onrender.com/transcribe_ivritai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileData }),
        });
        const data = await res.json();
        if (res.ok && data.transcription && data.transcription.trim()) {
          setTranscriptionStatus('');
          if (appendMode) {
            const newTranscript = data.transcription.trim();
            const fullTranscript = (baseTranscriptForAppend && baseTranscriptForAppend.trim() ? baseTranscriptForAppend.trim() + '\n' : '') + newTranscript;
            setModalVisible(false);
            setWebviewInitialValueMain(fullTranscript);
            setEditTranscriptTitle('עריכת תמלול');
            setCurrentNoteId(appendNoteId); // <-- Ensure correct note is set for editing
            setEditTranscriptVisible(true);
            return;
          }
          const newTranscript = data.transcription.trim();
          const fullTranscript =
            (transcript && transcript.trim() ? transcript.trim() + '\n' : '') + newTranscript;
          setModalVisible(false);
          setPendingTranscript(newTranscript);
          setWebviewInitialValueMain(fullTranscript);
          setEditTranscriptTitle('עריכת תמלול חדש');
          setEditTranscriptVisible(true);
          return;
        } else if (res.ok && (!data.transcription || !data.transcription.trim())) {
          setTranscriptionStatus('לא זוהה תמלול. נסה שוב או נסה שירות אחר.');
          return;
        } else {
          throw new Error(data.error || 'ivrit.ai failed');
        }
      } catch (err) {
        // setTranscriptionStatus('ivrit.ai נכשל, מנסה Google...');
      }
      // 3. Try Google
      try {
        const res = await fetch('https://physio-assistant.onrender.com/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileData, useGoogle: true }),
        });
        const data = await res.json();
        if (res.ok && data.transcription && data.transcription.trim()) {
          setTranscriptionStatus('');
          if (appendMode) {
            const newTranscript = data.transcription.trim();
            const fullTranscript = (baseTranscriptForAppend && baseTranscriptForAppend.trim() ? baseTranscriptForAppend.trim() + '\n' : '') + newTranscript;
            setModalVisible(false);
            setWebviewInitialValueMain(fullTranscript);
            setEditTranscriptTitle('עריכת תמלול');
            setCurrentNoteId(appendNoteId); // <-- Ensure correct note is set for editing
            setEditTranscriptVisible(true);
            return;
          }
          const newTranscript = data.transcription.trim();
          const fullTranscript =
            (transcript && transcript.trim() ? transcript.trim() + '\n' : '') + newTranscript;
          setModalVisible(false);
          setPendingTranscript(newTranscript);
          setWebviewInitialValueMain(fullTranscript);
          setEditTranscriptTitle('עריכת תמלול חדש');
          setEditTranscriptVisible(true);
          return;
        } else if (res.ok && (!data.transcription || !data.transcription.trim())) {
          // setTranscriptionStatus('לא זוהה תמלול. נסה שוב או נסה שירות אחר.');
          return;
        } else {
          throw new Error(data.error || 'Google STT failed');
        }
      } catch (err) {
        // setTranscriptionStatus('Google נכשל, מנסה Whisper...');
      }
      // 4. Try Whisper
      try {
        const res = await fetch('https://physio-assistant.onrender.com/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileData, useGoogle: false }),
        });
        const data = await res.json();
        if (res.ok && data.transcription && data.transcription.trim()) {
          setTranscriptionStatus('');
          if (appendMode) {
            const newTranscript = data.transcription.trim();
            const fullTranscript = (baseTranscriptForAppend && baseTranscriptForAppend.trim() ? baseTranscriptForAppend.trim() + '\n' : '') + newTranscript;
            setModalVisible(false);
            setWebviewInitialValueMain(fullTranscript);
            setEditTranscriptTitle('עריכת תמלול');
            setCurrentNoteId(appendNoteId); // <-- Ensure correct note is set for editing
            setEditTranscriptVisible(true);
            return;
          }
          const newTranscript = data.transcription.trim();
          const fullTranscript =
            (transcript && transcript.trim() ? transcript.trim() + '\n' : '') + newTranscript;
          setModalVisible(false);
          setPendingTranscript(newTranscript);
          setWebviewInitialValueMain(fullTranscript);
          setEditTranscriptTitle('עריכת תמלול חדש');
          setEditTranscriptVisible(true);
          return;
        } else if (res.ok && (!data.transcription || !data.transcription.trim())) {
          setTranscriptionStatus('לא זוהה תמלול. נסה שוב או נסה שירות אחר.');
          return;
        } else {
          throw new Error(data.error || 'Whisper failed');
        }
      } catch (err) {
        setTranscriptionStatus('כל שירותי התמלול נכשלו');
      }
    } catch (err) {
      setTranscriptionStatus('שגיאה בתמלול: ' + err.message);
    }
  };

  const handleAddNote = () => {
    setAction('add');
    setRecordedUris([]);
    setModalVisible(false);
    setAppendMode(false);
    setAppendNoteId(null);
    startRecording('add');
  };

  const handleOverwrite = (noteId) => {
    setAction('overwrite');
    setCurrentNoteId(noteId);
    setRecordedUris([]);
    setTranscript('');
    setModalVisible(false);
    setAppendMode(false);
    setAppendNoteId(null);
    startRecording('overwrite', noteId);
  };

  const handleAppend = async (noteId) => {
    setAction('append');
    setAppendMode(true);
    setAppendNoteId(noteId);
    setRecordedUris([]);
    setModalVisible(false);
    // Fetch the existing transcript and set it
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const userDocRef = doc(db, 'users', user.uid);
      const patientDocRef = doc(userDocRef, user.email.replace(/[.@]/g, '_'), patientId);
      const meetingsCollection = collection(patientDocRef, 'meetings');
      const noteDoc = doc(meetingsCollection, noteId);
      const noteSnap = await getDoc(noteDoc);
      const currentTranscript = noteSnap.exists() && noteSnap.data().transcript ? noteSnap.data().transcript : '';
      setTranscript('');
      setBaseTranscriptForAppend(currentTranscript);
    } catch (err) {
      setTranscript('');
      setBaseTranscriptForAppend('');
    }
    startRecording('append', noteId);
  };

  const handleDelete = async (noteId) => {
    setDeleteDialogVisible(true);
    setNoteToDelete(noteId);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const userDocRef = doc(db, 'users', user.uid);
      const patientDocRef = doc(userDocRef, user.email.replace(/[.@]/g, '_'), patientId);
      const meetingsCollection = collection(patientDocRef, 'meetings');
      const noteDoc = doc(meetingsCollection, noteToDelete);
      await deleteDoc(noteDoc);
      // Update notesCount after deleting
      const meetingsSnapshot = await getDocs(meetingsCollection);
      const notesCount = meetingsSnapshot.docs.length;
      await updateDoc(patientDocRef, { notesCount });
      setDeleteDialogVisible(false);
      setNoteToDelete(null);
      fetchNotes();
    } catch (err) {
      alert('שגיאה במחיקת הערה: ' + err.message);
    }
  };

  const handleEditTranscript = (noteId, currentText) => {
    setEditTranscriptTitle('עריכת תמלול');
    setCurrentNoteId(noteId);
    setWebviewInitialValueMain(currentText || '');
    setEditTranscriptVisible(true);
  };

  const saveTranscript = async (newTranscript) => {
    console.log('Received transcript from WebView:', newTranscript);
    if (!currentNoteId) {
      alert('לא נבחרה הערה לעריכה');
      return;
    }
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const userDocRef = doc(db, 'users', user.uid);
      const patientDocRef = doc(userDocRef, user.email.replace(/[.@]/g, '_'), patientId);
      const meetingsCollection = collection(patientDocRef, 'meetings');
      const noteDoc = doc(meetingsCollection, currentNoteId);
      const trimmed = (newTranscript || '').trim();
      console.log('Saving transcript to Firestore:', trimmed);
      await updateDoc(noteDoc, { transcript: trimmed });
      setEditTranscriptVisible(false);
      setCurrentNoteId(null);
      fetchNotes();
    } catch (err) {
      console.error('שגיאה בשמירת תמלול:', err);
      alert('שגיאה בשמירת תמלול: ' + (err.message || err));
    }
  };

  return (
    <>
      <Appbar.Header style={{ direction: 'rtl', backgroundColor: '#7F7FD5' }}>
        <Appbar.Content
          title={patientName}
          titleStyle={{
            fontFamily: 'SpaceMono',
            textAlign: 'center',
            direction: 'rtl',
            fontSize: 28,
            fontWeight: 'bold',
            color: '#fff',
            textShadowColor: '#86A8E7',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 8,
            letterSpacing: 1.5,
          }}
        />
      </Appbar.Header>
      <LinearGradient
        colors={['#7F7FD5', '#86A8E7', '#91EAE4']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
      {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#7F7FD5" />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={n => n.id}
          renderItem={({ item }) => (
              <Card style={{ margin: 8, direction: 'rtl', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.97)', borderWidth: 2, borderColor: '#91EAE4', shadowColor: '#7F7FD5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.13, shadowRadius: 12, elevation: 6 }}>
              <Card.Title
                title={item.timestamp ? item.timestamp.toLocaleDateString('he-IL') : 'תאריך לא ידוע'}
                titleStyle={{ textAlign: 'right' }}
              />
              <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'flex-end', marginRight: 8, marginBottom: 4 }}>
                  <Button onPress={() => handleOverwrite(item.id)} mode="text" labelStyle={{ color: '#7F7FD5' }}>הקלט מחדש</Button>
                  <Button onPress={() => handleAppend(item.id)} mode="text" labelStyle={{ color: '#7F7FD5' }}>הוסף הקלטה</Button>
                <Button onPress={() => handleDelete(item.id)} mode="text" color="red">מחק</Button>
              </View>
              <Card.Content>
                  <Pressable onPress={() => handleEditTranscript(item.id, item.transcript)}>
                    <Text style={{ fontSize: 16, textAlign: 'right', textDecorationLine: 'underline', color: '#1976d2' }}>{item.transcript || 'אין תמלול'}</Text>
                  </Pressable>
                  <Button onPress={() => handleEditTranscript(item.id, item.transcript)} style={{ alignSelf: 'flex-end' }} labelStyle={{ color: '#7F7FD5' }}>ערוך תמלול</Button>
              </Card.Content>
            </Card>
          )}
        />
      )}
      <FAB
        icon="plus"
          style={{ position: 'absolute', right: 16, bottom: 16, backgroundColor: '#7F7FD5' }}
        onPress={handleAddNote}
          color="#fff"
        label="הוסף הערה"
      />
        {/* Modals */}
      <Modal
        visible={recordingModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRecordingModalVisible(false)}
      >
        <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { direction: 'rtl', alignItems: 'center', borderWidth: 2, borderColor: '#91EAE4' }] }>
              <Text style={{ fontFamily: 'SpaceMono', textAlign: 'center', fontSize: 22, color: '#7F7FD5', fontWeight: 'bold', marginBottom: 12, textShadowColor: '#86A8E7', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, letterSpacing: 1.2 }}>
                מקליט...
              </Text>
              <Button mode="contained" onPress={stopRecording} style={{ marginTop: 16, backgroundColor: '#7F7FD5' }} labelStyle={{ color: '#fff' }}>עצור הקלטה</Button>
            </View>
        </View>
      </Modal>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { direction: 'rtl', alignItems: 'flex-end', borderWidth: 2, borderColor: '#91EAE4' }] }>
              <Text style={{ fontFamily: 'SpaceMono', textAlign: 'center', fontSize: 22, color: '#7F7FD5', fontWeight: 'bold', marginBottom: 12, textShadowColor: '#86A8E7', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, letterSpacing: 1.2 }}>
                אפשרויות להערה
              </Text>
              {uploading ? <ActivityIndicator color="#7F7FD5" /> : null}
              <Button onPress={playAllRecordings} disabled={recordedUris.length === 0} style={{ alignSelf: 'flex-end' }} labelStyle={{ color: '#7F7FD5' }}>האזן להקלטה</Button>
              <Button onPress={transcribeRecording} disabled={!recordedUris.length} style={{ alignSelf: 'flex-end' }} labelStyle={{ color: '#7F7FD5' }}>תמלל הקלטה</Button>
              <Button onPress={uploadRecording} disabled={!recordedUris.length || uploading} style={{ alignSelf: 'flex-end', backgroundColor: '#7F7FD5' }} labelStyle={{ color: '#fff' }}>שמור הערה</Button>
              <Button onPress={() => setTranscript('')} disabled={uploading} style={{ alignSelf: 'flex-end', backgroundColor: '#fff', borderColor: '#7F7FD5', borderWidth: 1, marginBottom: 4 }} labelStyle={{ color: '#7F7FD5' }}>אפס תמלול</Button>
              {appendMode ? (
                <Button onPress={() => startRecording('append', appendNoteId)} disabled={uploading} style={{ alignSelf: 'flex-end' }} labelStyle={{ color: '#7F7FD5' }}>הוסף הקלטה נוספת</Button>
              ) : (
                <Button onPress={handleAddNote} disabled={uploading} style={{ alignSelf: 'flex-end' }} labelStyle={{ color: '#7F7FD5' }}>הוסף הקלטה נוספת</Button>
              )}
              <Button onPress={() => { setModalVisible(false); setRecordedUris([]); }} disabled={uploading} style={{ alignSelf: 'flex-end' }} labelStyle={{ color: '#7F7FD5' }}>ביטול</Button>
              {transcriptionStatus ? (
                <Text style={{ color: '#7F7FD5', marginBottom: 8 }}>{transcriptionStatus}</Text>
              ) : null}
              {transcript ? (
                <Pressable onPress={() => {
                  setWebviewInitialValueMain(transcript);
                  setEditTranscriptTitle('עריכת תמלול');
                  setEditTranscriptVisible(true);
                }}>
                  <Text style={{ marginTop: 16, textAlign: 'right', textDecorationLine: 'underline', color: '#1976d2' }}>{transcript}</Text>
                </Pressable>
              ) : null}
            </View>
        </View>
      </Modal>
        {/* Edit Transcript Dialogs */}
        <Portal>
          <Dialog visible={editTranscriptVisible} onDismiss={() => setEditTranscriptVisible(false)} style={{ direction: 'rtl', backgroundColor: 'transparent', shadowColor: '#7F7FD5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 12, borderRadius: 22 }}>
            <Dialog.Title style={{
              fontFamily: 'SpaceMono',
              textAlign: 'center',
              fontSize: 26,
              color: '#fff',
              fontWeight: 'bold',
              marginBottom: 0,
              backgroundColor: '#7F7FD5',
              paddingVertical: 10,
              borderRadius: 12,
              textShadowColor: '#222',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
              letterSpacing: 1.5,
              overflow: 'hidden'
            }}>
              עריכת תמלול
            </Dialog.Title>
            <Dialog.Content style={{ height: 220, backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 18, borderWidth: 2, borderColor: '#91EAE4', padding: 0, marginHorizontal: -16, marginTop: 8, marginBottom: 0, alignItems: 'stretch' }}>
              <WebView
                ref={webviewEditRef}
                originWhitelist={['*']}
                source={{ html: `<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'><style>body{margin:0;padding:0;background:transparent;}#editor{width:98%;height:96%;font-size:20px;line-height:1.7;font-family:'SpaceMono',sans-serif;padding:16px 12px 16px 12px;margin:1%;border-radius:14px;background:#f4f6fa;border:2px solid #91EAE4;box-shadow:0 4px 16px rgba(127,127,213,0.10);color:#222;box-sizing:border-box;outline:none;text-align:right;direction:rtl;overflow:auto;min-height:160px;max-height:200px;}</style></head><body><div id='editor' contenteditable='true' dir='rtl' spellcheck='false' placeholder='הזן תמלול...'>${webviewInitialValueMain.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div><script>window.getTranscript = function() { window.ReactNativeWebView.postMessage(document.getElementById('editor').innerText); };</script></body></html>` }}
                onMessage={event => saveTranscript(event.nativeEvent.data)}
                javaScriptEnabled
                style={{ flex: 1, backgroundColor: 'transparent', minHeight: 180, borderRadius: 14 }}
                automaticallyAdjustContentInsets={false}
              />
            </Dialog.Content>
            <Dialog.Actions style={{ justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 }}>
              <Button
                onPress={() => setEditTranscriptVisible(false)}
                mode="outlined"
                style={{ borderColor: '#7F7FD5', borderRadius: 8, minWidth: 80, backgroundColor: 'white', elevation: 0 }}
                labelStyle={{ color: '#7F7FD5', fontSize: 18, fontFamily: 'SpaceMono' }}
              >ביטול</Button>
              <Button
                onPress={() => {
                  if (webviewEditRef.current) {
                    webviewEditRef.current.injectJavaScript('window.getTranscript();');
                  }
                }}
                mode="contained"
                style={{ backgroundColor: '#7F7FD5', borderRadius: 8, minWidth: 80, elevation: 2 }}
                labelStyle={{ color: '#fff', fontSize: 18, fontFamily: 'SpaceMono' }}
              >שמור</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      {/* Delete Note Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)} style={{ direction: 'rtl' }}>
            <Dialog.Title style={{ fontFamily: 'SpaceMono', textAlign: 'center', fontSize: 22, color: 'red', fontWeight: 'bold', marginBottom: 0, textShadowColor: '#86A8E7', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, letterSpacing: 1.2 }}>
              מחיקת הערה
            </Dialog.Title>
          <Dialog.Content>
            <Text style={{ textAlign: 'right' }}>האם אתה בטוח שברצונך למחוק את ההערה?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={confirmDelete} color="red">מחק</Button>
              <Button onPress={() => setDeleteDialogVisible(false)} labelStyle={{ color: '#7F7FD5' }}>ביטול</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: 320,
    alignItems: 'center',
  },
}); 