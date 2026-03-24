import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

function normalizeName(name) {
  return String(name || "Mi árbol familiar").trim() || "Mi árbol familiar";
}

function normalizePeople(people) {
  return Array.isArray(people) ? people : [];
}

function treeRef(uid, treeId) {
  return doc(db, "users", uid, "trees", treeId);
}

export async function getUserTrees(uid) {
  if (!uid) return [];
  const ref = collection(db, "users", uid, "trees");
  const q = query(ref, orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function getTree(uid, treeId) {
  if (!uid || !treeId) return null;
  const snap = await getDoc(treeRef(uid, treeId));
  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}

export async function createTree(uid, data = {}) {
  if (!uid) throw new Error("UID requerido");
  const ref = doc(collection(db, "users", uid, "trees"));

  await setDoc(ref, {
    ownerId: uid,
    name: normalizeName(data.name),
    people: normalizePeople(data.people),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: ref.id };
}

export async function saveTree(uid, treeId, data = {}) {
  if (!uid || !treeId) throw new Error("UID y treeId requeridos");

  await setDoc(
    treeRef(uid, treeId),
    {
      ownerId: uid,
      name: normalizeName(data.name),
      people: normalizePeople(data.people),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function removeTree(uid, treeId) {
  if (!uid || !treeId) throw new Error("UID y treeId requeridos");
  await deleteDoc(treeRef(uid, treeId));
}
