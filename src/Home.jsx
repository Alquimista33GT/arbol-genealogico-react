import { useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import FamilyTreeApp from "./FamilyTreeApp";

function getDisplayName(user) {
  if (user?.displayName?.trim()) return user.displayName.trim();
  if (user?.email) return user.email.split("@")[0];
  return "Usuario";
}

function getInitials(text) {
  const clean = String(text || "").trim();
  if (!clean) return "U";

  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "U";
}

export default function Home({ user }) {
  const [view, setView] = useState("home");

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);

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
            <div style={treeTopTitleRowStyle}>
              <div style={miniAvatarStyle}>{initials}</div>
              <div>
                <div style={treeTopTitleStyle}>Árbol Genealógico</div>
                <div style={treeTopSubStyle}>
                  Espacio personal de {displayName}
                </div>
              </div>
            </div>
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
      <div style={backgroundGlowOneStyle} />
      <div style={backgroundGlowTwoStyle} />

      <div style={containerStyle}>
        <div style={heroStyle}>
          <div style={heroLeftStyle}>
            <div style={heroTagStyle}>Panel principal</div>

            <h1 style={titleStyle}>Bienvenido, {displayName}</h1>

            <p style={subtitleStyle}>
              Administra tus árboles genealógicos en un espacio más limpio,
              visual y listo para crecer con compartir por link, permisos y PDF elegante.
            </p>

            <div style={heroActionsStyle}>
              <button style={primaryButtonStyle} onClick={() => setView("tree")}>
                Entrar al árbol
              </button>

              <button style={secondaryButtonStyle} onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          </div>

          <div style={profileCardStyle}>
            <div style={profileTopStyle}>
              <div style={avatarStyle}>{initials}</div>

              <div style={profileTextWrapStyle}>
                <div style={profileNameStyle}>{displayName}</div>
                <div style={profileEmailStyle}>{user?.email || "Usuario autenticado"}</div>
              </div>
            </div>

            <div style={profileDividerStyle} />

            <div style={profileStatsGridStyle}>
              <div style={statCardStyle}>
                <div style={statLabelStyle}>Sesión</div>
                <div style={statValueStyle}>Activa</div>
              </div>

              <div style={statCardStyle}>
                <div style={statLabelStyle}>Guardado</div>
                <div style={statValueStyle}>Firestore</div>
              </div>

              <div style={statCardStyle}>
                <div style={statLabelStyle}>Modo</div>
                <div style={statValueStyle}>Privado</div>
              </div>

              <div style={statCardStyle}>
                <div style={statLabelStyle}>Estado</div>
                <div style={statValueStyle}>Listo</div>
              </div>
            </div>
          </div>
        </div>

        <div style={sectionTitleWrapStyle}>
          <div style={sectionTitleStyle}>Tu espacio de trabajo</div>
          <div style={sectionSubtitleStyle}>
            Todo preparado para que cada usuario entre a su árbol de forma clara y agradable.
          </div>
        </div>

        <div style={gridStyle}>
          <div style={featureCardStyle}>
            <div style={featureIconStyle}>🌳</div>
            <div style={cardTitleStyle}>Entrar al árbol</div>
            <p style={cardTextStyle}>
              Abre tu espacio genealógico con edición, búsqueda, zoom, panel familiar
              y sincronización en Firestore.
            </p>
            <button style={primaryButtonStyle} onClick={() => setView("tree")}>
              Abrir ahora
            </button>
          </div>

          <div style={featureCardStyle}>
            <div style={featureIconStyle}>☁️</div>
            <div style={cardTitleStyle}>Guardado en nube</div>
            <p style={cardTextStyle}>
              Tus datos se manejan desde Firestore para que el árbol sea consistente
              entre PC, móvil y futuras mejoras de colaboración.
            </p>
            <div style={statusPillStyle}>Full Firestore</div>
          </div>

          <div style={featureCardStyle}>
            <div style={featureIconStyle}>🔗</div>
            <div style={cardTitleStyle}>Compartir y crecer</div>
            <p style={cardTextStyle}>
              La base ya está lista para compartir árboles públicos, agregar permisos
              lector/editor y mejorar el diseño tipo red social.
            </p>
            <div style={listBoxStyle}>
              <div style={listItemStyle}>• Compartir por link</div>
              <div style={listItemStyle}>• Permisos por usuario</div>
              <div style={listItemStyle}>• PDF elegante</div>
            </div>
          </div>
        </div>

        <div style={bottomBannerStyle}>
          <div style={bottomBannerTextWrapStyle}>
            <div style={bottomBannerTitleStyle}>Continúa tu proyecto</div>
            <div style={bottomBannerTextStyle}>
              Tu panel ya está mejor preparado para verse profesional y más agradable
              para cada cuenta autenticada.
            </div>
          </div>

          <button style={primaryButtonStyle} onClick={() => setView("tree")}>
            Seguir trabajando
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",
  background:
    "linear-gradient(180deg, #f4fff7 0%, #eefcf3 45%, #f8fffb 100%)",
  padding: "20px",
  fontFamily: "Arial, sans-serif",
};

