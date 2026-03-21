import { useEffect, useMemo, useRef, useState } from "react";
import {
  createTree,
  getUserTrees,
  getTree,
  saveTree,
  removeTree,
  makeTreePublic,
  makeTreePrivate,
} from "./services/treeService";

const STORAGE_KEY = "arbol_genealogico_pro_v1";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyPerson() {
  return {
    id: null,
    name: "",
    photo: "",
    partnerId: "",
    parent1: "",
    parent2: "",
    birthDate: "",
    birthPlace: "",
    notes: "",
  };
}

function getPersonById(people, id) {
  return people.find((p) => p.id === id) || null;
}

function getRoots(people) {
  return people.filter((p) => !p.parent1 && !p.parent2);
}

function getChildrenOfPair(people, aId, bId = "") {
  const ids = new Set();
  for (const p of people) {
    const hasA = aId && (p.parent1 === aId || p.parent2 === aId);
    const hasB = bId && (p.parent1 === bId || p.parent2 === bId);
    if (hasA || hasB) ids.add(p.id);
  }
  return [...ids].map((id) => getPersonById(people, id)).filter(Boolean);
}

function buildTree(people, personId, collapsedSet, visited = new Set()) {
  const person = getPersonById(people, personId);
  if (!person || visited.has(personId)) return null;

  const nextVisited = new Set(visited);
  nextVisited.add(personId);

  const partner = person.partnerId ? getPersonById(people, person.partnerId) : null;
  if (partner) nextVisited.add(partner.id);

  const allChildren = getChildrenOfPair(people, person.id, partner?.id || "");
  const isCollapsed = collapsedSet.has(person.id);

  const children = isCollapsed
    ? []
    : allChildren
        .filter((child) => !nextVisited.has(child.id))
        .map((child) => buildTree(people, child.id, collapsedSet, nextVisited))
        .filter(Boolean);

  return {
    id: person.id,
    person,
    partner,
    children,
    hiddenChildrenCount: allChildren.length,
    collapsed: isCollapsed,
  };
}

function measureTree(node, level = 0, layout = { levels: [], nodes: [], edges: [] }) {
  if (!node) return layout;

  if (!layout.levels[level]) layout.levels[level] = [];
  layout.levels[level].push(node);
  layout.nodes.push(node);

  node.children.forEach((child) => {
    layout.edges.push({ from: node.id, to: child.id });
    measureTree(child, level + 1, layout);
  });

  return layout;
}

function createPositions(layout) {
  const positions = {};
  const gapX = 580;
  const gapY = 540;

  layout.levels.forEach((nodes, levelIndex) => {
    const count = nodes.length;
    const totalWidth = Math.max(count * gapX, gapX);
    const startX = -totalWidth / 2 + gapX / 2;

    nodes.forEach((node, i) => {
      positions[node.id] = {
        x: startX + i * gapX,
        y: levelIndex * gapY,
      };
    });
  });

  return positions;
}

function curvePath(x1, y1, x2, y2) {
  const midY = y1 + (y2 - y1) * 0.45;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

function personSummary(person) {
  const parts = [];
  if (person.birthDate) parts.push(`Nac: ${person.birthDate}`);
  if (person.birthPlace) parts.push(`Lugar: ${person.birthPlace}`);
  return parts;
}

function cloudStatusText(status) {
  switch (status) {
    case "saved":
      return "Guardado";
    case "loaded":
      return "Cargado";
    case "created":
      return "Creado";
    case "shared":
      return "Compartido";
    case "error":
      return "Error";
    default:
      return "Local";
  }
}

function PersonMini({
  person,
  onEdit,
  onDelete,
  onQuickAddPartner,
  onQuickAddChild,
}) {
  const details = personSummary(person);

  return (
    <div xmlns="http://www.w3.org/1999/xhtml" style={personMiniStyle}>
      <div style={personMiniImageWrapStyle}>
        {person.photo ? (
          <img src={person.photo} alt={person.name} style={imageStyle} />
        ) : (
          <div style={imagePlaceholderStyle}>Sin foto</div>
        )}
      </div>

      <div style={personMiniNameStyle}>{person.name}</div>

      <div style={personMiniInfoStyle}>
        {details.length > 0 ? (
          details.map((item, idx) => <div key={idx}>{item}</div>)
        ) : (
          <div style={{ color: "#94a3b8" }}>Sin datos</div>
        )}
      </div>

      <div style={personMiniButtonsStyle}>
        <button style={editButtonStyle} onClick={() => onEdit(person)}>
          Editar
        </button>
        <button style={deleteButtonStyle} onClick={() => onDelete(person.id)}>
          Eliminar
        </button>
      </div>

      <div style={personMiniButtonsStyle}>
        {!person.partnerId ? (
          <button style={softGreenButtonStyle} onClick={() => onQuickAddPartner(person)}>
            + Pareja
          </button>
        ) : (
          <div style={{ flex: 1 }} />
        )}
        <button style={softBlueButtonStyle} onClick={() => onQuickAddChild(person)}>
          + Hijo
        </button>
      </div>
    </div>
  );
}

function FamilyBlock({
  node,
  x,
  y,
  root,
  onEdit,
  onDelete,
  onQuickAddPartner,
  onQuickAddChild,
  onToggleCollapse,
  onOpenFamily,
  highlightedId,
}) {
  const { person, partner, hiddenChildrenCount, collapsed } = node;
  const w = partner ? 540 : 290;
  const h = root ? 460 : 440;
  const left = x - w / 2;
  const top = y;
  const blockTitle = partner ? "Unidad familiar" : "Persona / núcleo";
  const isHighlighted =
    highlightedId && (highlightedId === person.id || highlightedId === partner?.id);

  return (
    <foreignObject x={left} y={top} width={w} height={h}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          ...(root ? familyBlockRootStyle : familyBlockStyle),
          ...(isHighlighted ? highlightedBlockStyle : {}),
        }}
      >
        <div style={familyHeaderRowStyle}>
          <div style={familyHeaderStyle}>{blockTitle}</div>
          {hiddenChildrenCount > 0 ? (
            <button style={collapseButtonStyle} onClick={() => onToggleCollapse(person.id)}>
              {collapsed ? `Abrir (${hiddenChildrenCount})` : `Ocultar (${hiddenChildrenCount})`}
            </button>
          ) : null}
        </div>

        <div style={partner ? familyPeopleRowStyle : familyPeopleSingleStyle}>
          <PersonMini
            person={person}
            onEdit={onEdit}
            onDelete={onDelete}
            onQuickAddPartner={onQuickAddPartner}
            onQuickAddChild={onQuickAddChild}
          />

          {partner ? (
            <>
              <div style={partnerCenterLinkWrapStyle}>
                <div style={partnerCenterLinkStyle} />
              </div>

              <PersonMini
                person={partner}
                onEdit={onEdit}
                onDelete={onDelete}
                onQuickAddPartner={onQuickAddPartner}
                onQuickAddChild={onQuickAddChild}
              />
            </>
          ) : null}
        </div>

        <div style={familyBottomMetaStyle}>
          <span style={metaChipStyle}>
            {hiddenChildrenCount} hijo{hiddenChildrenCount === 1 ? "" : "s"}
          </span>
          {partner ? <span style={metaChipBlueStyle}>Pareja enlazada</span> : null}
        </div>

        <div style={familyBottomActionsStyle}>
          <button style={familyActionButtonGreen} onClick={() => onQuickAddChild(person)}>
            + Agregar hijo
          </button>

          {!partner ? (
            <button style={familyActionButtonBlue} onClick={() => onQuickAddPartner(person)}>
              + Agregar pareja
            </button>
          ) : (
            <button style={familyActionButtonGray} onClick={() => onOpenFamily(node)}>
              Editar familia
            </button>
          )}
        </div>
      </div>
    </foreignObject>
  );
}

