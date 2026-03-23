import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createTree,
  getUserTrees,
  getTree,
  saveTree,
  removeTree,
} from "./services/treeService";
import "./FamilyTreeApp.css";
import { exportTreeAsImage, exportTreeAsPdf } from "./treeExport";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyPerson() {
  return {
    id: "",
    name: "",
    photo: "",
    partnerId: "",
    parent1: "",
    parent2: "",
    birthDate: "",
    birthPlace: "",
    deathDate: "",
    notes: "",
  };
}

function formatDate(value) {
  if (!value) return "Sin fecha registrada";
  return value;
}

function getPersonById(people, id) {
  return people.find((p) => p.id === id) || null;
}

function normalizePersonData(person) {
  return {
    ...person,
    name: (person?.name || "Sin nombre").trim() || "Sin nombre",
  };
}

function getChildrenOfFamily(people, memberIds) {
  return people.filter((p) => {
    const parents = [p.parent1, p.parent2].filter(Boolean);
    return parents.some((parentId) => memberIds.includes(parentId));
  });
}

function getPatriarch(people) {
  if (!people.length) return null;

  const roots = people.filter((p) => !p.parent1 && !p.parent2);
  if (roots.length) {
    const partnered = roots.find((p) => p.partnerId);
    return partnered || roots[0];
  }

  return people[0];
}

function buildSingleFlowUnit(people, personId, visited = new Set()) {
  const person = getPersonById(people, personId);
  if (!person || visited.has(person.id)) return null;

  const nextVisited = new Set(visited);
  nextVisited.add(person.id);

  const partner = person.partnerId ? getPersonById(people, person.partnerId) : null;
  if (partner) nextVisited.add(partner.id);

  const memberIds = [person.id, partner?.id].filter(Boolean);
  const allChildren = getChildrenOfFamily(people, memberIds);

  const childUnits = allChildren
    .filter((child) => !nextVisited.has(child.id))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    .map((child) => buildSingleFlowUnit(people, child.id, new Set(nextVisited)))
    .filter(Boolean);

  return {
    key: `${person.id}__${partner?.id || "solo"}`,
    person: normalizePersonData(person),
    partner: partner ? normalizePersonData(partner) : null,
    children: childUnits,
  };
}

function measureUnit(unit, isMobile) {
  const cardW = isMobile ? 220 : 250;
  const cardH = isMobile ? 92 : 102;
  const pairGap = isMobile ? 16 : 20;
  const siblingGap = isMobile ? 22 : 34;
  const levelGap = isMobile ? 170 : 210;
  const selfWidth = unit.partner ? cardW * 2 + pairGap : cardW;

  const measuredChildren = unit.children.map((child) => measureUnit(child, isMobile));
  const childrenWidth = measuredChildren.reduce((acc, child, idx) => acc + child.subtreeWidth + (idx > 0 ? siblingGap : 0), 0);

  return {
    ...unit,
    children: measuredChildren,
    cardW,
    cardH,
    pairGap,
    siblingGap,
    levelGap,
    selfWidth,
    subtreeWidth: Math.max(selfWidth, childrenWidth),
  };
}

function placeUnit(unit, originX, level, isMobile, cards, edges) {
  const centerX = originX + unit.subtreeWidth / 2;
  const topY = level * unit.levelGap;
  const familyStartX = centerX - unit.selfWidth / 2;

  const personX = familyStartX;
  const partnerX = unit.partner ? personX + unit.cardW + unit.pairGap : null;
  const joinX = unit.partner ? (personX + unit.cardW / 2 + partnerX + unit.cardW / 2) / 2 : personX + unit.cardW / 2;

  cards[unit.person.id] = {
    x: personX,
    y: topY,
    width: unit.cardW,
    height: unit.cardH,
    centerX: personX + unit.cardW / 2,
    centerY: topY + unit.cardH / 2,
    role: "person",
    isPatriarch: level === 0,
  };

  if (unit.partner) {
    cards[unit.partner.id] = {
      x: partnerX,
      y: topY,
      width: unit.cardW,
      height: unit.cardH,
      centerX: partnerX + unit.cardW / 2,
      centerY: topY + unit.cardH / 2,
      role: "partner",
      isPatriarch: false,
    };

    edges.push({
      type: "couple",
      fromX: personX + unit.cardW,
      fromY: topY + unit.cardH / 2,
      toX: partnerX,
      toY: topY + unit.cardH / 2,
    });
  }

  unit.anchorX = joinX;

  if (!unit.children.length) return;

  let childCursor = originX + (unit.subtreeWidth - unit.children.reduce((acc, child, idx) => acc + child.subtreeWidth + (idx > 0 ? unit.siblingGap : 0), 0)) / 2;
  const childAnchors = [];

  unit.children.forEach((child) => {
    placeUnit(child, childCursor, level + 1, isMobile, cards, edges);
    childAnchors.push(child.anchorX);
    childCursor += child.subtreeWidth + unit.siblingGap;
  });

  const trunkTopY = topY + unit.cardH;
  const trunkStartY = trunkTopY + (isMobile ? 6 : 10);
  const childTopY = (level + 1) * unit.levelGap;

  childAnchors.forEach((childX) => {
    edges.push({
      type: "branch",
      fromX: joinX,
      fromY: trunkStartY,
      toX: childX,
      toY: childTopY,
    });
  });
}

