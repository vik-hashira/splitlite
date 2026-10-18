import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  addDoc, collection, deleteDoc, doc, getFirestore, onSnapshot, orderBy, query,
  setDoc, updateDoc,
} from "firebase/firestore";
import type { Expense, ExpenseInput, Group } from "./types";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

const app = firebaseConfigured ? initializeApp(config) : null;
const db = app ? getFirestore(app) : (null as never);
const auth = app ? getAuth(app) : (null as never);

let authReady: Promise<unknown> | null = null;
/** Anonymous sign-in, done once per page load; security rules require an authenticated request. */
export function ensureAuth() {
  if (!authReady) authReady = signInAnonymously(auth);
  return authReady;
}

export async function createGroup(data: Omit<Group, "id" | "createdAt" | "updatedAt">): Promise<string> {
  await ensureAuth();
  const ref = doc(collection(db, "groups"));
  const now = Date.now();
  await setDoc(ref, { ...data, createdAt: now, updatedAt: now });
  return ref.id;
}

export function subscribeGroup(id: string, cb: (g: Group | null) => void, onError: (e: Error) => void) {
  let unsub = () => {};
  let cancelled = false;
  ensureAuth().then(() => {
    if (cancelled) return;
    unsub = onSnapshot(
      doc(db, "groups", id),
      (snap) => cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null),
      onError,
    );
  }, onError);
  return () => {
    cancelled = true;
    unsub();
  };
}

export function subscribeExpenses(groupId: string, cb: (e: Expense[]) => void, onError: (e: Error) => void) {
  let unsub = () => {};
  let cancelled = false;
  ensureAuth().then(() => {
    if (cancelled) return;
    unsub = onSnapshot(
      query(collection(db, "groups", groupId, "expenses"), orderBy("createdAt", "desc")),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense)),
      onError,
    );
  }, onError);
  return () => {
    cancelled = true;
    unsub();
  };
}

const touchGroup = (groupId: string) =>
  updateDoc(doc(db, "groups", groupId), { updatedAt: Date.now() });

export async function addExpense(groupId: string, e: ExpenseInput) {
  await ensureAuth();
  await addDoc(collection(db, "groups", groupId, "expenses"), e);
  await touchGroup(groupId);
}

export async function updateExpense(groupId: string, id: string, e: Partial<ExpenseInput>) {
  await ensureAuth();
  await updateDoc(doc(db, "groups", groupId, "expenses", id), e);
  await touchGroup(groupId);
}

export async function deleteExpense(groupId: string, id: string) {
  await ensureAuth();
  await deleteDoc(doc(db, "groups", groupId, "expenses", id));
  await touchGroup(groupId);
}

export async function addMember(groupId: string, members: string[]) {
  await ensureAuth();
  await updateDoc(doc(db, "groups", groupId), { members, updatedAt: Date.now() });
}
