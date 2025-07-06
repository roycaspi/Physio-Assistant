import './firebase';
import React, { useState, useEffect } from 'react';
import { View, I18nManager, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Card, Appbar, Checkbox } from 'react-native-paper';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithCredential, GoogleAuthProvider, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Google Auth
  const redirectUri = "https://auth.expo.io/@roycaspi/physio-assistant";
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: Constants.expoConfig?.extra?.GOOGLE_EXPO_CLIENT_ID,
    androidClientId: Constants.expoConfig?.extra?.GOOGLE_ANDROID_CLIENT_ID,
    webClientId: Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.authentication;
      if (id_token) {
        const auth = getAuth();
        const credential = GoogleAuthProvider.credential(id_token);
        signInWithCredential(auth, credential).catch(e => setError(e.message));
      }
    }
  }, [response]);

  useEffect(() => {
    I18nManager.forceRTL(true);
    // Check if user previously chose remember me
    AsyncStorage.getItem('rememberMe').then(val => {
      if (val === 'true') setRememberMe(true);
    });
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    setError('');
    const auth = getAuth();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Registration validation
        if (!fullName || !phone || !email || !password || !confirmPassword) {
          setError('אנא מלא את כל השדות');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('הסיסמאות אינן תואמות');
          setLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
        // Optionally, save fullName and phone to Firestore here
      }
      if (rememberMe) {
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        await AsyncStorage.removeItem('rememberMe');
      }
    } catch (e) {
      setError(e.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Appbar.Header style={{ direction: 'rtl', backgroundColor: '#7F7FD5' }}>
        <Appbar.Content
          title={isLogin ? 'התחברות' : 'הרשמה'}
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
        <View style={{ width: '100%', alignItems: 'center', marginTop: 24, marginBottom: 0 }}>
          <Image
            source={require('../assets/images/rehabilitation_progress_700.png')}
            style={{ width: 220, height: 120, resizeMode: 'contain', alignSelf: 'center', borderRadius: 24, borderWidth: 4, borderColor: '#86A8E7', backgroundColor: '#fff', shadowColor: '#86A8E7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}
          />
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, width: '100%' }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, direction: 'rtl' }}>
            <Card style={{ width: '100%', maxWidth: 400, padding: 20, direction: 'rtl', borderRadius: 22, elevation: 8, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 2, borderColor: '#91EAE4', shadowColor: '#7F7FD5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16 }}>
              <Card.Content>
                <Text style={{ fontFamily: 'SpaceMono', textAlign: 'center', fontSize: 22, color: '#7F7FD5', fontWeight: 'bold', marginBottom: 12, textShadowColor: '#86A8E7', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, letterSpacing: 1.2 }}>
                  {isLogin ? 'ברוך הבא לעוזר פיזיותרפיה' : 'צור חשבון חדש'}
                </Text>
                {!isLogin && (
                  <>
                    <TextInput
                      label="שם מלא"
                      value={fullName}
                      onChangeText={setFullName}
                      style={{ marginBottom: 16, textAlign: 'right', direction: 'rtl', backgroundColor: '#f4f6f8', fontSize: 18 }}
                      textAlign="right"
                      placeholderTextColor="#888"
                    />
                    <TextInput
                      label="טלפון"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      style={{ marginBottom: 16, textAlign: 'right', direction: 'rtl', backgroundColor: '#f4f6f8', fontSize: 18 }}
                      textAlign="right"
                      placeholderTextColor="#888"
                    />
                  </>
                )}
                <TextInput
                  label="אימייל"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={{ marginBottom: 16, textAlign: 'right', direction: 'rtl', backgroundColor: '#f4f6f8', fontSize: 18 }}
                  textAlign="right"
                  textContentType="emailAddress"
                  inputMode="email"
                  placeholderTextColor="#888"
                />
                <TextInput
                  label="סיסמה"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={{ marginBottom: 16, textAlign: 'right', direction: 'rtl', backgroundColor: '#f4f6f8', fontSize: 18 }}
                  textAlign="right"
                  textContentType="password"
                  placeholderTextColor="#888"
                />
                {!isLogin && (
                  <TextInput
                    label="אימות סיסמה"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    style={{ marginBottom: 16, textAlign: 'right', direction: 'rtl', backgroundColor: '#f4f6f8', fontSize: 18 }}
                    textAlign="right"
                    textContentType="password"
                    placeholderTextColor="#888"
                  />
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, alignSelf: 'flex-end' }}>
                  <Checkbox
                    status={rememberMe ? 'checked' : 'unchecked'}
                    onPress={() => setRememberMe(!rememberMe)}
                  />
                  <Text style={{ marginRight: 8, fontSize: 16 }}>זכור אותי</Text>
                </View>
                {error ? <Text style={{ color: 'red', marginBottom: 8, textAlign: 'right', fontSize: 16 }}>{error}</Text> : null}
                <Button
                  mode="contained"
                  onPress={handleAuth}
                  loading={loading}
                  style={{
                    marginBottom: 8,
                    borderRadius: 8,
                    backgroundColor: isLogin ? '#7F7FD5' : '#91EAE4',
                    shadowColor: '#86A8E7',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.18,
                    shadowRadius: 8,
                  }}
                  labelStyle={{ fontSize: 18, color: '#fff' }}
                >
                  {isLogin ? 'התחבר' : 'הרשם'}
                </Button>
                <Button mode="text" onPress={() => setIsLogin(!isLogin)} labelStyle={{ fontSize: 16, color: '#1976d2' }}>
                  {isLogin ? 'אין לך חשבון? הרשם' : 'יש לך חשבון? התחבר'}
                </Button>
                <Button
                  mode="outlined"
                  icon="google"
                  onPress={() => promptAsync()}
                  disabled={!request}
                  style={{ marginBottom: 8, borderColor: '#7F7FD5', borderWidth: 1, borderRadius: 8 }}
                  labelStyle={{ fontSize: 18, color: '#7F7FD5' }}
                >
                  {isLogin ? 'התחבר עם Google' : 'הרשם עם Google'}
                </Button>
              </Card.Content>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
} 