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

export function buildReadOnlyTreeUrl({ treeName = "Mi árbol familiar", people = [] }) {
  if (typeof window === "undefined") return "";

  const payload = {
    version: 1,
    readOnly: true,
    treeName: normalizeText(treeName).trim() || "Mi árbol familiar",
    people: cleanPeopleForShare(people),
  };

  const encoded = encodeUnicode(JSON.stringify(payload));
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("view", "map");
  url.hash = `tree=${encoded}`;
  return url.toString();
}

export function parseReadOnlyTreeFromLocation() {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const params = new URLSearchParams(hash);
  const encoded = params.get("tree");

  if (url.searchParams.get("view") !== "map" || !encoded) return null;

  try {
    const raw = decodeUnicode(encoded);
    const parsed = JSON.parse(raw);

    return {
      readOnly: true,
      treeName: normalizeText(parsed?.treeName).trim() || "Árbol compartido",
      people: cleanPeopleForShare(parsed?.people || []),
    };
  } catch (error) {
    console.error("No se pudo leer el árbol compartido:", error);
    return null;
  }
}

export async function copyReadOnlyTreeLink({ treeName, people }) {
  const url = buildReadOnlyTreeUrl({ treeName, people });
  if (!url) throw new Error("No se pudo crear el enlace.");

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return url;
  }

  const textarea = document.createElement("textarea");
  textarea.value = url;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  return url;
}