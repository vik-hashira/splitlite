import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  Timestamp, addDoc, collection, deleteDoc, doc, getDocs, getFirestore, onSnapshot, orderBy, query,
  setDoc, updateDoc, writeBatch,
} from "firebase/firestore";
import type { Expense, ExpenseInput, Group } from "./types";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

export const app = firebaseConfigured ? initializeApp(config) : null;
const db = app ? getFirestore(app) : (null as never);
const auth = app ? getAuth(app) : (null as never);

export const RETENTION_MS = 365 * 24 * 60 * 60 * 1000;
/**
 * A group and all its expenses share one `expireAt`, one year after the group was created.
 * Firestore TTL policies on `expireAt` delete them (see README). TTL never cascades to
 * subcollections, so every expense carries the group's timestamp too.
 */
const expiryFor = (createdAt: number) => Timestamp.fromMillis(createdAt + RETENTION_MS);

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
  await setDoc(ref, { ...data, createdAt: now, updatedAt: now, expireAt: expiryFor(now) });
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

export async function addExpense(group: Group, e: ExpenseInput) {
  const groupId = group.id;
  await ensureAuth();
  await addDoc(collection(db, "groups", groupId, "expenses"), { ...e, expireAt: expiryFor(group.createdAt) });
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

/** Set the admin of a group created before admins existed. The rules make it a one-time choice. */
export async function claimAdmin(groupId: string, name: string) {
  await ensureAuth();
  await updateDoc(doc(db, "groups", groupId), { creatorName: name, updatedAt: Date.now() });
}

/** Groups created before retention existed: stamp the group and its expenses once. */
export async function backfillExpiry(group: Group) {
  await ensureAuth();
  const expireAt = expiryFor(group.createdAt);
  const snap = await getDocs(collection(db, "groups", group.id, "expenses"));
  for (let i = 0; i < snap.docs.length; i += 450) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 450).forEach((d) => batch.update(d.ref, { expireAt }));
    await batch.commit();
  }
  await updateDoc(doc(db, "groups", group.id), { expireAt });
}

/** Permanently delete a group and every expense in it. */
export async function deleteGroup(groupId: string) {
  await ensureAuth();
  const snap = await getDocs(collection(db, "groups", groupId, "expenses"));
  // Firestore batches cap at 500 writes; leave headroom for the group doc itself.
  for (let i = 0; i < snap.docs.length; i += 450) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, "groups", groupId));
}
