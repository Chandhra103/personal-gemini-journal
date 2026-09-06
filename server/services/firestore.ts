import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { getApps } from "firebase-admin/app";

export type JournalMessage = { role: "user" | "assistant"; content: string };
export type JournalEntry = {
  id: string;
  title: string;
  body: string;
  summary: string;
  mode: string;
  messages: JournalMessage[];
  createdAt: string;
  updatedAt: string;
};

function db(): Firestore {
  if (!getApps()[0]) throw new Error("FIREBASE_NOT_INITIALIZED");
  return getFirestore(getApps()[0]);
}

function entries(uid: string) {
  return db().collection("users").doc(uid).collection("journal_entries");
}

function insights(uid: string) {
  return db().collection("users").doc(uid).collection("insight_reports");
}

function toEntry(id: string, data: FirebaseFirestore.DocumentData): JournalEntry {
  const createdAt = data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString();
  const updatedAt = data.updatedAt?.toDate?.()?.toISOString?.() ?? createdAt;
  return {
    id,
    title: String(data.title ?? "Untitled reflection"),
    body: String(data.body ?? ""),
    summary: String(data.summary ?? data.body ?? ""),
    mode: String(data.mode ?? "empathetic"),
    messages: Array.isArray(data.messages) ? data.messages : [],
    createdAt,
    updatedAt,
  };
}

export async function listJournalEntries(uid: string, limit = 30): Promise<JournalEntry[]> {
  const snapshot = await entries(uid).orderBy("updatedAt", "desc").limit(limit).get();
  return snapshot.docs.map((doc) => toEntry(doc.id, doc.data()));
}

export async function saveJournalEntry(uid: string, input: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">): Promise<JournalEntry> {
  const ref = entries(uid).doc();
  const now = FieldValue.serverTimestamp();
  await ref.set({ ...input, ownerUid: uid, createdAt: now, updatedAt: now });
  const saved = await ref.get();
  return toEntry(ref.id, saved.data() ?? input);
}

export async function deleteAllJournalEntries(uid: string): Promise<void> {
  const snapshot = await entries(uid).get();
  const batch = db().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

export async function saveInsightReport(uid: string, report: Record<string, unknown>): Promise<void> {
  await insights(uid).doc("latest").set({ ...report, ownerUid: uid, updatedAt: FieldValue.serverTimestamp() });
}

export async function getLatestInsightReport(uid: string): Promise<Record<string, unknown> | null> {
  const snapshot = await insights(uid).doc("latest").get();
  return snapshot.exists ? (snapshot.data() ?? null) : null;
}
