import { cert, getApps, initializeApp, applicationDefault, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

export type VerifiedFirebaseUser = {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
};

export async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseUser> {
  const decoded = await getAuth(getFirebaseApp()).verifyIdToken(token, true);
  return {
    uid: decoded.uid,
    email: decoded.email,
    name: decoded.name,
    picture: decoded.picture,
  };
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
  );
}