function buildSingleFlowLayout(people, isMobile) {
  const patriarch = getPatriarch(people);
  if (!patriarch) {
    return { patriarch: null, cards: {}, edges: [], width: isMobile ? 980 : 1480, height: isMobile ? 760 : 960 };
  }

  const rootUnit = buildSingleFlowUnit(people, patriarch.id);
  const measured = measureUnit(rootUnit, isMobile);
  const cards = {};
  const edges = [];
  placeUnit(measured, 0, 0, isMobile, cards, edges);

  const ids = Object.keys(cards);
  const minX = Math.min(...ids.map((id) => cards[id].x));
  const maxX = Math.max(...ids.map((id) => cards[id].x + cards[id].width));
  const maxY = Math.max(...ids.map((id) => cards[id].y + cards[id].height));
  const padX = isMobile ? 90 : 160;
  const padY = isMobile ? 80 : 120;

  ids.forEach((id) => {
    cards[id].x = cards[id].x - minX + padX;
    cards[id].y = cards[id].y + padY;
    cards[id].centerX = cards[id].x + cards[id].width / 2;
    cards[id].centerY = cards[id].y + cards[id].height / 2;
  });

  edges.forEach((edge) => {
    edge.fromX = edge.fromX - minX + padX;
    edge.toX = edge.toX - minX + padX;
    edge.fromY += padY;
    edge.toY += padY;
  });

  return {
    patriarch,
    cards,
    edges,
    width: Math.max(maxX - minX + padX * 2, isMobile ? 980 : 1500),
    height: Math.max(maxY + padY * 2 + (isMobile ? 90 : 140), isMobile ? 760 : 940),
  };
}


