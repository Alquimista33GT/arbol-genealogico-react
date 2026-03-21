import { db, auth } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

export const crearFamilia = async (nombre) => {
  const user = auth.currentUser;

  const ref = await addDoc(collection(db, "familias"), {
    nombreFamilia: nombre,
    ownerId: user.uid
  });

  return ref.id;
};

export const agregarPersona = async (familiaId, persona) => {
  return await addDoc(
    collection(db, "familias", familiaId, "personas"),
    persona
  );
};

