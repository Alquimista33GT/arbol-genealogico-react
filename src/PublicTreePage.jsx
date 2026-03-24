import { useEffect, useMemo, useRef, useState } from "react";
import { getPublicTree } from "./services/treeService";

function getPersonById(people, id) {
  return people.find((p) => p.id === id) || null;
}

function getRoots(people) {
  return people.filter((p) => {
    const hasNoParents = !p.parent1 && !p.parent2;
    if (!hasNoParents) return false;
    if (p.partnerId && p.id > p.partnerId) return false;
    return true;
  });
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

function buildTree(people, personId, visited = new Set()) {
  const person = getPersonById(people, personId);
  if (!person || visited.has(personId)) return null;

  const nextVisited = new Set(visited);
  nextVisited.add(personId);

  const partner = person.partnerId ? getPersonById(people, person.partnerId) : null;
  if (partner) nextVisited.add(partner.id);

  const children = getChildrenOfPair(people, person.id, partner?.id || "")
    .filter((child) => !nextVisited.has(child.id))
    .map((child) => buildTree(people, child.id, nextVisited))
    .filter(Boolean);

  return {
    id: person.id,
    person,
    partner,
    children,
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

function createPositions(layout, isMobile) {
  const positions = {};
  const gapX = isMobile ? 250 : 380;
  const gapY = isMobile ? 280 : 360;

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

function PublicPersonCard({ person }) {
  return (
    <div xmlns="http://www.w3.org/1999/xhtml" style={publicPersonStyle}>
      <div style={publicImageWrapStyle}>
        {person.photo ? (
          <img src={person.photo} alt={person.name} style={publicImageStyle} />
        ) : (
          <div style={publicImagePlaceholderStyle}>Sin foto</div>
        )}
      </div>

      <div style={publicNameStyle}>{person.name || "Sin nombre"}</div>

      <div style={publicInfoStyle}>
        {person.birthDate ? <div>Nac: {person.birthDate}</div> : null}
        {person.birthPlace ? <div>Lugar: {person.birthPlace}</div> : null}
        {!person.birthDate && !person.birthPlace ? (
          <div style={{ color: "#94a3b8" }}>Sin datos</div>
        ) : null}
      </div>

      {person.notes ? <div style={publicNotesStyle}>{person.notes}</div> : null}
    </div>
  );
}

function PublicFamilyBlock({ node, x, y, root, highlightedId, isMobile }) {
  const { person, partner } = node;
  const w = partner ? (isMobile ? 250 : 360) : isMobile ? 120 : 180;
  const h = root ? (isMobile ? 230 : 290) : isMobile ? 215 : 270;
  const left = x - w / 2;

  const isHighlighted = highlightedId && (highlightedId === person.id || highlightedId === partner?.id);

  return (
    <foreignObject x={left} y={y} width={w} height={h}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          ...(root ? publicFamilyRootStyle : publicFamilyStyle),
          ...(isHighlighted ? publicHighlightedStyle : {}),
        }}
      >
        <div style={publicHeaderStyle}>{partner ? "Unidad familiar" : "Persona"}</div>

        <div style={partner ? publicFamilyRowStyle : publicFamilySingleStyle}>
          <PublicPersonCard person={person} />
          {partner ? (
            <>
              <div style={publicLinkWrapStyle}>
                <div style={publicLinkStyle} />
              </div>
              <PublicPersonCard person={partner} />
            </>
          ) : null}
        </div>
      </div>
    </foreignObject>
  );
}

export default function PublicTreePage({ slug }) {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedSearchId, setSelectedSearchId] = useState("");
  const [zoom, setZoom] = useState(typeof window !== "undefined" && window.innerWidth <= 900 ? 0.68 : 0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 900 : false);

  const dragRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    async function loadPublicTree() {
      try {
        const data = await getPublicTree(slug);
        setTreeData(data);
      } catch (error) {
        console.error("Error cargando árbol público:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPublicTree();
  }, [slug]);

  const people = Array.isArray(treeData?.people) ? treeData.people : [];
  const roots = useMemo(() => getRoots(people), [people]);

  const forest = useMemo(() => roots.map((root) => buildTree(people, root.id)).filter(Boolean), [people, roots]);

  const layout = useMemo(() => {
    const merged = { levels: [], nodes: [], edges: [] };

    forest.forEach((tree) => {
      const partial = measureTree(tree);
      partial.levels.forEach((levelNodes, idx) => {
        if (!merged.levels[idx]) merged.levels[idx] = [];
        merged.levels[idx].push(...levelNodes);
      });
      merged.nodes.push(...partial.nodes);
      merged.edges.push(...partial.edges);
    });

    return merged;
  }, [forest]);

  const positions = useMemo(() => createPositions(layout, isMobile), [layout, isMobile]);

  useEffect(() => {
    if (!layout.nodes.length) return;
    const first = layout.nodes[0];
    const pos = positions[first.id];
    if (pos) {
      setPan({ x: -pos.x, y: -pos.y + 120 });
    }
  }, [layout, positions]);

  const filteredPeople = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return people.slice(0, 50);
    return people.filter((p) => (p.name || "").toLowerCase().includes(q)).slice(0, 50);
  }, [people, searchText]);

  function focusPerson(personId) {
    if (!personId || !positions[personId]) return;
    setSelectedSearchId(personId);
    setPan({ x: -positions[personId].x, y: -positions[personId].y + 120 });
    setZoom(isMobile ? 0.92 : 1.05);
  }

  function startDrag(clientX, clientY) {
    setDragging(true);
    dragRef.current = { x: clientX, y: clientY, panX: pan.x, panY: pan.y };
  }

  function moveDrag(clientX, clientY) {
    if (!dragging) return;
    const dx = clientX - dragRef.current.x;
    const dy = clientY - dragRef.current.y;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  }

  function onMouseDown(e) {
    startDrag(e.clientX, e.clientY);
  }

  function onMouseMove(e) {
    moveDrag(e.clientX, e.clientY);
  }

  function onTouchStart(e) {
    const touch = e.touches?.[0];
    if (!touch) return;
    startDrag(touch.clientX, touch.clientY);
  }

  function onTouchMove(e) {
    const touch = e.touches?.[0];
    if (!touch) return;
    moveDrag(touch.clientX, touch.clientY);
  }

  function stopDrag() {
    setDragging(false);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copiado al portapapeles");
    } catch {
      alert(window.location.href);
    }
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={publicWrapStyle}>Cargando árbol público...</div>
      </div>
    );
  }

  if (!treeData) {
    return (
      <div style={pageStyle}>
        <div style={publicWrapStyle}>
          <div style={notFoundCardStyle}>
            <h1 style={{ marginTop: 0 }}>Link no disponible</h1>
            <p style={{ color: "#64748b" }}>
              Este árbol no existe o ya dejó de estar compartido.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={publicWrapStyle}>
        <div style={{ ...publicHeroStyle, padding: isMobile ? "16px" : "22px" }}>
          <div>
            <h1 style={{ ...publicTitleStyle, fontSize: isMobile ? "28px" : "40px" }}>
              {treeData.name || "Árbol familiar"}
            </h1>
            <p style={publicSubtitleStyle}>Árbol compartido · solo lectura</p>
          </div>

          <div style={{ ...publicHeroActionsStyle, width: isMobile ? "100%" : "auto" }}>
            <input
              type="text"
              placeholder="Buscar familiar"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ ...publicSearchInputStyle, minWidth: isMobile ? "100%" : "220px" }}
            />
            <select
              value={selectedSearchId}
              onChange={(e) => {
                setSelectedSearchId(e.target.value);
                focusPerson(e.target.value);
              }}
              style={{ ...publicSearchSelectStyle, minWidth: isMobile ? "100%" : "220px" }}
            >
              <option value="">Selecciona resultado</option>
              {filteredPeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button style={{ ...publicButtonStyle, width: isMobile ? "100%" : "auto" }} onClick={handleCopyLink}>
              Copiar link
            </button>
          </div>
        </div>

        <div style={publicToolbarStyle}>
          <button style={publicButtonStyle} onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.05).toFixed(2)))}>
            -
          </button>
          <div style={publicZoomLabelStyle}>Zoom {Math.round(zoom * 100)}%</div>
          <button style={publicButtonStyle} onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.05).toFixed(2)))}>
            +
          </button>
          <button
            style={publicButtonStyle}
            onClick={() => {
              setZoom(isMobile ? 0.68 : 0.85);
              setPan({ x: 0, y: 0 });
              setSelectedSearchId("");
            }}
          >
            Centrar
          </button>
        </div>

        {people.length === 0 ? (
          <div style={emptyStyle}>No hay familiares públicos en este árbol.</div>
        ) : (
          <div
            style={treeViewportStyle}
            onMouseMove={onMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
            onTouchMove={onTouchMove}
            onTouchEnd={stopDrag}
          >
            <div
              style={{
                ...treeCanvasWrapStyle,
                minWidth: isMobile ? "2200px" : "3400px",
                minHeight: isMobile ? "1800px" : "2600px",
                cursor: dragging ? "grabbing" : "grab",
              }}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
            >
              <svg
                id="public-family-tree-svg"
                width={isMobile ? "2200" : "3400"}
                height={isMobile ? "1800" : "2600"}
                style={svgStyle}
              >
                <g transform={`translate(${isMobile ? 1100 : 1700} 120) translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                  {layout.edges.map((edge, idx) => {
                    const parentPos = positions[edge.from];
                    const childPos = positions[edge.to];
                    if (!parentPos || !childPos) return null;

                    const parentBottom = parentPos.y + (isMobile ? 240 : 300);
                    const childTop = childPos.y;

                    return (
                      <path
                        key={idx}
                        d={curvePath(parentPos.x, parentBottom, childPos.x, childTop)}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth={isMobile ? "3" : "4"}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {layout.nodes.map((node) => {
                    const pos = positions[node.id];
                    if (!pos) return null;

                    return (
                      <PublicFamilyBlock
                        key={node.id}
                        node={node}
                        x={pos.x}
                        y={pos.y}
                        root={pos.y === 0}
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
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #eefcf3 0%, #f7fff9 100%)",
  padding: "16px",
  fontFamily: "Arial, sans-serif",
};

const publicWrapStyle = {
  maxWidth: "1820px",
  margin: "0 auto",
};

const publicHeroStyle = {
  background: "#ffffff",
  borderRadius: "24px",
  boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
  marginBottom: "14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
};

const publicTitleStyle = {
  margin: 0,
  color: "#1f2937",
};

const publicSubtitleStyle = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#64748b",
  fontSize: "16px",
};

const publicHeroActionsStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const publicSearchInputStyle = {
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1.5px solid #cbd5e1",
  fontSize: "14px",
};

const publicSearchSelectStyle = {
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1.5px solid #cbd5e1",
  fontSize: "14px",
};

const publicToolbarStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: "14px",
};

const publicButtonStyle = {
  padding: "11px 15px",
  borderRadius: "12px",
  border: "1px solid #cfd8e3",
  background: "#fff",
  color: "#111827",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
};

const publicZoomLabelStyle = {
  minWidth: "95px",
  textAlign: "center",
  fontWeight: "700",
  color: "#0f172a",
  fontSize: "14px",
};

const notFoundCardStyle = {
  background: "#fff",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
};

const publicFamilyStyle = {
  width: "100%",
  height: "100%",
  background: "#ffffff",
  border: "2px solid #dbe3ec",
  borderRadius: "24px",
  boxSizing: "border-box",
  padding: "12px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const publicFamilyRootStyle = {
  width: "100%",
  height: "100%",
  background: "#f0fdf4",
  border: "2px solid #86efac",
  borderRadius: "24px",
  boxSizing: "border-box",
  padding: "12px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const publicHighlightedStyle = {
  boxShadow: "0 0 0 4px #facc15, 0 10px 28px rgba(0,0,0,0.10)",
  borderColor: "#facc15",
};

const publicHeaderStyle = {
  fontSize: "13px",
  fontWeight: "800",
  color: "#334155",
  marginBottom: "10px",
  textAlign: "center",
};

const publicFamilyRowStyle = {
  display: "flex",
  gap: "8px",
  alignItems: "stretch",
  justifyContent: "center",
};

const publicFamilySingleStyle = {
  display: "flex",
  justifyContent: "center",
};

const publicLinkWrapStyle = {
  width: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const publicLinkStyle = {
  width: "14px",
  height: "4px",
  borderRadius: "999px",
  background: "#22c55e",
};

const publicPersonStyle = {
  width: "112px",
  minHeight: "160px",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "8px",
  boxSizing: "border-box",
};

const publicImageWrapStyle = {
  width: "100%",
  height: "60px",
  borderRadius: "12px",
  overflow: "hidden",
  background: "#f3f4f6",
  marginBottom: "8px",
};

const publicImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const publicImagePlaceholderStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#9ca3af",
  fontWeight: "600",
  fontSize: "11px",
};

const publicNameStyle = {
  fontSize: "12px",
  fontWeight: "800",
  color: "#111827",
  textAlign: "center",
  lineHeight: 1.15,
  minHeight: "28px",
  marginBottom: "8px",
};

const publicInfoStyle = {
  minHeight: "40px",
  borderRadius: "10px",
  background: "#f8fafc",
  padding: "6px",
  fontSize: "9px",
  lineHeight: 1.35,
  color: "#334155",
  textAlign: "center",
  marginBottom: "6px",
};

const publicNotesStyle = {
  fontSize: "9px",
  lineHeight: 1.35,
  color: "#475569",
  background: "#f8fafc",
  borderRadius: "10px",
  padding: "6px",
};

const emptyStyle = {
  padding: "26px",
  border: "2px dashed #cbd5e1",
  borderRadius: "16px",
  textAlign: "center",
  color: "#64748b",
  marginTop: "20px",
  fontSize: "18px",
  background: "#fff",
};

const treeViewportStyle = {
  marginTop: "14px",
  borderRadius: "18px",
  background: "linear-gradient(180deg, #fafafa 0%, #f8fafc 100%)",
  border: "1px solid #e5e7eb",
  overflow: "auto",
  height: "78vh",
  touchAction: "none",
};

const treeCanvasWrapStyle = {};

const svgStyle = {
  display: "block",
  userSelect: "none",
};
