import './firebase';
import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';
import { Appbar, Card, Avatar, FAB, Searchbar, ActivityIndicator, Modal, Text, Button, TextInput, Menu } from 'react-native-paper';
import { getFirestore, doc, collection, getDocs, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback } from 'react';

export default function PatientsScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editPatientName, setEditPatientName] = useState('');
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [deletingPatientId, setDeletingPatientId] = useState(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active'); // 'all', 'active', 'inactive'
  const [menuVisible, setMenuVisible] = useState({}); // For per-patient menu

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) fetchPatients();
  }, [user]);

  // Refetch patients when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user) fetchPatients();
    });
    return unsubscribe;
  }, [navigation, user]);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const db = getFirestore();
      const userEmail = user.email?.replace(/[.@]/g, '_') || 'unknown';
      const userDocRef = doc(db, 'users', user.uid);
      const userCollection = collection(userDocRef, userEmail);
      const patientsSnapshot = await getDocs(userCollection);
      const allPatients = [];
      for (const patientDoc of patientsSnapshot.docs) {
        const patientData = patientDoc.data();
        // Fetch meetings/notes count and last note date
        const meetingsCollection = collection(patientDoc.ref, 'meetings');
        const meetingsSnapshot = await getDocs(meetingsCollection);
        const notesCount = meetingsSnapshot.docs.length;
        let lastNoteDate = null;
        meetingsSnapshot.forEach(meeting => {
          const meetingData = meeting.data();
          const ts = meetingData.timestamp?.toDate?.() || new Date(0);
          if (!lastNoteDate || ts > lastNoteDate) lastNoteDate = ts;
        });
        // Update notesCount in Firestore if needed
        if (patientData.notesCount !== notesCount) {
          try {
            await updateDoc(patientDoc.ref, { notesCount });
          } catch (e) {
            console.error('Error updating notesCount for', patientDoc.id, e);
          }
        }
          allPatients.push({
            id: patientDoc.id,
            name: patientData.name || patientDoc.id,
            notesCount,
          lastNoteDate: notesCount > 0 && lastNoteDate ? lastNoteDate.toLocaleDateString('he-IL') : 'תאריך לא ידוע',
          status: patientData.status || 'active',
          });
      }
      // Sort patients by latest update (descending)
      allPatients.sort((a, b) => {
        // Convert lastNoteDate to Date object for comparison, fallback to old date if missing
        const dateA = a.lastNoteDate && a.lastNoteDate !== 'תאריך לא ידוע' ? new Date(a.lastNoteDate.split('.').reverse().join('-')) : new Date(0);
        const dateB = b.lastNoteDate && b.lastNoteDate !== 'תאריך לא ידוע' ? new Date(b.lastNoteDate.split('.').reverse().join('-')) : new Date(0);
        return dateB - dateA;
      });
      setPatients(allPatients);
    } catch (error) {
      console.error('❌ Error fetching patients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.includes(searchQuery) &&
    (statusFilter === 'all' || (p.status || 'active') === statusFilter)
  );

  const handleAddPatient = async () => {
    if (!newPatientName.trim()) {
      alert('יש להזין שם מטופל');
      return;
    }
    const patientId = newPatientName.trim();
    setAdding(true);
    try {
      const db = getFirestore();
      const userEmail = user.email?.replace(/[.@]/g, '_') || 'unknown';
      const userDocRef = doc(db, 'users', user.uid);
      const userCollection = collection(userDocRef, userEmail);
      const patientDocRef = doc(userCollection, patientId);
      // Check for duplicate in Firestore
      const patientSnap = await getDoc(patientDocRef);
      if (patientSnap.exists()) {
        alert('מטופל בשם זה כבר קיים');
        setAdding(false);
        return;
      }
      // Add patient with all required fields
      await setDoc(patientDocRef, {
        name: patientId,
        status: 'active', // or whatever default you want
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        // Add any other fields you want here
      });
      setAddModalVisible(false);
      setNewPatientName('');
      fetchPatients();
    } catch (err) {
      alert('שגיאה בהוספת מטופל: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const openEditModal = (patient) => {
    setEditingPatientId(patient.id);
    setEditPatientName(patient.name);
    setEditModalVisible(true);
  };

  const handleEditPatient = async () => {
    if (!editPatientName.trim()) {
      alert('יש להזין שם מטופל');
      return;
    }
    // Check for duplicate (case-insensitive), excluding the current patient
    const exists = patients.some(p => p.id !== editingPatientId && p.name.trim().toLowerCase() === editPatientName.trim().toLowerCase());
    if (exists) {
      alert('מטופל בשם זה כבר קיים');
      return;
    }
    setEditing(true);
    try {
      const db = getFirestore();
      const userEmail = user.email?.replace(/[.@]/g, '_') || 'unknown';
      const userDocRef = doc(db, 'users', user.uid);
      const userCollection = collection(userDocRef, userEmail);
      const patientDoc = doc(userCollection, editingPatientId);
      await updateDoc(patientDoc, { name: editPatientName.trim() });
      setEditModalVisible(false);
      setEditingPatientId(null);
      setEditPatientName('');
      fetchPatients();
    } catch (err) {
      alert('שגיאה בעריכת מטופל: ' + err.message);
    } finally {
      setEditing(false);
    }
  };

  const openDeleteDialog = (patientId) => {
    setDeletingPatientId(patientId);
    setDeleteDialogVisible(true);
  };

  const handleDeletePatient = async () => {
    setDeleting(true);
    try {
      const db = getFirestore();
      const userEmail = user.email?.replace(/[.@]/g, '_') || 'unknown';
      const userDocRef = doc(db, 'users', user.uid);
      const userCollection = collection(userDocRef, userEmail);
      const patientDoc = doc(userCollection, deletingPatientId);
      // Delete all meetings/notes under this patient
      const meetingsCollection = collection(patientDoc, 'meetings');
      const meetingsSnapshot = await getDocs(meetingsCollection);
      for (const meetingDoc of meetingsSnapshot.docs) {
        await deleteDoc(meetingDoc.ref);
      }
      // Delete the patient document
      await deleteDoc(patientDoc);
      setDeleteDialogVisible(false);
      setDeletingPatientId(null);
      fetchPatients();
    } catch (err) {
      alert('שגיאה במחיקת מטופל: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (patientId, currentStatus) => {
    try {
      const db = getFirestore();
      const userEmail = user.email?.replace(/[.@]/g, '_') || 'unknown';
      const userDocRef = doc(db, 'users', user.uid);
      const userCollection = collection(userDocRef, userEmail);
      const patientDoc = doc(userCollection, patientId);
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await updateDoc(patientDoc, { status: newStatus });
      fetchPatients();
    } catch (err) {
      alert('שגיאה בשינוי סטטוס: ' + err.message);
    }
  };

  return (
    <>
      <Appbar.Header style={{ direction: 'rtl', backgroundColor: '#7F7FD5' }}>
        <Appbar.Content
          title="עוזר פיזיותרפיה"
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
      <Searchbar
        placeholder="חפש מטופל..."
        value={searchQuery}
        onChangeText={setSearchQuery}
          style={{ margin: 16, direction: 'rtl', textAlign: 'right', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: '#91EAE4' }}
        inputStyle={{ textAlign: 'right' }}
      />
        <View style={{ flexDirection: 'row', justifyContent: 'center', margin: 8 }}>
          <Button mode={statusFilter === 'all' ? 'contained' : 'outlined'} onPress={() => setStatusFilter('all')} style={{ marginHorizontal: 4 }}>הכל</Button>
          <Button mode={statusFilter === 'active' ? 'contained' : 'outlined'} onPress={() => setStatusFilter('active')} style={{ marginHorizontal: 4 }}>פעילים</Button>
          <Button mode={statusFilter === 'inactive' ? 'contained' : 'outlined'} onPress={() => setStatusFilter('inactive')} style={{ marginHorizontal: 4 }}>לא פעילים</Button>
        </View>
      {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#7F7FD5" />
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={p => p.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('PatientNotes', { patientId: item.id, patientName: item.name })}>
                <Card style={{ margin: 8, direction: 'rtl', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.97)', borderWidth: 2, borderColor: '#91EAE4', shadowColor: '#7F7FD5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.13, shadowRadius: 12, elevation: 6 }}>
                <Card.Title
                  title={item.name}
                    subtitle={`הערות: ${item.notesCount > 0 ? item.notesCount : 'אין הערות'} | עדכון אחרון: ${item.lastNoteDate} | סטטוס: ${item.status === 'inactive' ? 'לא פעיל' : 'פעיל'}`}
                    left={props => <Avatar.Text {...props} label={item.name[0]} style={{ backgroundColor: '#7F7FD5' }} />}
                  titleStyle={{ textAlign: 'right' }}
                  subtitleStyle={{ textAlign: 'right' }}
                />
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginRight: 8, marginBottom: 4 }}>
                    <Button onPress={() => openEditModal(item)} mode="text" labelStyle={{ color: '#7F7FD5' }}>ערוך</Button>
                    <Button onPress={() => openDeleteDialog(item.id)} mode="text" color="red">מחק</Button>
                  </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
      <FAB
        icon="plus"
          style={{ position: 'absolute', right: 16, bottom: 16, backgroundColor: '#7F7FD5' }}
          onPress={() => setAddModalVisible(true)}
          color="#fff"
        />
        <Modal
          visible={addModalVisible}
          onDismiss={() => setAddModalVisible(false)}
          contentContainerStyle={{ backgroundColor: 'white', padding: 24, margin: 32, borderRadius: 12, borderWidth: 2, borderColor: '#91EAE4' }}
        >
          <Text style={{ fontFamily: 'SpaceMono', textAlign: 'center', fontSize: 22, color: '#7F7FD5', fontWeight: 'bold', marginBottom: 12, textShadowColor: '#86A8E7', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, letterSpacing: 1.2 }}>
            הוסף מטופל חדש
          </Text>
          <TextInput
            label="שם המטופל"
            value={newPatientName}
            onChangeText={setNewPatientName}
            style={{ marginBottom: 16, textAlign: 'right', direction: 'rtl' }}
            autoFocus
          />
          <Button mode="contained" onPress={handleAddPatient} loading={adding} disabled={adding} style={{ marginBottom: 8, backgroundColor: '#7F7FD5' }} labelStyle={{ color: '#fff' }}>
            הוסף
          </Button>
          <Button onPress={() => setAddModalVisible(false)} disabled={adding}>
            ביטול
          </Button>
        </Modal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={{ backgroundColor: 'white', padding: 24, margin: 32, borderRadius: 12, borderWidth: 2, borderColor: '#91EAE4' }}
        >
          <Text style={{ fontFamily: 'SpaceMono', textAlign: 'center', fontSize: 22, color: '#7F7FD5', fontWeight: 'bold', marginBottom: 12, textShadowColor: '#86A8E7', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, letterSpacing: 1.2 }}>
            ערוך שם מטופל
          </Text>
          <TextInput
            label="שם המטופל"
            value={editPatientName}
            onChangeText={setEditPatientName}
            style={{ marginBottom: 16, textAlign: 'right', direction: 'rtl' }}
            autoFocus
          />
          <Text style={{ marginBottom: 8, textAlign: 'center', color: '#7F7FD5', fontWeight: 'bold' }}>
            סטטוס נוכחי: {patients.find(p => p.id === editingPatientId)?.status === 'inactive' ? 'לא פעיל' : 'פעיל'}
          </Text>
          <Button
            mode="outlined"
            onPress={() => handleToggleStatus(editingPatientId, patients.find(p => p.id === editingPatientId)?.status || 'active')}
            style={{ marginBottom: 8 }}
            labelStyle={{ color: '#7F7FD5' }}
            disabled={editing}
          >
            שנה סטטוס
          </Button>
          <Button mode="contained" onPress={handleEditPatient} loading={editing} disabled={editing} style={{ marginBottom: 8, backgroundColor: '#7F7FD5' }} labelStyle={{ color: '#fff' }}>
            שמור
          </Button>
          <Button onPress={() => setEditModalVisible(false)} disabled={editing}>
            ביטול
          </Button>
        </Modal>
        <Modal
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
          contentContainerStyle={{ backgroundColor: 'white', padding: 24, margin: 32, borderRadius: 12, borderWidth: 2, borderColor: '#91EAE4' }}
        >
          <Text style={{ fontFamily: 'SpaceMono', textAlign: 'center', fontSize: 22, color: 'red', fontWeight: 'bold', marginBottom: 12, textShadowColor: '#86A8E7', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, letterSpacing: 1.2 }}>
            מחיקת מטופל
          </Text>
          <Text style={{ marginBottom: 16, textAlign: 'right' }}>האם אתה בטוח שברצונך למחוק את המטופל וכל ההערות שלו?</Text>
          <Button mode="contained" onPress={handleDeletePatient} loading={deleting} disabled={deleting} style={{ marginBottom: 8, backgroundColor: 'red' }} labelStyle={{ color: '#fff' }}>
            מחק
          </Button>
          <Button onPress={() => setDeleteDialogVisible(false)} disabled={deleting}>
            ביטול
          </Button>
        </Modal>
      </LinearGradient>
    </>
  );
} 