const backgroundGlowOneStyle = {
  position: "absolute",
  top: "-120px",
  left: "-100px",
  width: "320px",
  height: "320px",
  borderRadius: "999px",
  background: "rgba(34, 197, 94, 0.12)",
  filter: "blur(40px)",
  pointerEvents: "none",
};

const backgroundGlowTwoStyle = {
  position: "absolute",
  bottom: "-120px",
  right: "-80px",
  width: "300px",
  height: "300px",
  borderRadius: "999px",
  background: "rgba(16, 185, 129, 0.10)",
  filter: "blur(40px)",
  pointerEvents: "none",
};

const containerStyle = {
  position: "relative",
  zIndex: 1,
  maxWidth: "1280px",
  margin: "0 auto",
};

const heroStyle = {
  background: "rgba(255,255,255,0.88)",
  backdropFilter: "blur(10px)",
  borderRadius: "30px",
  padding: "28px",
  boxShadow: "0 18px 45px rgba(22, 101, 52, 0.10)",
  border: "1px solid #dbf0e2",
  display: "grid",
  gridTemplateColumns: "minmax(320px, 1.2fr) minmax(280px, 0.8fr)",
  gap: "20px",
  alignItems: "stretch",
};

const heroLeftStyle = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const heroTagStyle = {
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "#ecfdf3",
  color: "#166534",
  fontWeight: "800",
  fontSize: "12px",
  marginBottom: "14px",
  border: "1px solid #ccebd6",
};

const titleStyle = {
  margin: 0,
  color: "#12321f",
  fontSize: "clamp(32px, 5vw, 52px)",
  lineHeight: 1.02,
  letterSpacing: "-0.03em",
};

const subtitleStyle = {
  marginTop: "14px",
  color: "#567262",
  fontSize: "16px",
  lineHeight: 1.65,
  maxWidth: "680px",
};

const heroActionsStyle = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "22px",
};

const profileCardStyle = {
  background: "linear-gradient(180deg, #ffffff 0%, #f7fff9 100%)",
  borderRadius: "24px",
  padding: "22px",
  border: "1px solid #dcefe3",
  boxShadow: "0 14px 34px rgba(22, 101, 52, 0.08)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const profileTopStyle = {
  display: "flex",
  gap: "14px",
  alignItems: "center",
};

const avatarStyle = {
  width: "68px",
  height: "68px",
  borderRadius: "18px",
  background: "linear-gradient(180deg, #34d399 0%, #16a34a 100%)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "24px",
  boxShadow: "0 10px 24px rgba(22, 163, 74, 0.25)",
  flexShrink: 0,
};

const profileTextWrapStyle = {
  minWidth: 0,
};

const profileNameStyle = {
  color: "#12321f",
  fontSize: "20px",
  fontWeight: "800",
  lineHeight: 1.2,
};

const profileEmailStyle = {
  color: "#5f7a6b",
  fontSize: "14px",
  marginTop: "6px",
  wordBreak: "break-word",
};

const profileDividerStyle = {
  height: "1px",
  background: "#e4f2e8",
  margin: "18px 0",
};

const profileStatsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const statCardStyle = {
  background: "#f7fcf8",
  border: "1px solid #e3f0e7",
  borderRadius: "16px",
  padding: "12px",
};

