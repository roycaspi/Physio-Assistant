# Physio Assistant

A cross-platform React Native (Expo) app and Flask backend for managing physiotherapy patient notes, including audio recording, transcription (Hebrew/RTL support), and Google/Firebase authentication.

---

## Features
- Patient management (add, edit, delete)
- Audio recording and transcription (Google Speech-to-Text, OpenAI Whisper)
- Hebrew (RTL) transcript editing
- Google and email/password authentication (Firebase)
- Cloud Firestore for notes and patient data
- Modern UI with React Native Paper

---

## Project Structure
- `app/` — React Native (Expo) frontend
- `backend/` — Flask backend for audio transcription

---

## Prerequisites
- Node.js & npm
- Python 3.11+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/eas-update/getting-started/)

---

## Frontend Setup (Expo)

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the app:**
   ```bash
   npx expo start
   ```
3. **Build for Android/iOS:**
   ```bash
   eas build -p android --profile preview
   # or
   eas build -p ios --profile preview
   ```
4. **Configure Firebase:**
   - Edit `app.config.js` and `app/firebase.js` with your Firebase project credentials.
   - Set Google OAuth client IDs in `app.config.js` (`GOOGLE_EXPO_CLIENT_ID`, etc.).

---

## Backend Setup (Flask)

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
2. **Environment variables:**
   - Create a `.env` file in the root with:
     ```env
     OPENAI_API_KEY=your_openai_key
     GOOGLE_CLOUD_API_KEY=your_google_key
     ```
3. **Run locally:**
   ```bash
   gunicorn -b 0.0.0.0:5000 backend.App:app
   ```
4. **Deploy to Render.com:**
   - Use the provided `render.yaml` (already configured for Gunicorn).

---

## API Endpoints
- `POST /transcribe` — Transcribe audio (Google or OpenAI Whisper)
  - Body: `{ fileData: <base64>, useGoogle: true|false }`
  - Returns: `{ transcription: <text> }`

---

## Authentication
- Google and email/password via Firebase Auth
- Google OAuth client IDs must be set up in Google Cloud Console and in `app.config.js`
- For Expo Go, add the redirect URI `https://auth.expo.io/@roycaspi/physio-assistant` to your Google OAuth client

---

## Deployment
- **Frontend:** EAS Build for APK/IPA, or Expo Go for development
- **Backend:** Render.com (see `render.yaml`), or any server with Python 3.11+

---

## Environment Variables
- `OPENAI_API_KEY` — for Whisper transcription
- `GOOGLE_CLOUD_API_KEY` — for Google Speech-to-Text
- Firebase/Google client IDs — in `app.config.js`

---

## License
MIT
