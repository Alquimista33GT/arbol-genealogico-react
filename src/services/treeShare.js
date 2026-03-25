function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function cleanPeopleForShare(rawPeople = []) {
  if (!Array.isArray(rawPeople)) return [];
  return rawPeople.map((person, index) => ({
    id: normalizeText(person?.id || `person-${index}`),
    name: normalizeText(person?.name),
    photo: normalizeText(person?.photo),
    partnerId: normalizeText(person?.partnerId),
    parent1: normalizeText(person?.parent1),
    parent2: normalizeText(person?.parent2),
    birthDate: normalizeText(person?.birthDate),
    birthPlace: normalizeText(person?.birthPlace),
    deathDate: normalizeText(person?.deathDate),
    notes: normalizeText(person?.notes),
  }));
}

function encodeUnicode(value) {
  const input = normalizeText(value);
  if (typeof TextEncoder !== "undefined") {
    const bytes = new TextEncoder().encode(input);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }
  return btoa(unescape(encodeURIComponent(input)));
}

function decodeUnicode(value) {
  if (!value) return "";
  if (typeof TextDecoder !== "undefined") {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return decodeURIComponent(escape(atob(value)));
}

export function createSharePayload({ treeName = "Mi árbol familiar", people = [], profileName = "usuario" }) {
  return {
    version: 1,
    readOnly: true,
    treeName: normalizeText(treeName).trim() || "Mi árbol familiar",
    profileName: normalizeText(profileName).trim() || "usuario",
    people: cleanPeopleForShare(people),
  };
}

export function encodeSharePayload(payload) {
  return encodeUnicode(JSON.stringify(payload));
}

export function decodeSharePayload(encoded) {
  try {
    const raw = decodeUnicode(encoded);
    return JSON.parse(raw);
  } catch (error) {
    console.error("No se pudo decodificar el árbol compartido:", error);
    return null;
  }
}

export function buildReadOnlyTreeUrl({ treeName = "Mi árbol familiar", people = [], profileName = "usuario" }) {
  if (typeof window === "undefined") return "";

  const payload = createSharePayload({ treeName, people, profileName });
  const encoded = encodeSharePayload(payload);

  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("view", "map");
  url.hash = `tree=${encoded}`;
  return url.toString();
}

export function buildMetaShareUrl({ treeName = "Mi árbol familiar", people = [], profileName = "usuario", sourceUrl = "" }) {
  if (!sourceUrl) return "";
  const payload = createSharePayload({ treeName, people, profileName });
  const encoded = encodeURIComponent(encodeSharePayload(payload));
  const url = new URL("/api/share-tree", sourceUrl);
  url.searchParams.set("data", encoded);
  url.searchParams.set("name", payload.treeName);
  url.searchParams.set("profile", payload.profileName);
  return url.toString();
}

export function parseReadOnlyTreeFromLocation() {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const params = new URLSearchParams(hash);
  const encoded = params.get("tree");

  if (url.searchParams.get("view") !== "map" || !encoded) return null;

  const parsed = decodeSharePayload(encoded);
  if (!parsed) return null;

  return {
    readOnly: true,
    treeName: normalizeText(parsed?.treeName).trim() || "Árbol compartido",
    profileName: normalizeText(parsed?.profileName).trim() || "usuario",
    people: cleanPeopleForShare(parsed?.people || []),
  };
}
