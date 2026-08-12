// Firebase project configuration for AFAK CARPET.
// This is a PUBLIC config object (not a secret) — safe to expose in client code.
export const firebaseConfig = {
  apiKey: "AIzaSyDhU0BbT7hPVqMSEGNiysTAlpXvfbkoLYw",
  authDomain: "afak-carpet.firebaseapp.com",
  projectId: "afak-carpet",
  storageBucket: "afak-carpet.firebasestorage.app",
  messagingSenderId: "535336052923",
  appId: "1:535336052923:web:4330b7557e53d7ab12e19e"
};

// imgbb API key — used by the admin panel to upload images and get direct links.
// The admin can change this from the admin panel's settings tab at any time
// (it's stored in Firestore settings.imgbbKey and falls back to this default).
export const DEFAULT_IMGBB_KEY = "220dd83542e4df5a7a047f87495df083";