function PersonEditorPanel({
  open,
  people,
  form,
  setForm,
  onSave,
  onClose,
  onDeleteCurrent,
  onImage,
}) {
  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div style={sidePanelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelTitleStyle}>
            {form.id ? "Editar familiar" : "Agregar familiar"}
          </div>
          <button style={panelCloseStyle} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={panelBodyStyle}>
          <label style={labelStyle}>Nombre</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={inputStyle}
            placeholder="Nombre del familiar"
          />

          <label style={labelStyle}>Pareja</label>
          <select
            value={form.partnerId}
            onChange={(e) => setForm({ ...form, partnerId: e.target.value })}
            style={inputStyle}
          >
            <option value="">Selecciona pareja</option>
            {people.filter((p) => p.id !== form.id).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Padre / Madre 1</label>
          <select
            value={form.parent1}
            onChange={(e) => setForm({ ...form, parent1: e.target.value })}
            style={inputStyle}
          >
            <option value="">Selecciona una persona</option>
            {people.filter((p) => p.id !== form.id).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Padre / Madre 2</label>
          <select
            value={form.parent2}
            onChange={(e) => setForm({ ...form, parent2: e.target.value })}
            style={inputStyle}
          >
            <option value="">Selecciona una persona</option>
            {people.filter((p) => p.id !== form.id).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Fecha de nacimiento</label>
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            style={inputStyle}
          />

          <label style={labelStyle}>Lugar de nacimiento</label>
          <input
            type="text"
            value={form.birthPlace}
            onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
            style={inputStyle}
            placeholder="Lugar de nacimiento"
          />

          <label style={labelStyle}>Foto</label>
          <input type="file" accept="image/*" onChange={onImage} style={fileInputStyle} />
          {form.photo ? (
            <div style={sidePreviewWrapStyle}>
              <img src={form.photo} alt="Preview" style={previewImageStyle} />
            </div>
          ) : null}

          <label style={labelStyle}>Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            style={textareaStyle}
            placeholder="Notas"
          />

          <div style={sideButtonRowStyle}>
            <button style={primaryButton} onClick={onSave}>
              {form.id ? "Guardar cambios" : "Guardar"}
            </button>
            {form.id ? (
              <button style={dangerButton} onClick={onDeleteCurrent}>
                Eliminar
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function FamilyPanel({
  open,
  node,
  people,
  onClose,
  onEditPerson,
  onQuickAddChild,
  onQuickAddPartner,
}) {
  if (!open || !node) return null;

  const children = getChildrenOfPair(people, node.person.id, node.partner?.id || "");

  return (
    <div style={overlayCenterStyle}>
      <div style={familyPanelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelTitleStyle}>Panel familiar</div>
          <button style={panelCloseStyle} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={familyPanelBodyStyle}>
          <div style={familySectionStyle}>
            <div style={familySectionTitleStyle}>Principal</div>
            <div style={familyItemCardStyle}>
              <div style={familyItemNameStyle}>{node.person.name}</div>
              <button style={secondaryButton} onClick={() => onEditPerson(node.person)}>
                Editar principal
              </button>
            </div>
          </div>

          <div style={familySectionStyle}>
            <div style={familySectionTitleStyle}>Pareja</div>
            {node.partner ? (
              <div style={familyItemCardStyle}>
                <div style={familyItemNameStyle}>{node.partner.name}</div>
                <button style={secondaryButton} onClick={() => onEditPerson(node.partner)}>
                  Editar pareja
                </button>
              </div>
            ) : (
              <div style={familyItemCardStyle}>
                <div style={familyItemNameStyle}>No hay pareja registrada</div>
                <button style={familyActionButtonBlue} onClick={() => onQuickAddPartner(node.person)}>
                  + Agregar pareja
                </button>
              </div>
            )}
          </div>

          <div style={familySectionStyle}>
            <div style={familySectionTitleStyle}>Hijos</div>
            <div style={childrenListStyle}>
              {children.length ? (
                children.map((child) => (
                  <div key={child.id} style={childRowStyle}>
                    <div style={childNameStyle}>{child.name}</div>
                    <button style={secondaryButton} onClick={() => onEditPerson(child)}>
                      Editar
                    </button>
                  </div>
                ))
              ) : (
                <div style={familyItemCardStyle}>No hay hijos registrados</div>
              )}
            </div>
            <button style={familyActionButtonGreen} onClick={() => onQuickAddChild(node.person)}>
              + Agregar hijo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FamilyTreeApp({ user }) {
  const [trees, setTrees] = useState([]);
  const [currentTreeId, setCurrentTreeId] = useState(null);
  const [treeName, setTreeName] = useState("Mi árbol familiar");
  const [cloudStatus, setCloudStatus] = useState("local");
  const [isPublic, setIsPublic] = useState(false);
  const [publicSlug, setPublicSlug] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [people, setPeople] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [form, setForm] = useState(emptyPerson());
  const [collapsedIds, setCollapsedIds] = useState([]);
  const [personPanelOpen, setPersonPanelOpen] = useState(false);
  const [familyPanelOpen, setFamilyPanelOpen] = useState(false);
  const [selectedFamilyNode, setSelectedFamilyNode] = useState(null);

  const collapsedSet = useMemo(() => new Set(collapsedIds), [collapsedIds]);
  const roots = useMemo(() => getRoots(people), [people]);

  const [centerId, setCenterId] = useState("");
  const [zoom, setZoom] = useState(0.95);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const [searchText, setSearchText] = useState("");
  const [selectedSearchId, setSelectedSearchId] = useState("");

  useEffect(() => {
    async function loadTrees() {
      if (!user) return;

      try {
        const list = await getUserTrees(user.uid);
        setTrees(list);

        if (list.length > 0) {
          const firstTree = list[0];
          setCurrentTreeId(firstTree.id);
          setTreeName(firstTree.name || "Mi árbol familiar");
          setPeople(Array.isArray(firstTree.people) ? firstTree.people : []);
          setIsPublic(!!firstTree.isPublic);
          setPublicSlug(firstTree.publicSlug || "");
          setCloudStatus("loaded");
          setHasUnsavedChanges(false);
        } else {
          const newTreeId = await createTree(user.uid, {
            name: "Mi árbol familiar",
            people: [],
          });

          const newTree = await getTree(user.uid, newTreeId);
          setTrees(newTree ? [newTree] : []);
          setCurrentTreeId(newTreeId);
          setTreeName(newTree?.name || "Mi árbol familiar");
          setPeople(Array.isArray(newTree?.people) ? newTree.people : []);
          setIsPublic(false);
          setPublicSlug("");
          setCloudStatus("created");
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        console.error("Error cargando árboles:", error);
        setCloudStatus("error");
      }
    }

    loadTrees();
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
  }, [people]);

  useEffect(() => {
    if (!roots.length) {
      setCenterId("");
      return;
    }
    if (!roots.some((r) => r.id === centerId)) {
      setCenterId(roots[0].id);
    }
  }, [roots, centerId]);

  useEffect(() => {
    const handler = (e) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const filteredPeople = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return people.slice(0, 50);
    return people.filter((p) => (p.name || "").toLowerCase().includes(q)).slice(0, 50);
  }, [people, searchText]);

  const tree = useMemo(() => {
    if (!centerId) return null;
    return buildTree(people, centerId, collapsedSet);
  }, [people, centerId, collapsedSet]);

  const layout = useMemo(() => {
    if (!tree) return null;
    return measureTree(tree);
  }, [tree]);

  const positions = useMemo(() => {
    if (!layout) return {};
    return createPositions(layout);
  }, [layout]);

  async function refreshTrees(uid) {
    if (!uid) return;
    const list = await getUserTrees(uid);
    setTrees(list);
  }

  async function handleCreateTree() {
    if (!user) {
      alert("Debes iniciar sesión");
      return;
    }

    try {
      const newTreeId = await createTree(user.uid, {
        name: `Árbol ${trees.length + 1}`,
        people: [],
      });

      await refreshTrees(user.uid);

      const newTree = await getTree(user.uid, newTreeId);
      setCurrentTreeId(newTreeId);
      setTreeName(newTree?.name || `Árbol ${trees.length + 1}`);
      setPeople(Array.isArray(newTree?.people) ? newTree.people : []);
      setCollapsedIds([]);
      setSelectedSearchId("");
      setSearchText("");
      setCenterId("");
      setIsPublic(false);
      setPublicSlug("");
      setCloudStatus("created");
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error creando árbol:", error);
      setCloudStatus("error");
    }
  }

  async function handleOpenTree(treeId) {
    if (!user || !treeId) return;

    try {
      const treeData = await getTree(user.uid, treeId);
      if (!treeData) return;

      setCurrentTreeId(treeData.id);
      setTreeName(treeData.name || "Mi árbol familiar");
      setPeople(Array.isArray(treeData.people) ? treeData.people : []);
      setIsPublic(!!treeData.isPublic);
      setPublicSlug(treeData.publicSlug || "");
      setCollapsedIds([]);
      setSelectedSearchId("");
      setSearchText("");
      setCenterId("");
      setPersonPanelOpen(false);
      setFamilyPanelOpen(false);
      setForm(emptyPerson());
      setCloudStatus("loaded");
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error abriendo árbol:", error);
      setCloudStatus("error");
    }
  }

  async function handleSaveTree(customPeople = people) {
    if (!user || !currentTreeId) return;

    try {
      await saveTree(user.uid, currentTreeId, {
        name: treeName,
        people: customPeople,
        isPublic,
        publicSlug,
      });

      await refreshTrees(user.uid);
      setCloudStatus("saved");
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error guardando árbol:", error);
      setCloudStatus("error");
    }
  }

  async function handleDeleteTree(treeId) {
    if (!user || !treeId) return;

    const ok = window.confirm("¿Seguro que deseas eliminar este árbol?");
    if (!ok) return;

    try {
      await removeTree(user.uid, treeId);
      const updated = await getUserTrees(user.uid);
      setTrees(updated);

      if (currentTreeId === treeId) {
        if (updated.length > 0) {
          const nextTree = updated[0];
          setCurrentTreeId(nextTree.id);
          setTreeName(nextTree.name || "Mi árbol familiar");
          setPeople(Array.isArray(nextTree.people) ? nextTree.people : []);
          setIsPublic(!!nextTree.isPublic);
          setPublicSlug(nextTree.publicSlug || "");
        } else {
          const newTreeId = await createTree(user.uid, {
            name: "Mi árbol familiar",
            people: [],
          });
          const newTree = await getTree(user.uid, newTreeId);

          setTrees(newTree ? [newTree] : []);
          setCurrentTreeId(newTreeId);
          setTreeName(newTree?.name || "Mi árbol familiar");
          setPeople(Array.isArray(newTree?.people) ? newTree.people : []);
          setIsPublic(false);
          setPublicSlug("");
        }
      }

      setCollapsedIds([]);
      setSelectedSearchId("");
      setSearchText("");
      setCenterId("");
      setPersonPanelOpen(false);
      setFamilyPanelOpen(false);
      setForm(emptyPerson());
      setCloudStatus("saved");
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error eliminando árbol:", error);
      setCloudStatus("error");
    }
  }

  async function handleShareTree() {
    if (!user || !currentTreeId) return;

    try {
      const slug = await makeTreePublic(user.uid, currentTreeId, {
        name: treeName,
        people,
      });

      setIsPublic(true);
      setPublicSlug(slug);
      await refreshTrees(user.uid);
      setCloudStatus("shared");
      setHasUnsavedChanges(false);

      const link = `${window.location.origin}?public=${slug}`;
      await navigator.clipboard.writeText(link);
      alert("Link copiado:\n" + link);
    } catch (error) {
      console.error("Error compartiendo árbol:", error);
      setCloudStatus("error");
      alert("No se pudo compartir el árbol");
    }
  }

  async function handleUnshareTree() {
    if (!user || !currentTreeId) return;

    try {
      await makeTreePrivate(user.uid, currentTreeId);
      setIsPublic(false);
      setPublicSlug("");
      await refreshTrees(user.uid);
      setCloudStatus("saved");
    } catch (error) {
      console.error("Error quitando modo público:", error);
      setCloudStatus("error");
      alert("No se pudo quitar el link público");
    }
  }

  async function handleCopyPublicLink() {
    if (!publicSlug) return;

    try {
      const link = `${window.location.origin}?public=${publicSlug}`;
      await navigator.clipboard.writeText(link);
      alert("Link copiado:\n" + link);
    } catch (error) {
      console.error(error);
      alert("No se pudo copiar el link");
    }
  }

  const focusPerson = (personId) => {
    if (!personId || !positions[personId]) return;
    setSelectedSearchId(personId);
    setPan({
      x: -positions[personId].x,
      y: -positions[personId].y + 140,
    });
    setZoom(1.05);
  };

  const savePerson = async () => {
    const cleanName = form.name.trim();
    if (!cleanName) {
      alert("Debes escribir el nombre.");
      return;
    }

    if (form.parent1 && form.parent2 && form.parent1 === form.parent2) {
      alert("Padre/Madre 1 y Padre/Madre 2 no pueden ser la misma persona.");
      return;
    }

    let nextPeople = [...people];

    if (form.id) {
      nextPeople = nextPeople.map((p) =>
        p.id === form.id ? { ...p, ...form, name: cleanName } : p
      );

      if (form.partnerId) {
        nextPeople = nextPeople.map((p) =>
          p.id === form.partnerId ? { ...p, partnerId: form.id } : p
        );
      }

      nextPeople = nextPeople.map((p) => {
        if (p.id !== form.id && p.partnerId === form.id && p.id !== form.partnerId) {
          return { ...p, partnerId: "" };
        }
        return p;
      });
    } else {
      const newId = uid();
      const newPerson = {
        ...form,
        id: newId,
        name: cleanName,
      };

      nextPeople.push(newPerson);

      if (form.partnerId) {
        nextPeople = nextPeople.map((p) =>
          p.id === form.partnerId ? { ...p, partnerId: newId } : p
        );
      }
    }

    setPeople(nextPeople);
    setPersonPanelOpen(false);
    setForm(emptyPerson());
    setHasUnsavedChanges(true);

    if (user && currentTreeId) {
      await handleSaveTree(nextPeople);
    }
  };

  const openPersonEditor = (person) => {
    setForm({
      id: person.id,
      name: person.name || "",
      photo: person.photo || "",
      partnerId: person.partnerId || "",
      parent1: person.parent1 || "",
      parent2: person.parent2 || "",
      birthDate: person.birthDate || "",
      birthPlace: person.birthPlace || "",
      notes: person.notes || "",
    });
    setPersonPanelOpen(true);
  };

  const openFamilyEditor = (node) => {
    setSelectedFamilyNode(node);
    setFamilyPanelOpen(true);
  };

  const quickAddPartner = (person) => {
    setForm({
      ...emptyPerson(),
      partnerId: person.id,
    });
    setPersonPanelOpen(true);
    setFamilyPanelOpen(false);
  };

  const quickAddChild = (person) => {
    setForm({
      ...emptyPerson(),
      parent1: person.id,
      parent2: person.partnerId || "",
    });
    setPersonPanelOpen(true);
    setFamilyPanelOpen(false);
  };

  const toggleCollapse = (personId) => {
    setCollapsedIds((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  const collapseAll = () => {
    setCollapsedIds(people.map((p) => p.id));
  };

  const expandAll = () => {
    setCollapsedIds([]);
  };

  const fitTree = () => {
    setZoom(0.78);
    setPan({ x: 0, y: 0 });
  };

  const deletePerson = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este familiar?")) return;

    const nextPeople = people
      .filter((p) => p.id !== id)
      .map((p) => ({
        ...p,
        partnerId: p.partnerId === id ? "" : p.partnerId,
        parent1: p.parent1 === id ? "" : p.parent1,
        parent2: p.parent2 === id ? "" : p.parent2,
      }));

    setPeople(nextPeople);

    if (form.id === id) {
      setPersonPanelOpen(false);
      setForm(emptyPerson());
    }

    setHasUnsavedChanges(true);

    if (user && currentTreeId) {
      await handleSaveTree(nextPeople);
    }
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        photo: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(people, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "arbol_genealogico.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPNG = () => {
    const svg = document.getElementById("family-tree-svg");
    if (!svg) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 4600;
      canvas.height = 3600;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "arbol_genealogico.png";
      a.click();
    };
    img.src = url;
  };

  const importData = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result || "[]"));
        if (!Array.isArray(parsed)) {
          alert("El archivo no tiene formato válido.");
          return;
        }

        setPeople(parsed);
        setCollapsedIds([]);
        setSelectedSearchId("");
        setSearchText("");
        setPersonPanelOpen(false);
        setFamilyPanelOpen(false);
        setForm(emptyPerson());
        setHasUnsavedChanges(true);

        if (user && currentTreeId) {
          await handleSaveTree(parsed);
        }
      } catch {
        alert("No se pudo leer el archivo JSON.");
      }
    };

    reader.readAsText(file);
  };

  const clearAll = async () => {
    if (!window.confirm("Esto borrará todo el árbol actual. ¿Continuar?")) return;

    setPeople([]);
    setCollapsedIds([]);
    setSelectedSearchId("");
    setSearchText("");
    setPersonPanelOpen(false);
    setFamilyPanelOpen(false);
    setForm(emptyPerson());
    setHasUnsavedChanges(true);

    if (user && currentTreeId) {
      await handleSaveTree([]);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const onMouseDown = (e) => {
    setDragging(true);
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setPan({
      x: dragRef.current.panX + dx,
      y: dragRef.current.panY + dy,
    });
  };

  const onMouseUp = () => setDragging(false);

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>Árbol Genealógico</h1>
        <p style={subtitleStyle}>
          Versión completa con panel familiar, búsqueda, múltiples árboles y nube.
        </p>

        <div style={cloudPanelStyle}>
          <div style={cloudPanelTopRowStyle}>
            <div style={cloudPanelLeftStyle}>
              <div style={cloudPanelTitleStyle}>Árbol actual</div>
              <input
                value={treeName}
                onChange={(e) => {
                  setTreeName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Nombre del árbol"
                style={treeNameInputStyle}
              />
            </div>

            <div style={cloudPanelRightStyle}>
              <div style={cloudStatusStyle}>
                Estado: {cloudStatusText(cloudStatus)}
              </div>

              <button onClick={handleSaveTree} style={secondaryButton} disabled={!user || !currentTreeId}>
                Guardar nube
              </button>

              <button onClick={handleCreateTree} style={secondaryButton} disabled={!user}>
                Nuevo árbol
              </button>

              {!isPublic ? (
                <button onClick={handleShareTree} style={secondaryButton} disabled={!user || !currentTreeId}>
                  Compartir link
                </button>
              ) : (
                <>
                  <button onClick={handleCopyPublicLink} style={secondaryButton}>
                    Copiar link
                  </button>
                  <button onClick={handleUnshareTree} style={secondaryButton}>
                    Quitar público
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={treeListWrapStyle}>
            <div style={treeListTitleStyle}>Mis árboles</div>

            {!user ? (
              <div style={treeListEmptyStyle}>Inicia sesión para crear y guardar varios árboles.</div>
            ) : trees.length === 0 ? (
              <div style={treeListEmptyStyle}>Todavía no tienes árboles en la nube.</div>
            ) : (
              <div style={treeListStyle}>
                {trees.map((treeItem) => (
                  <div
                    key={treeItem.id}
                    style={{
                      ...treeListItemStyle,
                      ...(currentTreeId === treeItem.id ? treeListItemActiveStyle : {}),
                    }}
                  >
                    <button
                      onClick={() => handleOpenTree(treeItem.id)}
                      style={treeOpenButtonStyle}
                    >
                      {treeItem.name || "Sin nombre"}
                    </button>

                    <button
                      onClick={() => handleDeleteTree(treeItem.id)}
                      style={treeDeleteButtonStyle}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isPublic && publicSlug ? (
              <div style={treeListEmptyStyle}>
                Link público: {`${window.location.origin}?public=${publicSlug}`}
              </div>
            ) : null}
          </div>
        </div>

        <div style={topBarStyle}>
          <div style={selectorBlockStyle}>
            <div style={selectorTitleStyle}>Patriarca / raíz principal</div>
            <select
              value={centerId}
              onChange={(e) => setCenterId(e.target.value)}
              style={selectorStyle}
            >
              {roots.length === 0 ? (
                <option value="">No hay patriarcas todavía</option>
              ) : (
                roots.map((root) => (
                  <option key={root.id} value={root.id}>
                    {root.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div style={searchBlockStyle}>
            <div style={selectorTitleStyle}>Buscar familiar</div>
            <div style={searchRowStyle}>
              <input
                type="text"
                placeholder="Escribe un nombre"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={searchInputStyle}
              />
              <select
                value={selectedSearchId}
                onChange={(e) => {
                  setSelectedSearchId(e.target.value);
                  focusPerson(e.target.value);
                }}
                style={searchSelectStyle}
              >
                <option value="">Selecciona resultado</option>
                {filteredPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={zoomBlockStyle}>
            <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.05).toFixed(2)))} style={secondaryButton}>
              -
            </button>
            <div style={zoomLabelStyle}>Zoom {Math.round(zoom * 100)}%</div>
            <button onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.05).toFixed(2)))} style={secondaryButton}>
              +
            </button>
            <button
              onClick={() => {
                setZoom(0.95);
                setPan({ x: 0, y: 0 });
              }}
              style={secondaryButton}
            >
              Centrar
            </button>
            <button onClick={fitTree} style={secondaryButton}>
              Autoajustar
            </button>
            <button onClick={collapseAll} style={secondaryButton}>
              Colapsar todo
            </button>
            <button onClick={expandAll} style={secondaryButton}>
              Expandir todo
            </button>
            <button onClick={() => setPersonPanelOpen(true)} style={secondaryButton}>
              Abrir editor
            </button>
            <button onClick={exportPNG} style={secondaryButton}>
              Exportar PNG
            </button>
            <button onClick={exportData} style={secondaryButton}>
              Exportar JSON
            </button>
            <label style={secondaryButton}>
              Importar JSON
              <input type="file" accept="application/json" onChange={importData} style={{ display: "none" }} />
            </label>
            <button onClick={clearAll} style={dangerButton}>
              Reiniciar árbol actual
            </button>
          </div>
        </div>

        {people.length === 0 ? (
          <div style={emptyStyle}>Todavía no hay familiares agregados.</div>
        ) : !centerId || !tree || !layout ? (
          <div style={emptyStyle}>Asigna al menos un patriarca sin padres para iniciar el flujo.</div>
        ) : (
          <div
            style={treeViewportStyle}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <div
              style={{
                ...treeCanvasWrapStyle,
                cursor: dragging ? "grabbing" : "grab",
              }}
              onMouseDown={onMouseDown}
            >
              <svg id="family-tree-svg" width="4600" height="3600" style={svgStyle}>
                <g transform={`translate(2300 150) translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                  {layout.edges.map((edge, idx) => {
                    const parentPos = positions[edge.from];
                    const childPos = positions[edge.to];
                    if (!parentPos || !childPos) return null;

                    const parentBottom = parentPos.y + 500;
                    const childTop = childPos.y;

                    return (
                      <path
                        key={idx}
                        d={curvePath(parentPos.x, parentBottom, childPos.x, childTop)}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="5"
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {layout.nodes.map((node) => {
                    const pos = positions[node.id];
                    if (!pos) return null;

                    return (
                      <FamilyBlock
                        key={node.id}
                        node={node}
                        x={pos.x}
                        y={pos.y}
                        root={pos.y === 0}
                        onEdit={openPersonEditor}
                        onDelete={deletePerson}
                        onQuickAddPartner={quickAddPartner}
                        onQuickAddChild={quickAddChild}
                        onToggleCollapse={toggleCollapse}
                        onOpenFamily={openFamilyEditor}
                        highlightedId={selectedSearchId}
                      />
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>
        )}
      </div>

      <PersonEditorPanel
        open={personPanelOpen}
        people={people}
        form={form}
        setForm={setForm}
        onSave={savePerson}
        onClose={() => setPersonPanelOpen(false)}
        onDeleteCurrent={() => deletePerson(form.id)}
        onImage={handleImage}
      />

      <FamilyPanel
        open={familyPanelOpen}
        node={selectedFamilyNode}
        people={people}
        onClose={() => setFamilyPanelOpen(false)}
        onEditPerson={(person) => {
          setFamilyPanelOpen(false);
          openPersonEditor(person);
        }}
        onQuickAddChild={quickAddChild}
        onQuickAddPartner={quickAddPartner}
      />
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #eefcf3 0%, #f7fff9 100%)",
  padding: "20px",
  fontFamily: "Arial, sans-serif",
};

const containerStyle = {
  maxWidth: "1820px",
  margin: "0 auto",
  background: "#ffffff",
  borderRadius: "24px",
  padding: "22px",
  boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
};

const titleStyle = {
  margin: 0,
  textAlign: "center",
  color: "#1f2937",
  fontSize: "46px",
};

const subtitleStyle = {
  textAlign: "center",
  color: "#64748b",
  marginTop: 10,
  marginBottom: 22,
  fontSize: "18px",
};

const cloudPanelStyle = {
  marginTop: "18px",
  marginBottom: "14px",
  padding: "16px",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid #dbe3ec",
  boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
};

const cloudPanelTopRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  flexWrap: "wrap",
  alignItems: "flex-end",
};

const cloudPanelLeftStyle = {
  flex: "1 1 320px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const cloudPanelRightStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const cloudPanelTitleStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#0f172a",
};

const treeNameInputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1.5px solid #cbd5e1",
  background: "#fff",
  fontSize: "15px",
  color: "#111827",
  boxSizing: "border-box",
};

const cloudStatusStyle = {
  padding: "10px 12px",
  borderRadius: "12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontWeight: "700",
  fontSize: "13px",
};

const treeListWrapStyle = {
  marginTop: "16px",
};

const treeListTitleStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#0f172a",
  marginBottom: "10px",
};

const treeListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const treeListItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  padding: "10px",
  borderRadius: "12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const treeListItemActiveStyle = {
  background: "#eef2ff",
  border: "1px solid #c7d2fe",
};

const treeOpenButtonStyle = {
  flex: 1,
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#111827",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "14px",
};

const treeDeleteButtonStyle = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "none",
  background: "#dc2626",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
};

const treeListEmptyStyle = {
  padding: "14px",
  borderRadius: "12px",
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  color: "#64748b",
  fontSize: "14px",
  marginTop: "10px",
  wordBreak: "break-all",
};

const labelStyle = {
  fontSize: "14px",
  fontWeight: "700",
  color: "#1f2937",
};

const inputStyle = {
  padding: "13px 14px",
  borderRadius: "12px",
  border: "1.5px solid #b9c4d1",
  background: "#ffffff",
  fontSize: "15px",
  color: "#111827",
  minHeight: "48px",
  width: "100%",
  boxSizing: "border-box",
};

const fileInputStyle = {
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1.5px solid #b9c4d1",
  background: "#ffffff",
  fontSize: "14px",
  color: "#111827",
  minHeight: "48px",
  width: "100%",
  boxSizing: "border-box",
};

const textareaStyle = {
  padding: "13px 14px",
  borderRadius: "12px",
  border: "1.5px solid #b9c4d1",
  background: "#ffffff",
  fontSize: "15px",
  color: "#111827",
  minHeight: "120px",
  resize: "vertical",
  width: "100%",
  boxSizing: "border-box",
};

const previewImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const topBarStyle = {
  marginTop: "18px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
};

const selectorBlockStyle = {
  padding: "16px",
  borderRadius: "16px",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
};

const searchBlockStyle = {
  padding: "16px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #dbe3ec",
};

const selectorTitleStyle = {
  fontSize: "14px",
  fontWeight: "700",
  color: "#1e3a8a",
  marginBottom: "8px",
};

const selectorStyle = {
  width: "100%",
  minWidth: "220px",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1.5px solid #93c5fd",
  background: "#ffffff",
  fontSize: "15px",
  color: "#111827",
};

const searchRowStyle = {
  display: "flex",
  gap: "8px",
  flexDirection: "column",
};

const searchInputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1.5px solid #cbd5e1",
  background: "#fff",
  fontSize: "15px",
  color: "#111827",
};

const searchSelectStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1.5px solid #cbd5e1",
  background: "#fff",
  fontSize: "15px",
  color: "#111827",
};

const zoomBlockStyle = {
  padding: "16px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #dbe3ec",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "center",
};

const zoomLabelStyle = {
  minWidth: "95px",
  textAlign: "center",
  fontWeight: "700",
  color: "#0f172a",
  fontSize: "14px",
};

const emptyStyle = {
  padding: "26px",
  border: "2px dashed #cbd5e1",
  borderRadius: "16px",
  textAlign: "center",
  color: "#64748b",
  marginTop: "20px",
  fontSize: "18px",
};

const treeViewportStyle = {
  marginTop: "24px",
  borderRadius: "18px",
  background: "linear-gradient(180deg, #fafafa 0%, #f8fafc 100%)",
  border: "1px solid #e5e7eb",
  overflow: "auto",
  height: "78vh",
};

const treeCanvasWrapStyle = {
  minWidth: "4600px",
  minHeight: "3600px",
};

const svgStyle = {
  display: "block",
  width: "4600px",
  height: "3600px",
  userSelect: "none",
};

const familyBlockStyle = {
  width: "100%",
  height: "100%",
  overflow: "visible",
  background: "#ffffff",
  border: "2px solid #dbe3ec",
  borderRadius: "24px",
  boxSizing: "border-box",
  padding: "16px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const familyBlockRootStyle = {
  width: "100%",
  height: "100%",
  overflow: "visible",
  background: "#f0fdf4",
  border: "2px solid #86efac",
  borderRadius: "24px",
  boxSizing: "border-box",
  padding: "16px",
  boxShadow: "0 10px 28px rgba(0,0,0,0.07)",
};

const highlightedBlockStyle = {
  boxShadow: "0 0 0 4px #facc15, 0 10px 28px rgba(0,0,0,0.10)",
  borderColor: "#facc15",
};

const familyHeaderRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "14px",
};

const familyHeaderStyle = {
  fontSize: "15px",
  fontWeight: "800",
  color: "#334155",
};

const collapseButtonStyle = {
  padding: "9px 11px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  fontWeight: "700",
  fontSize: "12px",
  cursor: "pointer",
};

const familyPeopleRowStyle = {
  display: "flex",
  gap: "18px",
  alignItems: "stretch",
  justifyContent: "center",
};

const familyPeopleSingleStyle = {
  display: "flex",
  justifyContent: "center",
};

const partnerCenterLinkWrapStyle = {
  width: "26px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const partnerCenterLinkStyle = {
  width: "24px",
  height: "5px",
  borderRadius: "999px",
  background: "#22c55e",
};

const familyBottomMetaStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const metaChipStyle = {
  padding: "7px 12px",
  borderRadius: "999px",
  background: "#f1f5f9",
  color: "#334155",
  fontSize: "12px",
  fontWeight: "700",
};

const metaChipBlueStyle = {
  padding: "7px 12px",
  borderRadius: "999px",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: "12px",
  fontWeight: "700",
};

const familyBottomActionsStyle = {
  display: "flex",
  gap: "10px",
  justifyContent: "center",
  marginTop: "14px",
};

const personMiniStyle = {
  width: "205px",
  minHeight: "290px",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "12px",
  boxSizing: "border-box",
};

const personMiniImageWrapStyle = {
  width: "100%",
  height: "96px",
  borderRadius: "12px",
  overflow: "hidden",
  background: "#f3f4f6",
  marginBottom: "10px",
};

const personMiniNameStyle = {
  fontSize: "15px",
  fontWeight: "800",
  color: "#111827",
  textAlign: "center",
  lineHeight: 1.15,
  minHeight: "38px",
  marginBottom: "10px",
};

const personMiniInfoStyle = {
  minHeight: "64px",
  borderRadius: "10px",
  background: "#f8fafc",
  padding: "8px",
  fontSize: "11px",
  lineHeight: 1.35,
  color: "#334155",
  textAlign: "center",
  marginBottom: "10px",
};

const personMiniButtonsStyle = {
  display: "flex",
  gap: "8px",
  marginBottom: "8px",
};

const imageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const imagePlaceholderStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#9ca3af",
  fontWeight: "600",
  fontSize: "12px",
};

const editButtonStyle = {
  flex: 1,
  padding: "11px 10px",
  borderRadius: "10px",
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
};

const deleteButtonStyle = {
  flex: 1,
  padding: "11px 10px",
  borderRadius: "10px",
  border: "none",
  background: "#dc2626",
  color: "#fff",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
};

const softGreenButtonStyle = {
  flex: 1,
  padding: "11px 10px",
  borderRadius: "10px",
  border: "1px solid #86efac",
  background: "#f0fdf4",
  color: "#166534",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
};

const softBlueButtonStyle = {
  flex: 1,
  padding: "11px 10px",
  borderRadius: "10px",
  border: "1px solid #93c5fd",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
};

const primaryButton = {
  padding: "12px 18px",
  borderRadius: "12px",
  border: "none",
  background: "#16a34a",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
};

const secondaryButton = {
  padding: "11px 15px",
  borderRadius: "12px",
  border: "1px solid #cfd8e3",
  background: "#fff",
  color: "#111827",
  cursor: "pointer",
  fontWeight: "700",
  display: "inline-flex",
  alignItems: "center",
  fontSize: "13px",
};

const dangerButton = {
  padding: "12px 18px",
  borderRadius: "12px",
  border: "none",
  background: "#dc2626",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
};

const familyActionButtonGreen = {
  padding: "13px 18px",
  borderRadius: "12px",
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
};

const familyActionButtonBlue = {
  padding: "13px 18px",
  borderRadius: "12px",
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
};

const familyActionButtonGray = {
  padding: "13px 18px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.18)",
  display: "flex",
  justifyContent: "flex-end",
  zIndex: 1000,
};

const overlayCenterStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.18)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1100,
};

const sidePanelStyle = {
  width: "420px",
  maxWidth: "100%",
  height: "100%",
  background: "#ffffff",
  boxShadow: "-8px 0 30px rgba(0,0,0,0.15)",
  display: "flex",
  flexDirection: "column",
};

const panelHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "18px 18px 12px",
  borderBottom: "1px solid #e5e7eb",
};

const panelTitleStyle = {
  fontSize: "20px",
  fontWeight: "800",
  color: "#111827",
};

const panelCloseStyle = {
  width: "36px",
  height: "36px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
  fontWeight: "700",
};

const panelBodyStyle = {
  padding: "18px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const sidePreviewWrapStyle = {
  width: "100%",
  height: "180px",
  borderRadius: "14px",
  overflow: "hidden",
  background: "#e5e7eb",
  border: "1px solid #d1d5db",
};

const sideButtonRowStyle = {
  display: "flex",
  gap: "10px",
  marginTop: "10px",
};

const familyPanelStyle = {
  width: "760px",
  maxWidth: "96vw",
  maxHeight: "90vh",
  background: "#fff",
  borderRadius: "22px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
  overflow: "hidden",
};

const familyPanelBodyStyle = {
  padding: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  overflowY: "auto",
  maxHeight: "calc(90vh - 72px)",
};

const familySectionStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
  background: "#f8fafc",
};

const familySectionTitleStyle = {
  fontSize: "15px",
  fontWeight: "800",
  color: "#1f2937",
  marginBottom: "10px",
};

const familyItemCardStyle = {
  border: "1px solid #dbe3ec",
  borderRadius: "14px",
  background: "#fff",
  padding: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
};

const familyItemNameStyle = {
  fontWeight: "700",
  color: "#111827",
};

const childrenListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  marginBottom: "12px",
};

const childRowStyle = {
  border: "1px solid #dbe3ec",
  borderRadius: "14px",
  background: "#fff",
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
};

const childNameStyle = {
  fontWeight: "700",
  color: "#111827",
};
