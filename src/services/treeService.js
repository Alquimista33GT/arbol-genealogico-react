import {
  collection,
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

function generateSlug() {
  return Math.random().toString(36).substring(2, 10);
}

function normalizePeople(people) {
  return Array.isArray(people) ? people : [];
}

function normalizeName(name) {
  return String(name || "Mi árbol").trim() || "Mi árbol";
}

function userTreeRef(uid, treeId) {
  return doc(db, "users", uid, "trees", treeId);
}

function publicTreeRef(slug) {
  return doc(db, "publicTrees", slug);
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

  const ref = userTreeRef(uid, treeId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}

export async function createTree(uid, data = {}) {
  if (!uid) {
    throw new Error("UID requerido para crear árbol");
  }

  const newRef = doc(collection(db, "users", uid, "trees"));
  const payload = {
    ownerId: uid,
    name: normalizeName(data.name),
    people: normalizePeople(data.people),
    isPublic: false,
    publicSlug: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(newRef, payload);
  return newRef.id;
}

export async function saveTree(uid, treeId, data = {}) {
  if (!uid || !treeId) {
    throw new Error("UID y treeId son requeridos para guardar");
  }

  const payload = {
    ownerId: uid,
    name: normalizeName(data.name),
    people: normalizePeople(data.people),
    isPublic: !!data.isPublic,
    publicSlug: data.publicSlug || "",
    updatedAt: serverTimestamp(),
  };

  await setDoc(userTreeRef(uid, treeId), payload, { merge: true });

  if (payload.isPublic && payload.publicSlug) {
    await setDoc(
      publicTreeRef(payload.publicSlug),
      {
        ownerId: uid,
        treeId,
        name: payload.name,
        people: payload.people,
        slug: payload.publicSlug,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function removeTree(uid, treeId) {
  if (!uid || !treeId) {
    throw new Error("UID y treeId son requeridos para eliminar");
  }

  const tree = await getTree(uid, treeId);

  if (tree?.publicSlug) {
    await deleteDoc(publicTreeRef(tree.publicSlug));
  }

  await deleteDoc(userTreeRef(uid, treeId));
}

export async function makeTreePublic(uid, treeId, data = {}) {
  if (!uid || !treeId) {
    throw new Error("UID y treeId son requeridos para publicar");
  }

  const existing = await getTree(uid, treeId);
  if (!existing) {
    throw new Error("Árbol no encontrado");
  }

  const slug = existing.publicSlug || generateSlug();
  const name = normalizeName(data.name || existing.name);
  const people = normalizePeople(data.people ?? existing.people);

  await setDoc(
    publicTreeRef(slug),
    {
      ownerId: uid,
      treeId,
      slug,
      name,
      people,
      createdAt: existing.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    userTreeRef(uid, treeId),
    {
      ownerId: uid,
      name,
      people,
      isPublic: true,
      publicSlug: slug,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return slug;
}

export async function makeTreePrivate(uid, treeId) {
  if (!uid || !treeId) {
    throw new Error("UID y treeId son requeridos para volver privado");
  }

  const tree = await getTree(uid, treeId);
  if (!tree) return;

  const slug = tree.publicSlug;

  if (slug) {
    await deleteDoc(publicTreeRef(slug));
  }

  await setDoc(
    userTreeRef(uid, treeId),
    {
      isPublic: false,
      publicSlug: "",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getPublicTree(slug) {
  if (!slug) return null;

  const ref = publicTreeRef(slug);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}