const statLabelStyle = {
  color: "#6b8577",
  fontSize: "12px",
  fontWeight: "700",
};

const statValueStyle = {
  color: "#184f2a",
  fontSize: "16px",
  fontWeight: "800",
  marginTop: "5px",
};

const sectionTitleWrapStyle = {
  marginTop: "24px",
  marginBottom: "16px",
};

const sectionTitleStyle = {
  color: "#184f2a",
  fontSize: "24px",
  fontWeight: "900",
};

const sectionSubtitleStyle = {
  color: "#64806f",
  fontSize: "15px",
  marginTop: "6px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "16px",
};

const featureCardStyle = {
  background: "rgba(255,255,255,0.92)",
  borderRadius: "24px",
  padding: "22px",
  boxShadow: "0 12px 30px rgba(22, 101, 52, 0.07)",
  border: "1px solid #e0efe5",
  display: "flex",
  flexDirection: "column",
  minHeight: "240px",
};

const featureIconStyle = {
  width: "54px",
  height: "54px",
  borderRadius: "16px",
  background: "#effcf2",
  border: "1px solid #d6eedf",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  marginBottom: "14px",
};

const cardTitleStyle = {
  fontSize: "22px",
  fontWeight: "900",
  color: "#12321f",
  marginBottom: "10px",
};

const cardTextStyle = {
  color: "#556f60",
  fontSize: "15px",
  lineHeight: 1.65,
  margin: 0,
  marginBottom: "16px",
};

const listBoxStyle = {
  marginTop: "auto",
  padding: "14px",
  borderRadius: "16px",
  background: "#f7fcf8",
  border: "1px solid #e3f0e7",
};

const listItemStyle = {
  color: "#446252",
  fontSize: "14px",
  lineHeight: 1.7,
};

const statusPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  padding: "9px 12px",
  borderRadius: "999px",
  background: "#ecfdf3",
  border: "1px solid #caecd5",
  color: "#166534",
  fontWeight: "800",
  fontSize: "13px",
  marginTop: "auto",
};

const bottomBannerStyle = {
  marginTop: "18px",
  background: "linear-gradient(135deg, #eafff1 0%, #f7fff9 100%)",
  border: "1px solid #d8efe0",
  borderRadius: "24px",
  padding: "20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  boxShadow: "0 10px 24px rgba(22, 101, 52, 0.05)",
};

const bottomBannerTextWrapStyle = {
  maxWidth: "760px",
};

const bottomBannerTitleStyle = {
  color: "#184f2a",
  fontSize: "22px",
  fontWeight: "900",
};

const bottomBannerTextStyle = {
  color: "#587364",
  fontSize: "15px",
  lineHeight: 1.6,
  marginTop: "6px",
};

const primaryButtonStyle = {
  padding: "14px 20px",
  borderRadius: "14px",
  border: "none",
  background: "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)",
  color: "#fff",
  fontWeight: "800",
  fontSize: "14px",
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(34, 197, 94, 0.22)",
};

const secondaryButtonStyle = {
  padding: "14px 20px",
  borderRadius: "14px",
  border: "1px solid #cfe7d6",
  background: "#fff",
  color: "#12321f",
  fontWeight: "800",
  fontSize: "14px",
  cursor: "pointer",
};

const dangerButtonStyle = {
  padding: "14px 20px",
  borderRadius: "14px",
  border: "none",
  background: "linear-gradient(180deg, #ef4444 0%, #dc2626 100%)",
  color: "#fff",
  fontWeight: "800",
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
  background: "rgba(255,255,255,0.94)",
  backdropFilter: "blur(8px)",
  borderBottom: "1px solid #e3f0e7",
  padding: "14px 18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(22, 101, 52, 0.05)",
  fontFamily: "Arial, sans-serif",
};

const treeTopLeftStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const treeTopTitleRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const miniAvatarStyle = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  background: "linear-gradient(180deg, #34d399 0%, #16a34a 100%)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "15px",
  flexShrink: 0,
};

const treeTopTitleStyle = {
  fontSize: "20px",
  fontWeight: "900",
  color: "#12321f",
};

const treeTopSubStyle = {
  fontSize: "13px",
  color: "#64806f",
};

const treeTopButtonsStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};
