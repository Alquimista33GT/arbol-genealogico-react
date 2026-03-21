import { useEffect, useMemo, useState } from "react";
import { getPublicTreeBySlug } from "./services/treeService";

function getRoots(people) {
  return people.filter((p) => !p.parent1 && !p.parent2);
}

function getChildrenOfPerson(people, personId) {
  return people.filter((p) => p.parent1 === personId || p.parent2 === personId);
}

function PublicPersonCard({ person }) {
  return (
    <div style={cardStyle}>
      <div style={cardTopStyle}>
        <div style={photoWrapStyle}>
          {person.photo ? (
            <img src={person.photo} alt={person.name} style={photoStyle} />
          ) : (
            <div style={photoPlaceholderStyle}>Sin foto</div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={nameStyle}>{person.name || "Sin nombre"}</div>
          <div style={metaStyle}>
            {person.birthDate ? `Nac: ${person.birthDate}` : "Sin fecha"}
            {person.birthPlace ? ` · ${person.birthPlace}` : ""}
          </div>
        </div>
      </div>

      {person.notes ? <div style={notesStyle}>{person.notes}</div> : null}
    </div>
  );
}

function PublicTreeNode({ person, people, level = 0, visited = new Set() }) {
  if (!person || visited.has(person.id)) return null;

  const nextVisited = new Set(visited);
  nextVisited.add(person.id);

  const children = getChildrenOfPerson(people, person.id).filter(
    (child) => !nextVisited.has(child.id)
  );

  return (
    <div style={{ marginLeft: level * 26, marginTop: 14 }}>
      <PublicPersonCard person={person} />

      {children.length > 0 ? (
        <div style={childrenWrapStyle}>
          {children.map((child) => (
            <PublicTreeNode
              key={child.id}
              person={child}
              people={people}
              level={level + 1}
              visited={nextVisited}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function PublicTreePage({ slug }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPublicTree() {
      try {
        const data = await getPublicTreeBySlug(slug);
        setTree(data);
      } catch (error) {
        console.error("Error cargando árbol público:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPublicTree();
  }, [slug]);

  const roots = useMemo(() => {
    return Array.isArray(tree?.people) ? getRoots(tree.people) : [];
  }, [tree]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={wrapStyle}>Cargando árbol público...</div>
      </div>
    );
  }

  if (!tree) {
    return (
      <div style={pageStyle}>
        <div style={wrapStyle}>Este link no existe o ya no está disponible.</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={wrapStyle}>
        <div style={heroStyle}>
          <div>
            <h1 style={titleStyle}>{tree.name || "Árbol familiar"}</h1>
            <p style={subtitleStyle}>Vista pública · solo lectura</p>
          </div>
        </div>

        {roots.length === 0 ? (
          <div style={emptyStyle}>No hay personas publicadas en este árbol.</div>
        ) : (
          roots.map((root) => (
            <PublicTreeNode key={root.id} person={root} people={tree.people} />
          ))
        )}
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #eefcf3 0%, #f7fff9 100%)",
  padding: "20px",
  fontFamily: "Arial, sans-serif",
};

const wrapStyle = {
  maxWidth: "1100px",
  margin: "0 auto",
  background: "#fff",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
};

const heroStyle = {
  marginBottom: "22px",
  padding: "18px 20px",
  borderRadius: "20px",
  background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
  color: "#fff",
};

const titleStyle = {
  margin: 0,
  fontSize: "40px",
};

const subtitleStyle = {
  margin: "8px 0 0 0",
  opacity: 0.95,
  fontSize: "16px",
};

const emptyStyle = {
  padding: "24px",
  borderRadius: "16px",
  border: "1px dashed #cbd5e1",
  color: "#64748b",
};

const cardStyle = {
  background: "#f8fafc",
  border: "1px solid #dbe3ec",
  borderRadius: "18px",
  padding: "14px",
};

const cardTopStyle = {
  display: "flex",
  gap: "14px",
  alignItems: "center",
};

const photoWrapStyle = {
  width: "72px",
  height: "72px",
  borderRadius: "14px",
  overflow: "hidden",
  background: "#e5e7eb",
  flexShrink: 0,
};

const photoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const photoPlaceholderStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#94a3b8",
  fontWeight: "700",
  fontSize: "12px",
};

const nameStyle = {
  fontSize: "20px",
  fontWeight: "800",
  color: "#111827",
};

const metaStyle = {
  marginTop: "6px",
  color: "#475569",
  fontSize: "14px",
};

const notesStyle = {
  marginTop: "10px",
  color: "#334155",
  fontSize: "14px",
  lineHeight: 1.45,
};

const childrenWrapStyle = {
  marginTop: "8px",
  paddingLeft: "10px",
  borderLeft: "3px solid #cbd5e1",
};
