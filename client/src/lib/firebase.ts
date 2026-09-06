import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(config).every(Boolean);

let auth: Auth | null = null;
function getFirebaseAuth(): Auth | null {
  if (!firebaseConfigured) return null;
  const app = getApps().length ? getApp() : initializeApp(config);
  auth ??= getAuth(app);
  return auth;
}

export function subscribeToFirebaseAuth(callback: (user: User | null) => void): () => void {
  const instance = getFirebaseAuth();
  return instance ? onAuthStateChanged(instance, callback) : () => callback(null);
}

export async function signInWithGoogle(): Promise<User> {
  const instance = getFirebaseAuth();
  if (!instance) throw new Error("Firebase is not configured for this environment.");
  return (await signInWithPopup(instance, new GoogleAuthProvider())).user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const instance = getFirebaseAuth();
  if (!instance) throw new Error("Firebase is not configured for this environment.");
  return (await signInWithEmailAndPassword(instance, email, password)).user;
}

export async function getFirebaseIdToken(): Promise<string | null> {
  const instance = getFirebaseAuth();
  return instance?.currentUser ? instance.currentUser.getIdToken() : null;
}

export async function signOutFirebase(): Promise<void> {
  const instance = getFirebaseAuth();
  if (instance) await signOut(instance);
}