function normalizeId(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function cleanPeopleForCloud(rawPeople = []) {
  if (!Array.isArray(rawPeople)) return [];

  return rawPeople.map((person, index) => ({
    id: normalizeId(person?.id || `person-${index}`),
    name: normalizeText(person?.name).trim(),
    photo: normalizeText(person?.photo),
    partnerId: normalizeId(person?.partnerId),
    parent1: normalizeId(person?.parent1),
    parent2: normalizeId(person?.parent2),
    birthDate: normalizeText(person?.birthDate),
    birthPlace: normalizeText(person?.birthPlace),
    deathDate: normalizeText(person?.deathDate),
    notes: normalizeText(person?.notes),
  }));
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function edgePath(edge) {
  if (edge.type === "couple") {
    const dx = Math.abs(edge.toX - edge.fromX);
    const curve = Math.max(10, Math.min(28, dx * 0.18));
    return `M ${edge.fromX} ${edge.fromY} C ${edge.fromX + curve} ${edge.fromY}, ${edge.toX - curve} ${edge.toY}, ${edge.toX} ${edge.toY}`;
  }

  if (edge.type === "branch") {
    const dy = edge.toY - edge.fromY;
    const spread = Math.abs(edge.toX - edge.fromX);
    const c1y = edge.fromY + Math.max(20, dy * 0.14);
    const c2y = edge.fromY + Math.max(42, dy * 0.36);
    const c3y = edge.toY - Math.max(18, dy * 0.1);
    const drift = Math.max(12, Math.min(44, spread * 0.12));
    const c1x = edge.fromX;
    const c2x = edge.fromX + (edge.toX > edge.fromX ? drift : -drift);
    const c3x = edge.toX - (edge.toX > edge.fromX ? drift * 0.35 : -drift * 0.35);
    return `M ${edge.fromX} ${edge.fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${c3x} ${c3y} S ${edge.toX} ${edge.toY - 4}, ${edge.toX} ${edge.toY}`;
  }

  const midY = (edge.fromY + edge.toY) / 2;
  return `M ${edge.fromX} ${edge.fromY} C ${edge.fromX} ${midY}, ${edge.toX} ${midY}, ${edge.toX} ${edge.toY}`;
}

function PersonCard({ person, layout, activeProfileId, setActiveProfileId, onQuickAddChild, highlighted }) {
  const isOpen = activeProfileId === person.id;
  const initial = (person.name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`ft-card ${highlighted ? "is-highlighted" : ""} ${isOpen ? "is-open" : ""} ${layout.isPatriarch ? "is-patriarch" : ""} ${person.deathDate ? "is-deceased" : ""}`}
      style={{ left: layout.x, top: layout.y, width: layout.width }}
      onClick={() => setActiveProfileId(isOpen ? "" : person.id)}
    >
      <div className="ft-card-main">
        <div className="ft-avatar-wrap">
          {person.photo ? (
            <img className="ft-avatar" src={person.photo} alt={person.name} />
          ) : (
            <div className="ft-avatar ft-avatar-fallback">{initial}</div>
          )}
        </div>

        <div className="ft-card-texts">
          {layout.isPatriarch ? <div className="ft-card-badge">Patriarca</div> : null}
          <div className="ft-card-name" title={person.name || "Sin nombre"}>{person.name || "Sin nombre"}</div>
          <div className="ft-card-date">{formatDate(person.birthDate)}{person.deathDate ? ` · † ${formatDate(person.deathDate)}` : ""}</div>
        </div>

        <button
          type="button"
          className="ft-mini-add"
          onClick={(e) => {
            e.stopPropagation();
            onQuickAddChild(person);
          }}
          title="Agregar hijo"
        >
          +
        </button>
      </div>

      {isOpen ? <div className="ft-profile-arrow" /> : null}
    </div>
  );
}

function ProfilePopover({ person, people, layout, onEditPerson, onDeletePerson, onQuickAddChild, onQuickAddPartner, onClose }) {
  if (!person || !layout) return null;

  const parent1 = getPersonById(people, person.parent1);
  const parent2 = getPersonById(people, person.parent2);
  const partner = getPersonById(people, person.partnerId);
  const children = people.filter((p) => p.parent1 === person.id || p.parent2 === person.id);

  return (
    <div className="ft-profile-popover" style={{ left: layout.x + layout.width / 2, top: layout.y + layout.height + 16 }}>
      <div className="ft-profile-card">
        <button type="button" className="ft-profile-close" onClick={onClose}>×</button>

        <div className="ft-profile-head">
          {person.photo ? (
            <img className="ft-profile-photo" src={person.photo} alt={person.name} />
          ) : (
            <div className="ft-profile-photo ft-avatar-fallback">{(person.name || "?").trim().charAt(0).toUpperCase() || "?"}</div>
          )}
          <div>
            <div className="ft-profile-name">{person.name || "Sin nombre"}</div>
            <div className="ft-profile-sub">{formatDate(person.birthDate)}</div>
          </div>
        </div>

        <div className="ft-profile-grid">
          <div><span>Lugar:</span> {person.birthPlace || "Sin dato"}</div>
          <div><span>Pareja:</span> {partner?.name || "Sin pareja"}</div>
          <div><span>Padre:</span> {parent1?.name || "Sin dato"}</div>
          <div><span>Madre:</span> {parent2?.name || "Sin dato"}</div>
          <div><span>Fallecimiento:</span> {person.deathDate ? formatDate(person.deathDate) : "Sin dato"}</div>
          <div><span>Hijos:</span> {children.length}</div>
          <div><span>Notas:</span> {person.notes || "Sin notas"}</div>
        </div>

        <div className="ft-profile-actions">
          <button type="button" className="ft-btn ft-btn-primary" onClick={() => onEditPerson(person)}>Editar</button>
          <button type="button" className="ft-btn ft-btn-success" onClick={() => onQuickAddChild(person)}>+ Hijo</button>
          <button type="button" className="ft-btn ft-btn-muted" onClick={() => onQuickAddPartner(person)}>+ Pareja</button>
          <button type="button" className="ft-btn ft-btn-danger" onClick={() => onDeletePerson(person.id)}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

function PersonModal({ open, form, setForm, people, onClose, onSave, onDeleteCurrent }) {
  if (!open) return null;

  return (
    <div className="ft-modal-backdrop" onClick={onClose}>
      <div className="ft-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ft-modal-head">
          <h3>{form.id ? "Editar familiar" : "Agregar familiar"}</h3>
          <button type="button" className="ft-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="ft-form-grid">
          <label>
            <span>Nombre completo</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>

          <label>
            <span>Pareja</span>
            <select value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })}>
              <option value="">Selecciona pareja</option>
              {people.filter((p) => p.id !== form.id).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Padre</span>
            <select value={form.parent1} onChange={(e) => setForm({ ...form, parent1: e.target.value })}>
              <option value="">Selecciona una persona</option>
              {people.filter((p) => p.id !== form.id).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Madre</span>
            <select value={form.parent2} onChange={(e) => setForm({ ...form, parent2: e.target.value })}>
              <option value="">Selecciona una persona</option>
              {people.filter((p) => p.id !== form.id).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Fecha de nacimiento</span>
            <input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          </label>

          <label>
            <span>Lugar de nacimiento</span>
            <input value={form.birthPlace} onChange={(e) => setForm({ ...form, birthPlace: e.target.value })} />
          </label>

          <label>
            <span>Fecha de muerte</span>
            <input type="date" value={form.deathDate} onChange={(e) => setForm({ ...form, deathDate: e.target.value })} />
          </label>

          <label className="ft-form-full">
            <span>Notas</span>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} />
          </label>

          <label className="ft-form-full">
            <span>Foto</span>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const photo = await readAsDataUrl(file);
                setForm((prev) => ({ ...prev, photo }));
              }}
            />
          </label>
        </div>

        <div className="ft-modal-actions">
          <button type="button" className="ft-btn ft-btn-primary" onClick={onSave}>Guardar</button>
          {form.id ? <button type="button" className="ft-btn ft-btn-danger" onClick={onDeleteCurrent}>Eliminar</button> : null}
        </div>
      </div>
    </div>
  );
}

