import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

function generateSlug() {
  return Math.random().toString(36).substring(2, 10);
}

export async function getUserTrees(uid) {
  const ref = collection(db, "users", uid, "trees");
  const snap = await getDocs(ref);

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function getTree(uid, treeId) {
  const ref = doc(db, "users", uid, "trees", treeId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}

export async function createTree(uid, data = {}) {
  const newId = doc(collection(db, "users", uid, "trees")).id;

  await setDoc(doc(db, "users", uid, "trees", newId), {
    name: data.name || "Mi árbol",
    people: data.people || [],
    isPublic: false,
    publicSlug: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return newId;
}

export async function saveTree(uid, treeId, data = {}) {
  await setDoc(
    doc(db, "users", uid, "trees", treeId),
    {
      name: data.name || "Mi árbol",
      people: Array.isArray(data.people) ? data.people : [],
      isPublic: !!data.isPublic,
      publicSlug: data.publicSlug || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (data.isPublic && data.publicSlug) {
    await setDoc(
      doc(db, "publicTrees", data.publicSlug),
      {
        name: data.name || "Árbol público",
        people: Array.isArray(data.people) ? data.people : [],
        slug: data.publicSlug,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function removeTree(uid, treeId) {
  const tree = await getTree(uid, treeId);

  if (tree?.publicSlug) {
    await deleteDoc(doc(db, "publicTrees", tree.publicSlug));
  }

  await deleteDoc(doc(db, "users", uid, "trees", treeId));
}

export async function makeTreePublic(uid, treeId, data = {}) {
  const existing = await getTree(uid, treeId);
  const slug = existing?.publicSlug || generateSlug();

  await setDoc(
    doc(db, "publicTrees", slug),
    {
      name: data.name || "Árbol público",
      people: Array.isArray(data.people) ? data.people : [],
      slug,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "users", uid, "trees", treeId),
    {
      isPublic: true,
      publicSlug: slug,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return slug;
}

export async function makeTreePrivate(uid, treeId) {
  const treeRef = doc(db, "users", uid, "trees", treeId);
  const snap = await getDoc(treeRef);

  if (!snap.exists()) return;

  const data = snap.data();
  const slug = data.publicSlug;

  if (slug) {
    await deleteDoc(doc(db, "publicTrees", slug));
  }

  await setDoc(
    treeRef,
    {
      isPublic: false,
      publicSlug: "",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getPublicTree(slug) {
  const ref = doc(db, "publicTrees", slug);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}
