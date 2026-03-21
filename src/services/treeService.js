import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

function generateSlug(length = 14) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function createTree(uid, data = {}) {
  const treesRef = collection(db, "users", uid, "trees");

  const payload = {
    name: data.name || "Mi árbol familiar",
    description: data.description || "",
    ownerUid: uid,
    isPublic: false,
    publicSlug: "",
    people: Array.isArray(data.people) ? data.people : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(treesRef, payload);
  return docRef.id;
}

export async function getUserTrees(uid) {
  const treesRef = collection(db, "users", uid, "trees");
  const q = query(treesRef, orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
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

export async function saveTree(uid, treeId, data = {}) {
  const ref = doc(db, "users", uid, "trees", treeId);

  const payload = {
    name: data.name || "Mi árbol familiar",
    description: data.description || "",
    ownerUid: uid,
    people: Array.isArray(data.people) ? data.people : [],
    isPublic: !!data.isPublic,
    publicSlug: data.publicSlug || "",
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload, { merge: true });

  if (payload.isPublic && payload.publicSlug) {
    const publicRef = doc(db, "publicTrees", payload.publicSlug);

    await setDoc(
      publicRef,
      {
        slug: payload.publicSlug,
        treeId,
        ownerUid: uid,
        name: payload.name,
        description: payload.description,
        people: payload.people,
        isPublic: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function removeTree(uid, treeId) {
  const tree = await getTree(uid, treeId);

  if (tree?.publicSlug) {
    const publicRef = doc(db, "publicTrees", tree.publicSlug);
    await deleteDoc(publicRef);
  }

  const ref = doc(db, "users", uid, "trees", treeId);
  await deleteDoc(ref);
}

export async function makeTreePublic(uid, treeId, data = {}) {
  const tree = await getTree(uid, treeId);
  if (!tree) {
    throw new Error("No se encontró el árbol");
  }

  const slug = tree.publicSlug || generateSlug();

  const privateRef = doc(db, "users", uid, "trees", treeId);
  const publicRef = doc(db, "publicTrees", slug);

  const name = data.name || tree.name || "Mi árbol familiar";
  const description = data.description ?? tree.description ?? "";
  const people = Array.isArray(data.people) ? data.people : tree.people || [];

  await setDoc(
    privateRef,
    {
      name,
      description,
      ownerUid: uid,
      people,
      isPublic: true,
      publicSlug: slug,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    publicRef,
    {
      slug,
      treeId,
      ownerUid: uid,
      name,
      description,
      people,
      isPublic: true,
      updatedAt: serverTimestamp(),
      createdAt: tree.createdAt || serverTimestamp(),
    },
    { merge: true }
  );

  return slug;
}

export async function makeTreePrivate(uid, treeId) {
  const tree = await getTree(uid, treeId);
  if (!tree) {
    throw new Error("No se encontró el árbol");
  }

  const privateRef = doc(db, "users", uid, "trees", treeId);

  await setDoc(
    privateRef,
    {
      isPublic: false,
      publicSlug: "",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (tree.publicSlug) {
    const publicRef = doc(db, "publicTrees", tree.publicSlug);
    await deleteDoc(publicRef);
  }
}

export async function getPublicTreeBySlug(slug) {
  const ref = doc(db, "publicTrees", slug);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}
