import { useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import FamilyTreeApp from "./FamilyTreeApp";
import logo from "./assets/logo-tree.png";

function displayNameFromUser(user) {
  if (user?.displayName?.trim()) return user.displayName.trim();
  if (user?.email) return user.email.split("@")[0];
  return "Usuario";
}

function initialsFromText(text) {
  const parts = String(text || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "U";
}

export default function Home({ user }) {
  const [view, setView] = useState("home");
  const displayName = useMemo(() => displayNameFromUser(user), [user]);
  const initials = useMemo(() => initialsFromText(displayName), [displayName]);

  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
      alert("No se pudo cerrar sesión.");
    }
  }

  if (view === "tree") {
    return <FamilyTreeApp user={user} onBack={() => setView("home")} onLogout={handleLogout} />;
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <section style={heroStyle}>
          <div style={leftHero}>
            <div style={heroBadge}>Panel principal</div>
            <h1 style={heroTitle}>Bienvenido, {displayName}</h1>
            <p style={heroText}>
              Administra tus árboles con una experiencia visual más elegante,
              adaptable a móvil y lista para seguir creciendo.
            </p>

            <div style={heroButtons}>
              <button style={primaryBtn} onClick={() => setView("tree")}>
                Entrar al árbol
              </button>
              <button style={secondaryBtn} onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          </div>

          <div style={profileCard}>
            <div style={profileHeader}>
              <div style={logoWrap}>
                <img src={logo} alt="Logo" style={logoStyle} />
              </div>
              <div style={avatar}>{initials}</div>
            </div>

            <div style={profileName}>{displayName}</div>
            <div style={profileEmail}>{user?.email || "Usuario autenticado"}</div>

            <div style={statsGrid}>
              <div style={statCard}>
                <div style={statLabel}>Sesión</div>
                <div style={statValue}>Activa</div>
              </div>
              <div style={statCard}>
                <div style={statLabel}>Estado</div>
                <div style={statValue}>Listo</div>
              </div>
              <div style={statCard}>
                <div style={statLabel}>Guardado</div>
                <div style={statValue}>Nube</div>
              </div>
              <div style={statCard}>
                <div style={statLabel}>Vista</div>
                <div style={statValue}>Pro</div>
              </div>
            </div>
          </div>
        </section>

        <section style={cardsGrid}>
          <article style={featureCard}>
            <div style={cardIcon}>🌳</div>
            <h3 style={cardTitle}>Árbol visual</h3>
            <p style={cardText}>
              Diseño más ordenado con conexiones suaves, tarjetas limpias y mejor lectura.
            </p>
          </article>

          <article style={featureCard}>
            <div style={cardIcon}>📱</div>
            <h3 style={cardTitle}>Móvil optimizado</h3>
            <p style={cardText}>
              Controles adaptados, paneles compactos y mejor comportamiento en pantallas pequeñas.
            </p>
          </article>

          <article style={featureCard}>
            <div style={cardIcon}>☁️</div>
            <h3 style={cardTitle}>Guardado correcto</h3>
            <p style={cardText}>
              El servicio de árboles quedó alineado para guardar y leer desde Firebase sin romper.
            </p>
          </article>
        </section>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  padding: "20px",
};

const containerStyle = {
  maxWidth: "1240px",
  margin: "0 auto",
};

const heroStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(340px, 1.2fr) minmax(280px, 0.85fr)",
  gap: "18px",
  alignItems: "stretch",
};

const leftHero = {
  background: "rgba(255,255,255,0.74)",
  backdropFilter: "blur(10px)",
  border: "1px solid #d8e8dc",
  boxShadow: "0 14px 40px rgba(24,63,40,0.08)",
  borderRadius: "30px",
  padding: "30px",
};

const heroBadge = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "#eaf7ee",
  color: "#177545",
  fontWeight: 800,
  fontSize: "12px",
  marginBottom: "12px",
};

const heroTitle = {
  margin: "0 0 12px",
  fontSize: "clamp(34px, 5vw, 56px)",
  lineHeight: 1.02,
};

const heroText = {
  margin: 0,
  color: "#5f7a69",
  fontSize: "16px",
  lineHeight: 1.7,
  maxWidth: "720px",
};

const heroButtons = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "22px",
};

const primaryBtn = {
  padding: "14px 18px",
  border: "none",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #1f9d55, #157841)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryBtn = {
  padding: "14px 18px",
  border: "1px solid #d8e8dc",
  borderRadius: "16px",
  background: "#fff",
  color: "#173222",
  fontWeight: 900,
  cursor: "pointer",
};

const profileCard = {
  background: "#ffffff",
  border: "1px solid #d8e8dc",
  boxShadow: "0 14px 40px rgba(24,63,40,0.08)",
  borderRadius: "30px",
  padding: "24px",
};

const profileHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
};

const logoWrap = {
  width: "70px",
  height: "70px",
  borderRadius: "20px",
  overflow: "hidden",
  background: "#fff",
  border: "1px solid #d8e8dc",
};

const logoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  padding: "4px",
};

const avatar = {
  width: "58px",
  height: "58px",
  borderRadius: "18px",
  background: "linear-gradient(135deg, #1f9d55, #157841)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  fontSize: "20px",
};

const profileName = {
  marginTop: "18px",
  fontWeight: 900,
  fontSize: "24px",
};

const profileEmail = {
  marginTop: "6px",
  color: "#64806e",
  wordBreak: "break-word",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "18px",
};

const statCard = {
  background: "#f7fbf8",
  border: "1px solid #e1efe5",
  borderRadius: "18px",
  padding: "14px",
};

const statLabel = {
  color: "#688372",
  fontSize: "12px",
  fontWeight: 800,
};

const statValue = {
  marginTop: "4px",
  fontWeight: 900,
  fontSize: "17px",
};

const cardsGrid = {
  marginTop: "18px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "16px",
};

const featureCard = {
  background: "rgba(255,255,255,0.86)",
  border: "1px solid #d8e8dc",
  boxShadow: "0 14px 40px rgba(24,63,40,0.08)",
  borderRadius: "26px",
  padding: "22px",
};

const cardIcon = {
  fontSize: "28px",
};

const cardTitle = {
  margin: "10px 0 8px",
  fontSize: "22px",
};

const cardText = {
  margin: 0,
  color: "#5f7a69",
  lineHeight: 1.7,
};
