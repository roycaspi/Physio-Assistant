import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, FlatList, ActivityIndicator, Alert, TouchableOpacity, I18nManager } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { SafeAreaView } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { getFirestore, doc, setDoc, updateDoc, getDocs, collection, deleteDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import Constants from 'expo-constants';

I18nManager.forceRTL(true);

const firebaseConfig = {
  apiKey: Constants.expoConfig.extra.FIREBASE_API_KEY,
  authDomain: Constants.expoConfig.extra.FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig.extra.FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig.extra.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig.extra.FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig.extra.FIREBASE_APP_ID,
  measurementId: Constants.expoConfig.extra.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
// const db = getFirestore(app);
const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
});

const WHISPER_API_URL = "https://physio-assistant.onrender.com/transcribe";

async function transcribeWithWhisper(fileUri) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists || fileInfo.size === 0) throw new Error("Invalid file");

    const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await fetch(WHISPER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: "recording.m4a", fileData: fileBase64 }),
    });

    const text = await response.text(); 

    
    let data;
    try {
      console.log(text)
      data = JSON.parse(text);
    } catch (e) {
      console.error("❌ JSON parsing failed. Server response:", text);
      throw new Error("שגיאה: השרת החזיר תגובה לא תקפה");
    }

    if (data.error) {
      throw new Error(data.details || "שגיאת תמלול");
    }

    return data.transcription;
  } catch (error) {
    console.error("שגיאה בתמלול:", error.message);
    Alert.alert("שגיאה", error.message || "התמלול נכשל.");
    return "";
  }
}

