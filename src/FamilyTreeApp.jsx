import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  createTree,
  getUserTrees,
  getTree,
  saveTree,
  removeTree,
  makeTreePublic,
  makeTreePrivate,
} from "./services/treeService";

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

function createPositions(layout, isMobile = false) {
  const positions = {};
  const gapX = isMobile ? 260 : 580;
  const gapY = isMobile ? 320 : 540;

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
  const midY = y1 + (y2 - y1) * 0.42;
  return `M ${x1} ${y1}
          C ${x1} ${midY},
            ${x2} ${midY},
            ${x2} ${y2}`;
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
    case "pending":
      return "Pendiente";
    case "error":
      return "Error";
    default:
      return "Listo";
  }
}

function CelticTreeLogo({ size = 74 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="aknaGradMain" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="55%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>

        <linearGradient id="aknaGradSoft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ecfdf3" />
          <stop offset="100%" stopColor="#d1fae5" />
        </linearGradient>

        <filter id="aknaShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#166534" floodOpacity="0.18" />
        </filter>
      </defs>

      <circle cx="80" cy="80" r="71" fill="url(#aknaGradSoft)" opacity="0.55" />
      <circle
        cx="80"
        cy="80"
        r="67"
        fill="none"
        stroke="url(#aknaGradMain)"
        strokeWidth="5.5"
        filter="url(#aknaShadow)"
      />
      <circle
        cx="80"
        cy="80"
        r="52"
        fill="none"
        stroke="url(#aknaGradMain)"
        strokeWidth="3.5"
        opacity="0.9"
      />

      <path
        d="M80 26
           C60 30, 46 46, 46 64
           C46 78, 53 90, 67 98
           C55 102, 47 112, 47 124
           C47 134, 54 141, 64 141
           C75 141, 80 132, 80 122
           C80 132, 85 141, 96 141
           C106 141, 113 134, 113 124
           C113 112, 105 102, 93 98
           C107 90, 114 78, 114 64
           C114 46, 100 30, 80 26Z"
        fill="none"
        stroke="url(#aknaGradMain)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M80 42
           C69 47, 61 58, 61 68
           C61 79, 68 87, 80 92
           C92 87, 99 79, 99 68
           C99 58, 91 47, 80 42Z"
        fill="none"
        stroke="url(#aknaGradMain)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path d="M80 58 L80 132" stroke="url(#aknaGradMain)" strokeWidth="6" strokeLinecap="round" />

      <path
        d="M80 73
           C70 72, 61 66, 55 57
           M80 73
           C90 72, 99 66, 105 57"
        fill="none"
        stroke="url(#aknaGradMain)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      <path
        d="M80 95
           C69 95, 60 101, 55 111
           M80 95
           C91 95, 100 101, 105 111"
        fill="none"
        stroke="url(#aknaGradMain)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      <path
        d="M61 43
           C65 36, 72 31, 80 29
           C88 31, 95 36, 99 43"
        fill="none"
        stroke="url(#aknaGradMain)"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.9"
      />

      <path
        d="M58 118
           C64 127, 72 132, 80 134
           C88 132, 96 127, 102 118"
        fill="none"
        stroke="url(#aknaGradMain)"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

function PersonMini({
  person,
  onEdit,
  onDelete,
  onQuickAddPartner,
  onQuickAddChild,
  isMobile,
}) {
  const details = personSummary(person);
  const compact = isMobile;

  return (
    <div
      xmlns="http://www.w3.org/1999/xhtml"
      style={{
        ...personMiniStyle,
        width: compact ? "136px" : "220px",
        minHeight: compact ? "230px" : "345px",
        padding: compact ? "8px" : "14px",
      }}
    >
      <div
        style={{
          ...personMiniImageWrapStyle,
          height: compact ? "84px" : "132px",
          marginBottom: compact ? "8px" : "12px",
        }}
      >
        {person.photo ? (
          <img src={person.photo} alt={person.name} style={imageStyle} />
        ) : (
          <div style={imagePlaceholderStyle}>Sin foto</div>
        )}
      </div>

      <div
        style={{
          ...personMiniNameStyle,
          fontSize: compact ? "11px" : "16px",
          minHeight: compact ? "28px" : "42px",
          marginBottom: compact ? "8px" : "10px",
        }}
      >
        {person.name}
      </div>

      <div
        style={{
          ...personMiniInfoStyle,
          minHeight: compact ? "48px" : "72px",
          fontSize: compact ? "9px" : "11px",
          padding: compact ? "6px" : "9px",
          marginBottom: compact ? "8px" : "12px",
        }}
      >
        {details.length > 0 ? (
          details.map((item, idx) => <div key={idx}>{item}</div>)
        ) : (
          <div style={{ color: "#89a293" }}>Sin datos</div>
        )}
      </div>

      {person.notes ? (
        <div
          style={{
            ...personMiniNotesStyle,
            fontSize: compact ? "8px" : "10px",
            padding: compact ? "5px 6px" : "7px 8px",
            marginBottom: compact ? "8px" : "10px",
          }}
        >
          {person.notes}
        </div>
      ) : null}

      <div style={{ ...personMiniButtonsStyle, gap: compact ? "6px" : "8px" }}>
        <button
          style={{
            ...editButtonStyle,
            padding: compact ? "7px 6px" : "11px 10px",
            fontSize: compact ? "10px" : "13px",
          }}
          onClick={() => onEdit(person)}
        >
          Editar
        </button>
        <button
          style={{
            ...deleteButtonStyle,
            padding: compact ? "7px 6px" : "11px 10px",
            fontSize: compact ? "10px" : "13px",
          }}
          onClick={() => onDelete(person.id)}
        >
          Eliminar
        </button>
      </div>

      <div style={{ ...personMiniButtonsStyle, gap: compact ? "6px" : "8px", marginBottom: 0 }}>
        {!person.partnerId ? (
          <button
            style={{
              ...softGreenButtonStyle,
              padding: compact ? "7px 6px" : "11px 10px",
              fontSize: compact ? "10px" : "13px",
            }}
            onClick={() => onQuickAddPartner(person)}
          >
            + Pareja
          </button>
        ) : (
          <div style={{ flex: 1 }} />
        )}
        <button
          style={{
            ...softBlueButtonStyle,
            padding: compact ? "7px 6px" : "11px 10px",
            fontSize: compact ? "10px" : "13px",
          }}
          onClick={() => onQuickAddChild(person)}
        >
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
  isMobile,
}) {
  const { person, partner, hiddenChildrenCount, collapsed } = node;
  const compact = isMobile;
  const w = compact ? (partner ? 334 : 162) : partner ? 585 : 308;
  const h = compact ? (root ? 350 : 330) : root ? 530 : 500;
  const left = x - w / 2;
  const top = y;

  const isHighlighted =
    highlightedId && (highlightedId === person.id || highlightedId === partner?.id);

  return (
    <foreignObject x={left} y={top} width={w} height={h}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          ...(root ? familyBlockRootStyle : familyBlockStyle),
          ...(isHighlighted ? highlightedBlockStyle : {}),
          padding: compact ? "10px" : "18px",
        }}
      >
        <div style={{ ...familyTopStripStyle, marginBottom: compact ? "8px" : "12px" }}>
          <div style={{ ...familyBadgeStyle, fontSize: compact ? "10px" : "12px" }}>
            {partner ? "Familia" : "Persona"}
          </div>

          {hiddenChildrenCount > 0 ? (
            <button
              style={{
                ...collapseButtonStyle,
                padding: compact ? "6px 8px" : "9px 12px",
                fontSize: compact ? "10px" : "12px",
              }}
              onClick={() => onToggleCollapse(person.id)}
            >
              {collapsed ? `Abrir (${hiddenChildrenCount})` : `Ocultar (${hiddenChildrenCount})`}
            </button>
          ) : null}
        </div>

        <div
          style={
            partner
              ? {
                  ...familyPeopleRowStyle,
                  gap: compact ? "8px" : "18px",
                }
              : familyPeopleSingleStyle
          }
        >
          <PersonMini
            person={person}
            onEdit={onEdit}
            onDelete={onDelete}
            onQuickAddPartner={onQuickAddPartner}
            onQuickAddChild={onQuickAddChild}
            isMobile={isMobile}
          />

          {partner ? (
            <>
              <div style={{ ...partnerCenterLinkWrapStyle, width: compact ? "16px" : "26px" }}>
                <div style={partnerPillWrapStyle}>
                  <div
                    style={{
                      ...partnerCenterLinkStyle,
                      width: compact ? "14px" : "24px",
                      height: compact ? "4px" : "5px",
                    }}
                  />
                </div>
              </div>

              <PersonMini
                person={partner}
                onEdit={onEdit}
                onDelete={onDelete}
                onQuickAddPartner={onQuickAddPartner}
                onQuickAddChild={onQuickAddChild}
                isMobile={isMobile}
              />
            </>
          ) : null}
        </div>

        <div style={{ ...familyBottomMetaStyle, marginTop: compact ? "10px" : "14px" }}>
          <span
            style={{
              ...metaChipStyle,
              padding: compact ? "5px 8px" : "8px 12px",
              fontSize: compact ? "10px" : "12px",
            }}
          >
            {hiddenChildrenCount} hijo{hiddenChildrenCount === 1 ? "" : "s"}
          </span>

          {partner ? (
            <span
              style={{
                ...metaChipBlueStyle,
                padding: compact ? "5px 8px" : "8px 12px",
                fontSize: compact ? "10px" : "12px",
              }}
            >
              Pareja enlazada
            </span>
          ) : null}
        </div>

        <div
          style={{
            ...familyBottomActionsStyle,
            marginTop: compact ? "10px" : "16px",
            gap: compact ? "6px" : "10px",
          }}
        >
          <button
            style={{
              ...familyActionButtonGreen,
              padding: compact ? "8px 10px" : "13px 18px",
              fontSize: compact ? "10px" : "13px",
            }}
            onClick={() => onQuickAddChild(person)}
          >
            + Hijo
          </button>

          {!partner ? (
            <button
              style={{
                ...familyActionButtonBlue,
                padding: compact ? "8px 10px" : "13px 18px",
                fontSize: compact ? "10px" : "13px",
              }}
              onClick={() => onQuickAddPartner(person)}
            >
              + Pareja
            </button>
          ) : (
            <button
              style={{
                ...familyActionButtonGray,
                padding: compact ? "8px 10px" : "13px 18px",
                fontSize: compact ? "10px" : "13px",
              }}
              onClick={() => onOpenFamily(node)}
            >
              Ver familia
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
  isMobile,
}) {
  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div
        style={{
          ...sidePanelStyle,
          width: isMobile ? "100%" : "430px",
          borderRadius: isMobile ? "0" : "0",
        }}
      >
        <div style={panelHeaderStyle}>
          <div style={panelTitleStyle}>{form.id ? "Editar familiar" : "Agregar familiar"}</div>
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
            {people
              .filter((p) => p.id !== form.id)
              .map((p) => (
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
            {people
              .filter((p) => p.id !== form.id)
              .map((p) => (
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
            {people
              .filter((p) => p.id !== form.id)
              .map((p) => (
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

          <div
            style={{
              ...sideButtonRowStyle,
              flexDirection: isMobile ? "column" : "row",
            }}
          >
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
  isMobile,
}) {
  if (!open || !node) return null;

  const children = getChildrenOfPair(people, node.person.id, node.partner?.id || "");

  return (
    <div style={overlayCenterStyle}>
      <div
        style={{
          ...familyPanelStyle,
          width: isMobile ? "96vw" : "760px",
        }}
      >
        <div style={panelHeaderStyle}>
          <div style={panelTitleStyle}>Panel familiar</div>
          <button style={panelCloseStyle} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={familyPanelBodyStyle}>
          <div style={familySectionStyle}>
            <div style={familySectionTitleStyle}>Principal</div>
            <div
              style={{
                ...familyItemCardStyle,
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "flex-start" : "center",
              }}
            >
              <div style={familyItemNameStyle}>{node.person.name}</div>
              <button style={secondaryButton} onClick={() => onEditPerson(node.person)}>
                Editar principal
              </button>
            </div>
          </div>

          <div style={familySectionStyle}>
            <div style={familySectionTitleStyle}>Pareja</div>
            {node.partner ? (
              <div
                style={{
                  ...familyItemCardStyle,
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "flex-start" : "center",
                }}
              >
                <div style={familyItemNameStyle}>{node.partner.name}</div>
                <button style={secondaryButton} onClick={() => onEditPerson(node.partner)}>
                  Editar pareja
                </button>
              </div>
            ) : (
              <div
                style={{
                  ...familyItemCardStyle,
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "flex-start" : "center",
                }}
              >
                <div style={familyItemNameStyle}>No hay pareja registrada</div>
                <button
                  style={familyActionButtonBlue}
                  onClick={() => onQuickAddPartner(node.person)}
                >
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
                  <div
                    key={child.id}
                    style={{
                      ...childRowStyle,
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "flex-start" : "center",
                    }}
                  >
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
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  const viewportRef = useRef(null);
  const dragRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [trees, setTrees] = useState([]);
  const [currentTreeId, setCurrentTreeId] = useState(null);
  const [treeName, setTreeName] = useState("Mi árbol familiar");
  const [cloudStatus, setCloudStatus] = useState("loaded");
  const [isPublic, setIsPublic] = useState(false);
  const [publicSlug, setPublicSlug] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [didInitialCenter, setDidInitialCenter] = useState(false);

  const [people, setPeople] = useState([]);
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);

  const [form, setForm] = useState(emptyPerson());
  const [collapsedIds, setCollapsedIds] = useState([]);
  const [personPanelOpen, setPersonPanelOpen] = useState(false);
  const [familyPanelOpen, setFamilyPanelOpen] = useState(false);
  const [selectedFamilyNode, setSelectedFamilyNode] = useState(null);

  const [centerId, setCenterId] = useState("");
  const [zoom, setZoom] = useState(isMobile ? 0.95 : 0.94);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [selectedSearchId, setSelectedSearchId] = useState("");
  const [lastCreatedId, setLastCreatedId] = useState("");

  const collapsedSet = useMemo(() => new Set(collapsedIds), [collapsedIds]);
  const roots = useMemo(() => getRoots(people), [people]);

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
    return createPositions(layout, isMobile);
  }, [layout, isMobile]);

  function centerOnNode(nodeId, zoomValue = null) {
    if (!nodeId || !positions[nodeId]) return;
    const pos = positions[nodeId];

    setPan({
      x: -pos.x,
      y: -pos.y + (isMobile ? 220 : 150),
    });

    if (typeof zoomValue === "number") {
      setZoom(zoomValue);
    }
  }

  function commitPeopleChange(nextPeople) {
    setHistoryPast((prev) => [...prev, people]);
    setHistoryFuture([]);
    setPeople(nextPeople);
    setHasUnsavedChanges(true);
    setCloudStatus("pending");
  }

  function handleUndo() {
    if (!historyPast.length) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [people, ...prev]);
    setPeople(previous);
    setHasUnsavedChanges(true);
    setCloudStatus("pending");
  }

  function handleRedo() {
    if (!historyFuture.length) return;
    const next = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev, people]);
    setPeople(next);
    setHasUnsavedChanges(true);
    setCloudStatus("pending");
  }

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setZoom((prev) => {
      if (isMobile && prev < 0.9) return 0.95;
      if (!isMobile && prev < 0.85) return 0.94;
      return prev;
    });
  }, [isMobile]);

  useEffect(() => {
    async function loadTrees() {
      if (!user) {
        setTrees([]);
        setCurrentTreeId(null);
        setTreeName("Mi árbol familiar");
        setPeople([]);
        setIsPublic(false);
        setPublicSlug("");
        setCloudStatus("loaded");
        setHasUnsavedChanges(false);
        setHistoryPast([]);
        setHistoryFuture([]);
        setCollapsedIds([]);
        setCenterId("");
        setSelectedSearchId("");
        setLastCreatedId("");
        setDidInitialCenter(false);
        return;
      }

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
          setHistoryPast([]);
          setHistoryFuture([]);
          setDidInitialCenter(false);
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
          setHistoryPast([]);
          setHistoryFuture([]);
          setDidInitialCenter(false);
        }
      } catch (error) {
        console.error("Error cargando árboles:", error);
        setCloudStatus("error");
      }
    }

    loadTrees();
  }, [user]);

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

  useEffect(() => {
    if (!user || !currentTreeId) return;
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(async () => {
      try {
        await saveTree(user.uid, currentTreeId, {
          name: treeName,
          people,
          isPublic,
          publicSlug,
        });

        await refreshTrees(user.uid);
        setCloudStatus("saved");
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error("Error en autosave:", error);
        setCloudStatus("error");
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [user, currentTreeId, treeName, people, isPublic, publicSlug, hasUnsavedChanges]);

  useEffect(() => {
    function onKeyDown(e) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      if (!ctrlOrCmd) return;

      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [historyPast, historyFuture, people]);

  useEffect(() => {
    if (!centerId || !positions[centerId]) return;

    if (!didInitialCenter) {
      centerOnNode(centerId, isMobile ? 0.95 : 0.94);
      setDidInitialCenter(true);
    }
  }, [centerId, positions, isMobile, didInitialCenter]);

  useEffect(() => {
    if (!selectedSearchId || !positions[selectedSearchId]) return;
    if (!didInitialCenter) return;

    centerOnNode(selectedSearchId, isMobile ? 1.08 : 1);
  }, [selectedSearchId, positions, isMobile, didInitialCenter]);

  function startDrag(clientX, clientY) {
    setDragging(true);
    dragRef.current = {
      x: clientX,
      y: clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }

  function updateDrag(clientX, clientY) {
    if (!dragging) return;

    const dx = clientX - dragRef.current.x;
    const dy = clientY - dragRef.current.y;

    setPan({
      x: dragRef.current.panX + dx,
      y: dragRef.current.panY + dy,
    });
  }

  function stopDrag() {
    setDragging(false);
  }

  const onPointerDown = (e) => {
    startDrag(e.clientX, e.clientY);
  };

  const onTouchStart = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    startDrag(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const handlePointerMove = (e) => updateDrag(e.clientX, e.clientY);
    const handlePointerUp = () => stopDrag();

    const handleTouchMove = (e) => {
      const touch = e.touches?.[0];
      if (!touch) return;
      if (dragging) e.preventDefault();
      updateDrag(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => stopDrag();

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [dragging, pan]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await viewportRef.current?.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Error con pantalla completa:", error);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

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
      setLastCreatedId("");
      setIsPublic(false);
      setPublicSlug("");
      setCloudStatus("created");
      setHasUnsavedChanges(false);
      setHistoryPast([]);
      setHistoryFuture([]);
      setPan({ x: 0, y: 0 });
      setZoom(isMobile ? 0.95 : 0.94);
      setDidInitialCenter(false);
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
      setLastCreatedId("");
      setPersonPanelOpen(false);
      setFamilyPanelOpen(false);
      setForm(emptyPerson());
      setCloudStatus("loaded");
      setHasUnsavedChanges(false);
      setHistoryPast([]);
      setHistoryFuture([]);
      setPan({ x: 0, y: 0 });
      setZoom(isMobile ? 0.95 : 0.94);
      setDidInitialCenter(false);
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
      setLastCreatedId("");
      setPersonPanelOpen(false);
      setFamilyPanelOpen(false);
      setForm(emptyPerson());
      setCloudStatus("saved");
      setHasUnsavedChanges(false);
      setHistoryPast([]);
      setHistoryFuture([]);
      setDidInitialCenter(false);
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

      const link = `${window.location.origin}/public/${slug}`;
      await navigator.clipboard.writeText(link);
      alert(`Link copiado:\n${link}`);
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
      const link = `${window.location.origin}/public/${publicSlug}`;
      await navigator.clipboard.writeText(link);
      alert(`Link copiado:\n${link}`);
    } catch (error) {
      console.error(error);
      alert("No se pudo copiar el link");
    }
  }

  const focusPerson = (personId) => {
    if (!personId || !positions[personId]) return;
    setSelectedSearchId(personId);
    centerOnNode(personId, isMobile ? 1.08 : 1.05);
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
    let createdPersonId = "";

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

      createdPersonId = form.id;
    } else {
      const newId = uid();
      const newPerson = {
        ...form,
        id: newId,
        name: cleanName,
      };

      nextPeople.push(newPerson);
      createdPersonId = newId;
      setLastCreatedId(newId);

      if (form.partnerId) {
        nextPeople = nextPeople.map((p) =>
          p.id === form.partnerId ? { ...p, partnerId: newId } : p
        );
      }
    }

    commitPeopleChange(nextPeople);

    const nextRoots = getRoots(nextPeople);
    if (!centerId && nextRoots.length > 0) {
      setCenterId(nextRoots[0].id);
    }

    if (createdPersonId) {
      setSelectedSearchId(createdPersonId);
    }

    setPersonPanelOpen(false);
    setForm(emptyPerson());

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

  const expandAll = () => {
    setCollapsedIds([]);
  };

  const fitTree = () => {
    const targetId = centerId || roots[0]?.id;
    setZoom(isMobile ? 0.95 : 0.84);

    if (targetId && positions[targetId]) {
      centerOnNode(targetId);
    } else {
      setPan({ x: 0, y: 0 });
    }
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

    commitPeopleChange(nextPeople);

    if (form.id === id) {
      setPersonPanelOpen(false);
      setForm(emptyPerson());
    }

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
    a.download = "aknaweb_arbol.json";
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
      canvas.width = isMobile ? 1800 : 4600;
      canvas.height = isMobile ? 1800 : 3600;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f5fff8";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "aknaweb_arbol.png";
      a.click();
    };
    img.src = url;
  };

  const exportPDF = async () => {
    const element = document.getElementById("tree-export-area");
    if (!element) return;

    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${(treeName || "aknaweb_arbol").replace(/\s+/g, "_")}.pdf`);
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

        commitPeopleChange(parsed);
        setCollapsedIds([]);
        setSelectedSearchId("");
        setSearchText("");
        setPersonPanelOpen(false);
        setFamilyPanelOpen(false);
        setForm(emptyPerson());

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

    commitPeopleChange([]);
    setCollapsedIds([]);
    setSelectedSearchId("");
    setSearchText("");
    setLastCreatedId("");
    setPersonPanelOpen(false);
    setFamilyPanelOpen(false);
    setForm(emptyPerson());

    if (user && currentTreeId) {
      await handleSaveTree([]);
    }
  };

  return (
    <div style={pageStyle}>
      <div
        style={{
          ...containerStyle,
          padding: isMobile ? "12px" : "22px",
          borderRadius: isMobile ? "18px" : "30px",
        }}
      >
        <div style={heroStyle}>
          <div style={brandWrapStyle}>
            <div style={brandIconShellStyle}>
              <CelticTreeLogo size={isMobile ? 54 : 78} />
            </div>

            <div>
              <div style={brandKickerStyle}>Aknaweb</div>
              <h1 style={{ ...titleStyle, fontSize: isMobile ? "26px" : "48px" }}>
                Árbol Genealógico
              </h1>
            </div>
          </div>

          <div style={heroBadgeStyle}>
            <div style={heroBadgeLabelStyle}>Estado</div>
            <div style={heroBadgeValueStyle}>{cloudStatusText(cloudStatus)}</div>
          </div>
        </div>

        <div style={cloudPanelStyle}>
          <div style={cloudPanelTopRowStyle}>
            <div style={cloudPanelLeftStyle}>
              <div style={cloudPanelTitleStyle}>Árbol actual</div>
              <input
                value={treeName}
                onChange={(e) => {
                  setTreeName(e.target.value);
                  setHasUnsavedChanges(true);
                  setCloudStatus("pending");
                }}
                placeholder="Nombre del árbol"
                style={treeNameInputStyle}
              />
            </div>

            <div
              style={{
                ...cloudPanelRightStyle,
                width: isMobile ? "100%" : "auto",
              }}
            >
              <button
                onClick={handleSaveTree}
                style={secondaryButton}
                disabled={!user || !currentTreeId}
              >
                Guardar nube
              </button>

              <button onClick={handleCreateTree} style={secondaryButton} disabled={!user}>
                Nuevo árbol
              </button>
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
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "stretch" : "center",
                    }}
                  >
                    <button onClick={() => handleOpenTree(treeItem.id)} style={treeOpenButtonStyle}>
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
          </div>
        </div>

        <div style={sharePanelStyle}>
          <div style={sharePanelHeaderStyle}>
            <div style={sharePanelTitleStyle}>Compartir y exportar</div>
            <div style={sharePanelTextStyle}>
              Administra el enlace público y las exportaciones del árbol actual.
            </div>
          </div>

          <div style={sharePanelActionsStyle}>
            {!isPublic ? (
              <button
                onClick={handleShareTree}
                style={greenOutlineButton}
                disabled={!user || !currentTreeId}
              >
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

            <button onClick={exportPNG} style={secondaryButton}>
              PNG
            </button>

            <button onClick={exportPDF} style={greenOutlineButton}>
              PDF
            </button>

            <button onClick={exportData} style={secondaryButton}>
              JSON
            </button>

            <label style={secondaryButton}>
              Importar JSON
              <input
                type="file"
                accept="application/json"
                onChange={importData}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {isPublic && publicSlug ? (
            <div style={shareLinkBoxStyle}>
              {`${window.location.origin}/public/${publicSlug}`}
            </div>
          ) : null}
        </div>

        <div
          style={{
            ...topBarStyle,
            gridTemplateColumns: isMobile ? "1fr" : topBarStyle.gridTemplateColumns,
          }}
        >
          <div style={selectorBlockStyle}>
            <div style={selectorTitleStyle}>Patriarca / raíz principal</div>
            <select
              value={centerId}
              onChange={(e) => {
                const nextId = e.target.value;
                setCenterId(nextId);
                if (nextId && positions[nextId]) {
                  centerOnNode(nextId, isMobile ? 0.95 : 0.94);
                }
              }}
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

          <div
            style={{
              ...zoomBlockStyle,
              justifyContent: isMobile ? "flex-start" : "center",
            }}
          >
            <button onClick={handleUndo} style={secondaryButton} disabled={!historyPast.length}>
              Deshacer
            </button>
            <button onClick={handleRedo} style={secondaryButton} disabled={!historyFuture.length}>
              Rehacer
            </button>
            <button onClick={expandAll} style={secondaryButton}>
              Expandir todo
            </button>
            <button onClick={() => setPersonPanelOpen(true)} style={secondaryButton}>
              Abrir editor
            </button>
            <button onClick={clearAll} style={dangerButton}>
              Reiniciar
            </button>
          </div>
        </div>

        <div id="tree-export-area">
          {people.length === 0 ? (
            <div style={emptyStyle}>Todavía no hay familiares agregados.</div>
          ) : !centerId || !tree || !layout ? (
            <div style={emptyStyle}>Asigna al menos un patriarca sin padres para iniciar el flujo.</div>
          ) : (
            <div
              ref={viewportRef}
              style={{
                ...treeViewportStyle,
                ...(isFullscreen ? fullscreenViewportStyle : {}),
                height: isFullscreen ? "100vh" : isMobile ? "74vh" : "78vh",
              }}
            >
              <div
                style={{
                  ...mapFloatingControlsStyle,
                  top: isMobile ? "12px" : "16px",
                  right: isMobile ? "12px" : "16px",
                  gap: isMobile ? "8px" : "10px",
                }}
              >
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.05).toFixed(2)))}
                  style={mapFabButtonStyle}
                  title="Alejar"
                >
                  −
                </button>

                <div style={mapZoomBadgeStyle}>{Math.round(zoom * 100)}%</div>

                <button
                  onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.05).toFixed(2)))}
                  style={mapFabButtonStyle}
                  title="Acercar"
                >
                  +
                </button>

                <button
                  onClick={() => {
                    const targetId = centerId || roots[0]?.id;
                    setZoom(isMobile ? 0.95 : 0.94);

                    if (targetId && positions[targetId]) {
                      centerOnNode(targetId);
                    } else {
                      setPan({ x: 0, y: 0 });
                    }
                  }}
                  style={mapFabWideButtonStyle}
                  title="Centrar"
                >
                  Centrar
                </button>

                <button onClick={fitTree} style={mapFabWideButtonStyle} title="Autoajustar">
                  Ajustar
                </button>

                {lastCreatedId ? (
                  <button
                    onClick={() => {
                      if (!lastCreatedId || !positions[lastCreatedId]) return;
                      setSelectedSearchId(lastCreatedId);
                      centerOnNode(lastCreatedId, isMobile ? 1.08 : 1);
                    }}
                    style={mapFabWideButtonStyle}
                    title="Ver último"
                  >
                    Ver último
                  </button>
                ) : null}

                <button
                  onClick={toggleFullscreen}
                  style={mapFabPrimaryButtonStyle}
                  title="Pantalla completa"
                >
                  {isFullscreen ? "Salir" : "Pantalla"}
                </button>
              </div>

              <div
                style={{
                  ...treeCanvasWrapStyle,
                  minWidth: isMobile ? "1800px" : "4600px",
                  minHeight: isMobile ? "1800px" : "3600px",
                  cursor: dragging ? "grabbing" : "grab",
                  touchAction: "none",
                }}
                onPointerDown={onPointerDown}
                onTouchStart={onTouchStart}
              >
                <svg
                  id="family-tree-svg"
                  width={isMobile ? "1800" : "4600"}
                  height={isMobile ? "1800" : "3600"}
                  style={{
                    ...svgStyle,
                    width: isMobile ? "1800px" : "4600px",
                    height: isMobile ? "1800px" : "3600px",
                  }}
                >
                  <defs>
                    <linearGradient id="treeBgGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbfffc" />
                      <stop offset="100%" stopColor="#eef8f1" />
                    </linearGradient>
                    <radialGradient id="treeGlow" cx="50%" cy="0%" r="85%">
                      <stop offset="0%" stopColor="#f4fff7" />
                      <stop offset="100%" stopColor="#eef7f1" />
                    </radialGradient>
                  </defs>

                  <rect x="0" y="0" width="100%" height="100%" fill="url(#treeGlow)" />
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="url(#treeBgGradient)"
                    opacity="0.55"
                  />

                  <g
                    transform={`translate(${isMobile ? 900 : 2300} ${isMobile ? 140 : 150}) translate(${pan.x} ${pan.y}) scale(${zoom})`}
                  >
                    {layout.edges.map((edge, idx) => {
                      const parentPos = positions[edge.from];
                      const childPos = positions[edge.to];
                      if (!parentPos || !childPos) return null;

                      const parentBottom = parentPos.y + (isMobile ? 250 : 520);
                      const childTop = childPos.y;

                      return (
                        <path
                          key={idx}
                          d={curvePath(parentPos.x, parentBottom, childPos.x, childTop)}
                          fill="none"
                          stroke="#63a877"
                          strokeWidth={isMobile ? "3.5" : "5"}
                          strokeLinecap="round"
                          opacity="0.96"
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
                          isMobile={isMobile}
                        />
                      );
                    })}
                  </g>
                </svg>
              </div>
            </div>
          )}
        </div>
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
        isMobile={isMobile}
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
        isMobile={isMobile}
      />
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "radial-gradient(circle at top, #f8fff9 0%, #eefcf2 55%, #ecfaf0 100%)",
  padding: "16px",
  fontFamily: "Arial, sans-serif",
};

const containerStyle = {
  maxWidth: "1860px",
  margin: "0 auto",
  background: "rgba(255,255,255,0.95)",
  backdropFilter: "blur(12px)",
  borderRadius: "30px",
  padding: "22px",
  boxShadow: "0 20px 48px rgba(32, 94, 53, 0.11)",
  border: "1px solid #d8efe0",
};

const heroStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const brandWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
};

const brandIconShellStyle = {
  width: "96px",
  height: "96px",
  borderRadius: "28px",
  background: "radial-gradient(circle at top, #ffffff 0%, #f2fff6 45%, #e9f8ee 100%)",
  border: "1px solid #d7eedf",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 16px 30px rgba(22, 101, 52, 0.10), inset 0 1px 0 rgba(255,255,255,0.75)",
};

const brandKickerStyle = {
  fontSize: "13px",
  fontWeight: "800",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#2e7d4f",
  marginBottom: "6px",
};

const heroBadgeStyle = {
  padding: "14px 16px",
  borderRadius: "18px",
  background: "linear-gradient(180deg, #f2fff6 0%, #e7f9ec 100%)",
  border: "1px solid #cce9d5",
  minWidth: "140px",
  boxShadow: "0 10px 22px rgba(22, 101, 52, 0.06)",
};

const heroBadgeLabelStyle = {
  fontSize: "12px",
  fontWeight: "700",
  color: "#4b7b57",
};

const heroBadgeValueStyle = {
  marginTop: "6px",
  fontSize: "16px",
  fontWeight: "800",
  color: "#166534",
};

const titleStyle = {
  margin: 0,
  textAlign: "left",
  color: "#184f2a",
  fontSize: "48px",
  letterSpacing: "-0.02em",
};

const cloudPanelStyle = {
  marginTop: "10px",
  marginBottom: "14px",
  padding: "16px",
  borderRadius: "22px",
  background: "linear-gradient(180deg, #fbfffc 0%, #f5fff8 100%)",
  border: "1px solid #d8efe0",
  boxShadow: "0 8px 22px rgba(22, 101, 52, 0.05)",
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
  color: "#215a34",
};

const treeNameInputStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: "14px",
  border: "1.5px solid #cfe7d6",
  background: "#ffffff",
  fontSize: "15px",
  color: "#12321f",
  boxSizing: "border-box",
  outline: "none",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
};

const treeListWrapStyle = {
  marginTop: "16px",
};

const treeListTitleStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#215a34",
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
  borderRadius: "14px",
  background: "#f5fbf6",
  border: "1px solid #d8efe0",
};

const treeListItemActiveStyle = {
  background: "#eaf9ee",
  border: "1px solid #9fd1ad",
  boxShadow: "0 8px 20px rgba(22, 101, 52, 0.05)",
};

const treeOpenButtonStyle = {
  flex: 1,
  textAlign: "left",
  padding: "11px 12px",
  borderRadius: "12px",
  border: "1px solid #cfe7d6",
  background: "#fff",
  color: "#12321f",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "14px",
};

const treeDeleteButtonStyle = {
  padding: "11px 12px",
  borderRadius: "12px",
  border: "none",
  background: "#d83c3c",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
};

const treeListEmptyStyle = {
  padding: "14px",
  borderRadius: "14px",
  background: "#f5fbf6",
  border: "1px dashed #cfe7d6",
  color: "#62806c",
  fontSize: "14px",
  marginTop: "10px",
  wordBreak: "break-all",
};

const sharePanelStyle = {
  marginTop: "16px",
  marginBottom: "16px",
  padding: "18px",
  borderRadius: "22px",
  background: "linear-gradient(180deg, #ffffff 0%, #f7fff9 100%)",
  border: "1px solid #d8efe0",
  boxShadow: "0 10px 24px rgba(22, 101, 52, 0.05)",
};

const sharePanelHeaderStyle = {
  marginBottom: "14px",
};

const sharePanelTitleStyle = {
  fontSize: "16px",
  fontWeight: "800",
  color: "#184f2a",
};

const sharePanelTextStyle = {
  marginTop: "6px",
  fontSize: "14px",
  color: "#64806f",
  lineHeight: 1.5,
};

const sharePanelActionsStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const shareLinkBoxStyle = {
  marginTop: "14px",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "#f5fbf6",
  border: "1px dashed #cfe7d6",
  color: "#456555",
  fontSize: "14px",
  wordBreak: "break-all",
};

const topBarStyle = {
  marginTop: "18px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
};

const selectorBlockStyle = {
  padding: "16px",
  borderRadius: "18px",
  background: "linear-gradient(180deg, #effcf2 0%, #f6fff8 100%)",
  border: "1px solid #cfe7d6",
  boxShadow: "0 8px 20px rgba(22, 101, 52, 0.04)",
};

const searchBlockStyle = {
  padding: "16px",
  borderRadius: "18px",
  background: "linear-gradient(180deg, #fbfffc 0%, #f5fff8 100%)",
  border: "1px solid #d8efe0",
  boxShadow: "0 8px 20px rgba(22, 101, 52, 0.04)",
};

const selectorTitleStyle = {
  fontSize: "14px",
  fontWeight: "700",
  color: "#215a34",
  marginBottom: "8px",
};

const selectorStyle = {
  width: "100%",
  minWidth: "220px",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1.5px solid #b7dcc2",
  background: "#ffffff",
  fontSize: "15px",
  color: "#12321f",
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
  border: "1.5px solid #cfe7d6",
  background: "#fff",
  fontSize: "15px",
  color: "#12321f",
};

const searchSelectStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1.5px solid #cfe7d6",
  background: "#fff",
  fontSize: "15px",
  color: "#12321f",
};

const zoomBlockStyle = {
  padding: "16px",
  borderRadius: "20px",
  background: "linear-gradient(180deg, #ffffff 0%, #f5fff8 100%)",
  border: "1px solid #d8efe0",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "center",
  boxShadow: "0 8px 20px rgba(22, 101, 52, 0.05)",
};

const emptyStyle = {
  padding: "26px",
  border: "2px dashed #cfe7d6",
  borderRadius: "18px",
  textAlign: "center",
  color: "#62806c",
  marginTop: "20px",
  fontSize: "18px",
  background: "#fbfffc",
};

const treeViewportStyle = {
  marginTop: "24px",
  borderRadius: "28px",
  background: "radial-gradient(circle at top, #fcfffd 0%, #f3fbf5 55%, #edf8ef 100%)",
  border: "1px solid #d8efe0",
  overflow: "hidden",
  height: "78vh",
  boxShadow:
    "inset 0 0 0 1px rgba(214,239,222,0.2), 0 18px 40px rgba(22, 101, 52, 0.08)",
  position: "relative",
  touchAction: "none",
};

const fullscreenViewportStyle = {
  borderRadius: "0",
  marginTop: "0",
  background: "radial-gradient(circle at top, #fbfffc 0%, #f2faf4 58%, #edf8ef 100%)",
};

const mapFloatingControlsStyle = {
  position: "absolute",
  zIndex: 25,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  background: "rgba(255,255,255,0.88)",
  backdropFilter: "blur(10px)",
  border: "1px solid #d9efe1",
  borderRadius: "18px",
  padding: "10px",
  boxShadow: "0 18px 34px rgba(22, 101, 52, 0.12)",
};

const mapFabButtonStyle = {
  minWidth: "48px",
  height: "44px",
  borderRadius: "12px",
  border: "1px solid #d5eadc",
  background: "#ffffff",
  color: "#143523",
  fontWeight: "900",
  fontSize: "22px",
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(22, 101, 52, 0.05)",
};

const mapFabWideButtonStyle = {
  minWidth: "96px",
  height: "42px",
  borderRadius: "12px",
  border: "1px solid #d5eadc",
  background: "#ffffff",
  color: "#143523",
  fontWeight: "800",
  fontSize: "13px",
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(22, 101, 52, 0.05)",
};

const mapFabPrimaryButtonStyle = {
  minWidth: "96px",
  height: "42px",
  borderRadius: "12px",
  border: "1px solid #97d5aa",
  background: "linear-gradient(180deg, #2ecc71 0%, #1f8f4d 100%)",
  color: "#fff",
  fontWeight: "800",
  fontSize: "13px",
  cursor: "pointer",
  boxShadow: "0 10px 20px rgba(34, 197, 94, 0.20)",
};

const mapZoomBadgeStyle = {
  minWidth: "70px",
  height: "38px",
  borderRadius: "11px",
  background: "#effaf2",
  border: "1px solid #d8eee0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#1b5b35",
  fontWeight: "800",
  fontSize: "13px",
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
  background: "linear-gradient(180deg, #ffffff 0%, #fbfffc 100%)",
  border: "1px solid #dcefe3",
  borderRadius: "28px",
  boxSizing: "border-box",
  padding: "18px",
  boxShadow: "0 16px 34px rgba(32, 94, 53, 0.08)",
};

const familyBlockRootStyle = {
  width: "100%",
  height: "100%",
  overflow: "visible",
  background: "linear-gradient(180deg, #effcf2 0%, #fbfffc 100%)",
  border: "2px solid #96d3a4",
  borderRadius: "28px",
  boxSizing: "border-box",
  padding: "18px",
  boxShadow: "0 18px 36px rgba(24, 79, 42, 0.12)",
};

const highlightedBlockStyle = {
  boxShadow: "0 0 0 4px #dcfce7, 0 18px 34px rgba(24, 79, 42, 0.14)",
  borderColor: "#75c28c",
};

const familyTopStripStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

const familyBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#ecfdf3",
  color: "#166534",
  fontWeight: "800",
  letterSpacing: "0.01em",
};

const collapseButtonStyle = {
  padding: "9px 12px",
  borderRadius: "12px",
  border: "1px solid #cfe7d6",
  background: "#fff",
  color: "#2c5e42",
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

const partnerPillWrapStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
};

const partnerCenterLinkStyle = {
  width: "24px",
  height: "5px",
  borderRadius: "999px",
  background: "linear-gradient(90deg, #4f9d64 0%, #7dc790 100%)",
};

const familyBottomMetaStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const metaChipStyle = {
  padding: "8px 12px",
  borderRadius: "999px",
  background: "#eef8f1",
  color: "#2f5d42",
  fontSize: "12px",
  fontWeight: "700",
};

const metaChipBlueStyle = {
  padding: "8px 12px",
  borderRadius: "999px",
  background: "#ecfdf3",
  color: "#16713d",
  fontSize: "12px",
  fontWeight: "700",
};

const familyBottomActionsStyle = {
  display: "flex",
  gap: "10px",
  justifyContent: "center",
  marginTop: "16px",
};

const personMiniStyle = {
  width: "220px",
  minHeight: "345px",
  background: "#fff",
  border: "1px solid #e3f0e7",
  borderRadius: "22px",
  padding: "14px",
  boxSizing: "border-box",
  boxShadow: "0 10px 20px rgba(32, 94, 53, 0.05)",
};

const personMiniImageWrapStyle = {
  width: "100%",
  height: "132px",
  borderRadius: "16px",
  overflow: "hidden",
  background: "#eef8f1",
  marginBottom: "12px",
};

const personMiniNameStyle = {
  fontSize: "16px",
  fontWeight: "800",
  color: "#12321f",
  textAlign: "center",
  lineHeight: 1.15,
  minHeight: "42px",
  marginBottom: "10px",
};

const personMiniInfoStyle = {
  minHeight: "72px",
  borderRadius: "14px",
  background: "#f6fbf7",
  padding: "9px",
  fontSize: "11px",
  lineHeight: 1.35,
  color: "#365947",
  textAlign: "center",
  marginBottom: "12px",
};

const personMiniNotesStyle = {
  borderRadius: "10px",
  background: "#f7fcf8",
  color: "#567262",
  lineHeight: 1.3,
  textAlign: "center",
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
  color: "#8aa19a",
  fontWeight: "700",
  fontSize: "12px",
  background: "linear-gradient(180deg, #f2fbf4 0%, #e7f5ea 100%)",
};

const editButtonStyle = {
  flex: 1,
  padding: "11px 10px",
  borderRadius: "12px",
  border: "none",
  background: "#2f7f53",
  color: "#fff",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
};

const deleteButtonStyle = {
  flex: 1,
  padding: "11px 10px",
  borderRadius: "12px",
  border: "none",
  background: "#d83c3c",
  color: "#fff",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
};

const softGreenButtonStyle = {
  flex: 1,
  padding: "11px 10px",
  borderRadius: "12px",
  border: "1px solid #9fd1ad",
  background: "#effcf2",
  color: "#166534",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
};

const softBlueButtonStyle = {
  flex: 1,
  padding: "11px 10px",
  borderRadius: "12px",
  border: "1px solid #b8dbc4",
  background: "#f5fff8",
  color: "#215a34",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
};

const primaryButton = {
  padding: "13px 18px",
  borderRadius: "14px",
  border: "none",
  background: "linear-gradient(180deg, #2d8b4f 0%, #1f6f3d 100%)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
};

const secondaryButton = {
  padding: "11px 15px",
  borderRadius: "13px",
  border: "1px solid #cfe7d6",
  background: "#fff",
  color: "#12321f",
  cursor: "pointer",
  fontWeight: "700",
  display: "inline-flex",
  alignItems: "center",
  fontSize: "13px",
};

const greenOutlineButton = {
  padding: "11px 15px",
  borderRadius: "13px",
  border: "1px solid #9fd1ad",
  background: "#effcf2",
  color: "#166534",
  cursor: "pointer",
  fontWeight: "700",
  display: "inline-flex",
  alignItems: "center",
  fontSize: "13px",
};

const dangerButton = {
  padding: "12px 18px",
  borderRadius: "13px",
  border: "none",
  background: "#d83c3c",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
};

const familyActionButtonGreen = {
  padding: "13px 18px",
  borderRadius: "14px",
  border: "none",
  background: "linear-gradient(180deg, #2d8b4f 0%, #1f6f3d 100%)",
  color: "#fff",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
};

const familyActionButtonBlue = {
  padding: "13px 18px",
  borderRadius: "14px",
  border: "1px solid #9fd1ad",
  background: "#effcf2",
  color: "#166534",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
};

const familyActionButtonGray = {
  padding: "13px 18px",
  borderRadius: "14px",
  border: "1px solid #cfe7d6",
  background: "#fff",
  color: "#2f5d42",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(17, 54, 30, 0.18)",
  display: "flex",
  justifyContent: "flex-end",
  zIndex: 1000,
};

const overlayCenterStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(17, 54, 30, 0.18)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1100,
};

const sidePanelStyle = {
  width: "430px",
  maxWidth: "100%",
  height: "100%",
  background: "#ffffff",
  boxShadow: "-8px 0 30px rgba(32, 94, 53, 0.15)",
  display: "flex",
  flexDirection: "column",
};

const panelHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "18px 18px 12px",
  borderBottom: "1px solid #e4f2e8",
};

const panelTitleStyle = {
  fontSize: "20px",
  fontWeight: "800",
  color: "#12321f",
};

const panelCloseStyle = {
  width: "36px",
  height: "36px",
  borderRadius: "10px",
  border: "1px solid #cfe7d6",
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

const labelStyle = {
  fontSize: "14px",
  fontWeight: "700",
  color: "#214e34",
};

const inputStyle = {
  padding: "13px 14px",
  borderRadius: "13px",
  border: "1.5px solid #cfe7d6",
  background: "#ffffff",
  fontSize: "15px",
  color: "#12321f",
  minHeight: "48px",
  width: "100%",
  boxSizing: "border-box",
};

const fileInputStyle = {
  padding: "10px 12px",
  borderRadius: "13px",
  border: "1.5px solid #cfe7d6",
  background: "#ffffff",
  fontSize: "14px",
  color: "#12321f",
  minHeight: "48px",
  width: "100%",
  boxSizing: "border-box",
};

const textareaStyle = {
  padding: "13px 14px",
  borderRadius: "13px",
  border: "1.5px solid #cfe7d6",
  background: "#ffffff",
  fontSize: "15px",
  color: "#12321f",
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

const sidePreviewWrapStyle = {
  width: "100%",
  height: "180px",
  borderRadius: "14px",
  overflow: "hidden",
  background: "#eef8f1",
  border: "1px solid #d8efe0",
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
  borderRadius: "24px",
  boxShadow: "0 18px 40px rgba(32, 94, 53, 0.18)",
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
  border: "1px solid #d8efe0",
  borderRadius: "16px",
  padding: "14px",
  background: "#f8fdf9",
};

const familySectionTitleStyle = {
  fontSize: "15px",
  fontWeight: "800",
  color: "#214e34",
  marginBottom: "10px",
};

const familyItemCardStyle = {
  border: "1px solid #d8efe0",
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
  color: "#12321f",
};

const childrenListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  marginBottom: "12px",
};

const childRowStyle = {
  border: "1px solid #d8efe0",
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
  color: "#12321f",
};