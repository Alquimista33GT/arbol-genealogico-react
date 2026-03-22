import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import FamilyTreeApp from "./FamilyTreeApp";

export default function Home({ user }) {
  const [view, setView] = useState("home");

  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error cerrando sesión:", error);
      alert("No se pudo cerrar sesión");
    }
  }

  if (view === "tree") {
    return (
      <div style={treePageStyle}>
        <div style={treeTopBarStyle}>
          <div style={treeTopLeftStyle}>
            <div style={treeTopTitleStyle}>Árbol Genealógico</div>
            <div style={treeTopSubStyle}>{user?.email || "Usuario"}</div>
          </div>

          <div style={treeTopButtonsStyle}>
            <button style={secondaryButtonStyle} onClick={() => setView("home")}>
              Volver al inicio
            </button>
            <button style={dangerButtonStyle} onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>

        <FamilyTreeApp user={user} />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={heroStyle}>
          <div>
            <h1 style={titleStyle}>Árbol Genealógico</h1>
            <p style={subtitleStyle}>
              Base estable con autenticación lista para continuar el proyecto.
            </p>
          </div>

          <div style={userBoxStyle}>
            <div style={userLabelStyle}>Sesión activa</div>
            <div style={userEmailStyle}>{user?.email || "Usuario"}</div>
          </div>
        </div>

        <div style={gridStyle}>
          <div style={cardStyle}>
            <div style={cardTitleStyle}>Proyecto</div>
            <p style={cardTextStyle}>
              Ya tienes login funcionando. Ahora el árbol vuelve a abrirse desde
              una entrada estable dentro de la app.
            </p>
            <button style={primaryButtonStyle} onClick={() => setView("tree")}>
              Entrar al árbol
            </button>
          </div>

          <div style={cardStyle}>
            <div style={cardTitleStyle}>Estado actual</div>
            <ul style={listStyle}>
              <li>Login funcionando</li>
              <li>Firebase conectado</li>
              <li>Home funcionando</li>
              <li>Listo para reconectar el árbol</li>
            </ul>
          </div>

          <div style={cardStyle}>
            <div style={cardTitleStyle}>Cuenta</div>
            <p style={cardTextStyle}>
              Después conectaremos guardado en nube, varios árboles y compartir
              por link.
            </p>
            <button style={dangerButtonStyle} onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>
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

const containerStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
};

const heroStyle = {
  background: "#ffffff",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: "18px",
};

const titleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "42px",
};

const subtitleStyle = {
  marginTop: "10px",
  color: "#64748b",
  fontSize: "16px",
};

const userBoxStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "16px 18px",
  minWidth: "260px",
};

const userLabelStyle = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "700",
};

const userEmailStyle = {
  color: "#0f172a",
  fontSize: "16px",
  fontWeight: "800",
  marginTop: "6px",
  wordBreak: "break-word",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "16px",
};

const cardStyle = {
  background: "#ffffff",
  borderRadius: "20px",
  padding: "20px",
  boxShadow: "0 10px 28px rgba(0,0,0,0.06)",
  border: "1px solid #e5e7eb",
};

const cardTitleStyle = {
  fontSize: "20px",
  fontWeight: "800",
  color: "#111827",
  marginBottom: "10px",
};

const cardTextStyle = {
  color: "#475569",
  fontSize: "15px",
  lineHeight: 1.5,
  marginBottom: "16px",
};

const listStyle = {
  margin: 0,
  paddingLeft: "18px",
  color: "#475569",
  lineHeight: 1.7,
};

const primaryButtonStyle = {
  padding: "13px 18px",
  borderRadius: "12px",
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: "700",
  fontSize: "14px",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  padding: "13px 18px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#111827",
  fontWeight: "700",
  fontSize: "14px",
  cursor: "pointer",
};

const dangerButtonStyle = {
  padding: "13px 18px",
  borderRadius: "12px",
  border: "none",
  background: "#dc2626",
  color: "#fff",
  fontWeight: "700",
  fontSize: "14px",
  cursor: "pointer",
};

const treePageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #eefcf3 0%, #f7fff9 100%)",
};

const treeTopBarStyle = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: "#ffffff",
  borderBottom: "1px solid #e5e7eb",
  padding: "14px 20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
  boxShadow: "0 8px 20px rgba(0,0,0,0.04)",
  fontFamily: "Arial, sans-serif",
};

const treeTopLeftStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const treeTopTitleStyle = {
  fontSize: "20px",
  fontWeight: "800",
  color: "#111827",
};

const treeTopSubStyle = {
  fontSize: "13px",
  color: "#64748b",
};

const treeTopButtonsStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};