export default function App() {
  const [patientName, setPatientName] = useState("");
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef(null);

  useEffect(() => {
    const fetchAllPatientsNotes = async () => {
      const patientsSnapshot = await getDocs(collection(db, "patients"));
      const allNotes = [];

      for (const patientDoc of patientsSnapshot.docs) {
        const meetingsRef = collection(db, "patients", patientDoc.id, "meetings");
        const meetingsSnapshot = await getDocs(meetingsRef);
        meetingsSnapshot.forEach(meeting => {
          allNotes.push({
            id: meeting.id,
            patient: patientDoc.id,
            ...meeting.data(),
          });
        });
      }

      setNotes([...allNotes]);
    };

    fetchAllPatientsNotes();
  }, []);

  const saveTranscriptToFirestore = async (patientName, transcript) => {
    const patientRef = doc(db, "patients", patientName);
    await setDoc(patientRef, { createdAt: new Date() }, { merge: true });

    const noteRef = doc(collection(patientRef, "meetings"));
    await setDoc(noteRef, {
      timestamp: new Date(),
      transcript,
      edited: false,
    });
  };

  const updateTranscriptInFirestore = async (patientName, noteId, newText) => {
    const ref = doc(db, "patients", patientName, "meetings", noteId);
    await updateDoc(ref, { transcript: newText, edited: true });
  };

  const deleteNoteFromFirestore = async (patientName, noteId) => {
    const ref = doc(db, "patients", patientName, "meetings", noteId);
    await deleteDoc(ref);
  };

  const handleRecord = async () => {
    if (Platform.OS === 'web') {
      Alert.alert("לא נתמך", "הקלטה לא זמינה בדפדפן.");
      return;
    }

    try {
      if (isRecording) {
        const recording = recordingRef.current;
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setIsRecording(false);

        setIsLoading(true);
        const transcription = await transcribeWithWhisper(uri);
        await saveTranscriptToFirestore(patientName, transcription);
setNotes(prev => [...prev]);
        setIsLoading(false);
      } else {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          Alert.alert("דרוש אישור", "נדרש אישור למיקרופון.");
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();

        recordingRef.current = recording;
        setIsRecording(true);
      }
    } catch (error) {
      console.error("שגיאת הקלטה:", error);
      Alert.alert("שגיאה", "הקלטה נכשלה.");
    }
  };

  const updateNote = (id, patient, newText) => {
    updateTranscriptInFirestore(patient, id, newText);
setNotes(prev => [...prev]);
  };

  const deleteNote = (id, patient) => {
    deleteNoteFromFirestore(patient, id);
setNotes(prev => prev.filter(n => !(n.id === id && n.patient === patient)));
  };

  const groupedNotes = notes.reduce((acc, note) => {
    if (!acc[note.patient]) acc[note.patient] = [];
    acc[note.patient].push(note);
    return acc;
  }, {});

  return (
    <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: "#f0f8ff" }}>
      <Text style={{ fontSize: 30, fontWeight: "bold", marginBottom: 20, color: "#34495e", textAlign: "right" }}>
        עוזר פיזיותרפיה
      </Text>

      <Text style={{ marginBottom: 8, fontSize: 18, textAlign: "right" }}>שם מטופל:</Text>
      <TextInput
        value={patientName}
        onChangeText={setPatientName}
        placeholder="הכנס שם מטופל"
        style={{ borderColor: "#bdc3c7", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 20, backgroundColor: "#ffffff", fontSize: 16, textAlign: "right" }}
      />

      <TouchableOpacity
        onPress={handleRecord}
        disabled={!patientName.trim() || isLoading}
        style={{ backgroundColor: isRecording ? "#c0392b" : "#27ae60", padding: 15, borderRadius: 12, alignItems: "center", marginBottom: 20 }}
      >
        <Text style={{ color: "white", fontSize: 18 }}>
          {isRecording ? "עצור הקלטה" : "התחל הקלטה"}
        </Text>
      </TouchableOpacity>

      {isLoading && <ActivityIndicator size="large" color="#2980b9" style={{ marginVertical: 20 }} />}

      <Text style={{ fontSize: 22, fontWeight: "600", textAlign: "right", marginBottom: 10 }}>הערות מטופלים</Text>

      <FlatList
        data={Object.entries(groupedNotes).sort((a, b) => {
          const lastA = a[1].reduce((latest, note) => latest.timestamp?.toDate() > note.timestamp?.toDate() ? latest : note);
          const lastB = b[1].reduce((latest, note) => latest.timestamp?.toDate() > note.timestamp?.toDate() ? latest : note);
          return lastB.timestamp?.toDate() - lastA.timestamp?.toDate();
        })}
        keyExtractor={([patient]) => patient}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => {
          const [patient, patientNotes] = item;
          return (
            <View style={{ marginBottom: 30 }}>
              <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10, textAlign: "right", color: "#2c3e50" }}>{patient}</Text>
              {patientNotes
                .sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate())
                .map(note => (
                  <View key={note.id} style={{ backgroundColor: "#ffffff", borderRadius: 10, padding: 15, marginBottom: 15, borderRightWidth: 5, borderRightColor: "#3498db" }}>
                    <Text style={{ fontWeight: "bold", fontSize: 14, color: "#7f8c8d", textAlign: "right" }}>{note.timestamp?.toDate().toLocaleString()}</Text>
                    <TextInput
                      multiline
                      defaultValue={note.transcript}
                      onChangeText={(text) => {
                        setNotes(prev =>
                          prev.map(n =>
                            n.id === note.id && n.patient === patient ? { ...n, transcript: text } : n
                          )
                        );
                      }}
                      
                      onEndEditing={(e) => {
                        updateNote(note.id, patient, e.nativeEvent.text);
                      }}
                      style={{
                        fontSize: 16,
                        backgroundColor: "#f9f9f9",
                        padding: 10,
                        borderRadius: 8,
                        marginVertical: 10,
                        textAlign: "right",
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => deleteNote(note.id, patient)}
                      style={{ backgroundColor: "#e74c3c", padding: 10, borderRadius: 8, alignItems: "center" }}
                    >
                      <Text style={{ color: "white", fontWeight: "600" }}>מחק</Text>
                    </TouchableOpacity>
                  </View>
              ))}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
