import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PatientsScreen from './PatientsScreen';
import PatientNotesScreen from './PatientNotesScreen';
import NotesScreen from './NotesScreen';
import ProfileScreen from './ProfileScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();
const PatientsStack = createNativeStackNavigator();

function PatientsStackScreen() {
  return (
    <PatientsStack.Navigator>
      <PatientsStack.Screen name="PatientsList" component={PatientsScreen} options={{ title: 'מטופלים',
        headerTitleStyle: {
          fontFamily: 'SpaceMono',
          textAlign: 'center',
          fontSize: 28,
          fontWeight: 'bold',
          color: '#7F7FD5',
          textShadowColor: '#86A8E7',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 8,
          letterSpacing: 1.5,
        },
      }} />
      <PatientsStack.Screen name="PatientNotes" component={PatientNotesScreen} options={({ route }) => ({ title: 'מטופלים',
        headerTitleStyle: {
          fontFamily: 'SpaceMono',
          textAlign: 'center',
          fontSize: 28,
          fontWeight: 'bold',
          color: '#7F7FD5',
          textShadowColor: '#86A8E7',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 8,
          letterSpacing: 1.5,
        },
      })} />
    </PatientsStack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator initialRouteName="Patients">
      <Tab.Screen
        name="Patients"
        component={PatientsStackScreen}
        options={{
          tabBarLabel: 'מטופלים',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" color={color} size={size} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'פרופיל',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
          headerTitleStyle: {
            fontFamily: 'SpaceMono',
            textAlign: 'center',
            fontSize: 28,
            fontWeight: 'bold',
            color: '#7F7FD5',
            textShadowColor: '#86A8E7',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 8,
            letterSpacing: 1.5,
          },
        }}
      />
    </Tab.Navigator>
  );
} 