export default function FamilyTreeApp({ user }) {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 900 : false);
  const [currentTreeId, setCurrentTreeId] = useState("");
  const [treeName, setTreeName] = useState("Mi árbol familiar");
  const [people, setPeople] = useState([]);
  const [zoom, setZoom] = useState(isMobile ? 0.82 : 1);
  const [searchText, setSearchText] = useState("");
  const [activeProfileId, setActiveProfileId] = useState("");
  const [form, setForm] = useState(emptyPerson());
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [statusText, setStatusText] = useState("Cargando");
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState("");
  const [saveTone, setSaveTone] = useState("idle");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewportRef = useRef(null);
  const exportRef = useRef(null);
  const mapShellRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  const showSaveToast = useCallback((message, tone = "saved", duration = 2200) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setSaveTone(tone);
    setSaveToast(message);
    toastTimeoutRef.current = setTimeout(() => {
      setSaveToast("");
      setSaveTone("idle");
    }, duration);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const local = localStorage.getItem("ft-local-tree");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        setPeople(parsed.people || []);
        setTreeName(parsed.treeName || "Mi árbol familiar");
      } catch {}
    }
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadCloud() {
      try {
        const ownerId = user?.uid || user?.id || user?.email || "local-user";
        const list = await getUserTrees(ownerId);
        if (!alive || !Array.isArray(list)) return;
        if (list.length) {
          const firstId = list[0].id || list[0].treeId;
          const remote = await getTree(firstId);
          if (!alive || !remote) return;
          setCurrentTreeId(firstId);
          setTreeName(remote.name || remote.treeName || "Mi árbol familiar");
          setPeople(Array.isArray(remote.people) ? remote.people : []);
        }
        setStatusText("Listo");
      } catch {
        setStatusText("Modo local");
      }
    }
    loadCloud();
    return () => {
      alive = false;
    };
  }, [user]);

  const persistTreeToCloud = useCallback(async (options = {}) => {
    const { silent = false, source = "auto" } = options;
    const ownerId = normalizeText(user?.uid || user?.id || user?.email || "local-user");
    const payload = {
      name: normalizeText(treeName || "Mi árbol familiar").trim() || "Mi árbol familiar",
      treeName: normalizeText(treeName || "Mi árbol familiar").trim() || "Mi árbol familiar",
      ownerId,
      people: cleanPeopleForCloud(people),
      updatedAt: Date.now(),
    };

    localStorage.setItem("ft-local-tree", JSON.stringify({ treeName: payload.name, people: payload.people }));
    if (!payload.name.trim() && !payload.people.length) return true;

    setIsSaving(true);
    setStatusText("Guardando en la nube...");
    if (!silent) showSaveToast(source === "manual" ? "Guardando..." : "Guardando en la nube...", "saving", 1800);

    try {
      if (currentTreeId) {
        await saveTree(String(currentTreeId), payload);
      } else if (payload.people.length) {
        const created = await createTree(payload);
        if (created?.id) setCurrentTreeId(String(created.id));
      }
      setStatusText("Guardado en la nube");
      if (!silent) {
        showSaveToast(source === "manual" ? "Guardado correctamente" : "Guardado en la nube", "saved");
      }
      return true;
    } catch (error) {
      console.error("Error guardando en nube:", error);
      setStatusText("Guardado local");
      if (!silent) {
        const detail = error?.message ? `Error nube: ${error.message}` : source === "manual" ? "No se pudo guardar" : "No se pudo guardar en la nube";
        showSaveToast(detail, "error", 3200);
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [treeName, people, currentTreeId, user, showSaveToast]);

  useEffect(() => {
    localStorage.setItem("ft-local-tree", JSON.stringify({ treeName, people }));
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistTreeToCloud({ silent: false, source: "auto" });
    }, 1200);
    return () => saveTimeoutRef.current && clearTimeout(saveTimeoutRef.current);
  }, [persistTreeToCloud]);

  useEffect(() => {
    function onFullscreenChange() {
      const current = document.fullscreenElement;
      setIsFullscreen(Boolean(current && mapShellRef.current && current === mapShellRef.current));
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const autoLayout = useMemo(() => buildSingleFlowLayout(people, isMobile), [people, isMobile]);
  const cards = autoLayout.cards;
  const activeLayout = activeProfileId ? cards[activeProfileId] : null;
  const searchLower = searchText.trim().toLowerCase();
  const publicTreeUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    if (currentTreeId) return `${window.location.origin}${window.location.pathname}?tree=${currentTreeId}`;
    return window.location.href;
  }, [currentTreeId]);

  async function handleCopyTreeLink() {
    try {
      await navigator.clipboard.writeText(publicTreeUrl);
      setStatusText("Enlace copiado");
    } catch (error) {
      console.error(error);
      window.alert("No se pudo copiar el enlace");
    }
  }

  async function handleShareTree() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: treeName || "Árbol Genealógico",
          text: "Mira este árbol genealógico",
          url: publicTreeUrl,
        });
        setStatusText("Compartido");
        return;
      }
      await handleCopyTreeLink();
      window.alert("Enlace copiado para compartir");
    } catch (error) {
      console.error(error);
    }
  }

  async function handleCreateImage() {
    try {
      if (!exportRef.current) return;
      setStatusText("Creando imagen");
      await exportTreeAsImage(exportRef.current, autoLayout.width, autoLayout.height, treeName || "arbol-genealogico");
      setStatusText("Imagen creada");
    } catch (error) {
      console.error(error);
      setStatusText("No se pudo crear imagen");
      window.alert("No se pudo crear la imagen del árbol");
    }
  }

  async function handleCreatePdf() {
    try {
      if (!exportRef.current) return;
      setStatusText("Creando PDF");
      await exportTreeAsPdf(exportRef.current, autoLayout.width, autoLayout.height, treeName || "arbol-genealogico");
      setStatusText("PDF creado");
    } catch (error) {
      console.error(error);
      setStatusText("No se pudo crear PDF");
      window.alert("No se pudo crear el PDF del árbol");
    }
  }

  async function handleManualSave() {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    await persistTreeToCloud({ silent: false, source: "manual" });
  }

  function openNewPerson(base = {}) {
    setForm({ ...emptyPerson(), ...base });
    setPersonModalOpen(true);
  }

  function handleSavePerson() {
    if (!form.name.trim()) return;

    const nextPerson = { ...form, id: form.id || uid() };

    setPeople((prev) => {
      const exists = prev.some((p) => p.id === nextPerson.id);
      let next = exists ? prev.map((p) => (p.id === nextPerson.id ? nextPerson : p)) : [...prev, nextPerson];

      if (nextPerson.partnerId) {
        next = next.map((p) => (p.id === nextPerson.partnerId ? { ...p, partnerId: nextPerson.id } : p));
      }

      return next;
    });

    setPersonModalOpen(false);
    setActiveProfileId(nextPerson.id);
  }

  function handleDeletePerson(personId) {
    if (!window.confirm("¿Eliminar este familiar?")) return;
    setPeople((prev) => prev.filter((p) => p.id !== personId).map((p) => ({
      ...p,
      partnerId: p.partnerId === personId ? "" : p.partnerId,
      parent1: p.parent1 === personId ? "" : p.parent1,
      parent2: p.parent2 === personId ? "" : p.parent2,
    })));
    if (activeProfileId === personId) setActiveProfileId("");
    if (form.id === personId) setPersonModalOpen(false);
  }

  function handleEditPerson(person) {
    setForm({ ...emptyPerson(), ...person });
    setPersonModalOpen(true);
  }

  function handleQuickAddChild(parent) {
    setForm({ ...emptyPerson(), parent1: parent.id, parent2: parent.partnerId || "" });
    setPersonModalOpen(true);
  }

  function handleQuickAddPartner(person) {
    setForm({ ...emptyPerson(), partnerId: person.id });
    setPersonModalOpen(true);
  }

  function handleAutoCenter() {
    const container = viewportRef.current;
    if (!container) return;
    container.scrollTo({
      left: Math.max((autoLayout.width * zoom - container.clientWidth) / 2, 0),
      top: 0,
      behavior: "smooth",
    });
  }

  async function toggleMapFullscreen() {
    try {
      const target = mapShellRef.current;
      if (!target) return;
      if (document.fullscreenElement === target) {
        await document.exitFullscreen();
        return;
      }
      await target.requestFullscreen();
    } catch (error) {
      console.error(error);
      window.alert("La pantalla completa no está disponible en este navegador o dispositivo.");
    }
  }

  useEffect(() => {
    const t = setTimeout(handleAutoCenter, 80);
    return () => clearTimeout(t);
  }, [autoLayout.width, autoLayout.height, zoom]);

  const patriarchName = autoLayout.patriarch?.name || "Sin patriarca";

  return (
    <div className="ft-shell">
      <header className="ft-topbar">
        <div className="ft-brand">
          <div className="ft-logo">R</div>
          <div>
            <div className="ft-title">Árbol Genealógico</div>
            <div className="ft-subtitle">Espacio personal de {user?.email?.split("@")[0] || "usuario"}</div>
          </div>
        </div>

        <div className="ft-top-actions">
          <button type="button" className="ft-btn ft-btn-light" onClick={() => (window.location.href = "/")}>Volver al inicio</button>
          <button type="button" className="ft-btn ft-btn-danger">Cerrar sesión</button>
        </div>
      </header>

      <section className="ft-toolbar">
        <div className="ft-toolbar-left">
          <input className="ft-search" placeholder="Buscar familiar" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>

        <div className="ft-toolbar-right">
          <input className="ft-tree-name" value={treeName} onChange={(e) => setTreeName(e.target.value)} />
          <div className={`ft-status ${isSaving ? "is-saving" : ""}`}>{statusText}</div>
          <button type="button" className="ft-btn ft-btn-primary" onClick={handleManualSave} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
          {currentTreeId ? (
            <button
              type="button"
              className="ft-btn ft-btn-light"
              onClick={async () => {
                if (!window.confirm("¿Eliminar este árbol?")) return;
                try { await removeTree(currentTreeId); } catch {}
                setCurrentTreeId("");
                setPeople([]);
              }}
            >
              Reiniciar
            </button>
          ) : null}
        </div>
      </section>

      <section className="ft-share-panel">
        <div className="ft-share-info">
          <div className="ft-share-title">Compartir árbol</div>
          <div className="ft-share-subtitle">Comparte por enlace o copia el link de este árbol familiar.</div>
          <div className="ft-share-link" title={publicTreeUrl}>{publicTreeUrl}</div>
        </div>
        <div className="ft-share-actions">
          <button type="button" className="ft-btn ft-btn-primary" onClick={handleShareTree}>Compartir</button>
          <button type="button" className="ft-btn ft-btn-light" onClick={handleCopyTreeLink}>Copiar enlace</button>
          <button type="button" className="ft-btn ft-btn-light" onClick={handleCreateImage}>Crear imagen</button>
          <button type="button" className="ft-btn ft-btn-light" onClick={handleCreatePdf}>Crear PDF</button>
        </div>
      </section>

      <section className="ft-info-band">
        Flujo único desde el patriarca: <strong>{patriarchName}</strong>. Cada nueva pareja se mantiene en bloque y los descendientes siguen hacia abajo.
      </section>

      <div className={`ft-map-shell ${isFullscreen ? "is-fullscreen" : ""}`} ref={mapShellRef}>
        <section className="ft-map-controls">
          <div className="ft-map-controls-row">
            <button type="button" className="ft-btn ft-btn-primary" onClick={() => openNewPerson()}>+ Agregar familiar</button>
            <button type="button" className="ft-btn ft-btn-light" onClick={handleAutoCenter}>Centrar</button>
            <button type="button" className="ft-btn ft-btn-light" onClick={handleShareTree}>Compartir</button>
            <button type="button" className="ft-btn ft-btn-light ft-zoom-btn" onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}>−</button>
            <div className="ft-zoom-chip">{Math.round(zoom * 100)}%</div>
            <button type="button" className="ft-btn ft-btn-light ft-zoom-btn" onClick={() => setZoom((z) => Math.min(1, z + 0.1))}>+</button>
            <button type="button" className="ft-btn ft-btn-light ft-fullscreen-btn" onClick={toggleMapFullscreen}>{isFullscreen ? "Salir pantalla completa" : "Pantalla completa"}</button>
          </div>
        </section>

        <div className="ft-map-viewport" ref={viewportRef}>
        <div className="ft-map-stage" style={{ width: autoLayout.width * zoom, height: autoLayout.height * zoom }}>
          <div ref={exportRef} className="ft-map-transform" style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: autoLayout.width, height: autoLayout.height }}>
            <svg className="ft-lines" width={autoLayout.width} height={autoLayout.height}>
              {autoLayout.edges.map((edge, index) => (
                <path key={index} d={edgePath(edge)} className={`ft-line-path ${edge.type === "couple" ? "is-couple" : ""}`} />
              ))}
            </svg>

            {people.map((person) => {
              const layout = cards[person.id];
              if (!layout) return null;
              const highlighted = searchLower ? (person.name || "").toLowerCase().includes(searchLower) : false;
              return (
                <PersonCard
                  key={person.id}
                  person={person}
                  layout={layout}
                  activeProfileId={activeProfileId}
                  setActiveProfileId={setActiveProfileId}
                  onQuickAddChild={handleQuickAddChild}
                  highlighted={highlighted}
                />
              );
            })}

            {activeProfileId ? (
              <ProfilePopover
                person={getPersonById(people, activeProfileId)}
                people={people}
                layout={activeLayout}
                onEditPerson={handleEditPerson}
                onDeletePerson={handleDeletePerson}
                onQuickAddChild={handleQuickAddChild}
                onQuickAddPartner={handleQuickAddPartner}
                onClose={() => setActiveProfileId("")}
              />
            ) : null}
          </div>
        </div>
        </div>
      </div>

      {saveToast ? (
        <div className={`ft-save-toast is-${saveTone}`}>{saveToast}</div>
      ) : null}

      <PersonModal
        open={personModalOpen}
        form={form}
        setForm={setForm}
        people={people}
        onClose={() => setPersonModalOpen(false)}
        onSave={handleSavePerson}
        onDeleteCurrent={() => handleDeletePerson(form.id)}
      />
    </div>
  );
}
