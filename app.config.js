import 'dotenv/config';

export default {
  expo: {
    name: "Physio Assistant",
    slug: "physio-assistant",
    version: "1.0.0",
    scheme: "physioassistant",
    orientation: "portrait",
    // Use splash.png as placeholder icon until a proper icon is added
    icon: "./assets/images/splash-icon.png",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: { fallbackToCacheTimeout: 0 },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.roycaspi.physioassistant"
    },
    android: {
      package: "com.roycaspi.physioassistant",
      // Use splash image as adaptive icon placeholder
      adaptiveIcon: {
        foregroundImage: "./assets/images/splash-icon.png",
        backgroundColor: "#FFFFFF"
      }
    },
    web: {
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      ["expo-splash-screen", {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff"
      }],
      ["expo-build-properties", {
        android: {
          reactNativeGradlePluginVersion: "0.74.5"
        }
      }]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      FIREBASE_API_KEY: "AIzaSyCPtbrpWCctsP43nYWsHOlxT4_agHhypZ8",
      FIREBASE_AUTH_DOMAIN: "physio-assistant-1d077.firebaseapp.com",
      FIREBASE_PROJECT_ID: "physio-assistant-1d077",
      FIREBASE_STORAGE_BUCKET: "physio-assistant-1d077.firebasestorage.app",
      FIREBASE_MESSAGING_SENDER_ID: "726373746145",
      FIREBASE_APP_ID: "1:726373746145:web:251b50801d93ab194efea0",
      FIREBASE_MEASUREMENT_ID: "G-YFMVDH3T4E",
      GOOGLE_EXPO_CLIENT_ID: "726373746145-go3brcqhc6b2g8dpmj868kjmfpksptv8.apps.googleusercontent.com",
      GOOGLE_WEB_CLIENT_ID: "726373746145-go3brcqhc6b2g8dpmj868kjmfpksptv8.apps.googleusercontent.com",
      GOOGLE_ANDROID_CLIENT_ID: "726373746145-bbgmenmgvbsuttgusvgs4aq7hbvc3sc4.apps.googleusercontent.com",
      eas: {
        projectId: "7538a68b-ca32-4605-ba53-ab46bbcf1470"
      }
    }
  }
};
