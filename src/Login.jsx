import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase";
import logo from "./assets/logo-tree.png";

function getFriendlyError(error) {
  const code = error?.code || "";
  if (code === "auth/email-already-in-use") return "Ese correo ya está registrado.";
  if (code === "auth/invalid-email") return "Correo inválido.";
  if (code === "auth/weak-password") return "La contraseña debe tener al menos 6 caracteres.";
  if (
    code === "auth/invalid-credential" ||
    code === "auth/user-not-found" ||
    code === "auth/wrong-password"
  ) {
    return "Correo o contraseña incorrectos.";
  }
  return error?.message || "Ocurrió un error.";
}

export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      if (!cleanEmail || !password.trim()) {
        throw new Error("Completa correo y contraseña.");
      }

      if (mode === "register") {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }

      setEmail("");
      setPassword("");
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div style={pageWrap}>
        <section style={heroBox}>
          <div style={brandRow}>
            <div style={logoBox}>
              <img src={logo} alt="Logo Árbol Genealógico" style={logoStyle} />
            </div>
            <div>
              <div style={brandPill}>Fase Pro</div>
              <h1 style={heroTitle}>Árbol Genealógico</h1>
              <p style={heroText}>
                Guarda, organiza y visualiza tu familia en una interfaz más limpia,
                rápida y optimizada para web y móvil.
              </p>
            </div>
          </div>

          <div style={featureGrid}>
            <div style={featureCard}>Diseño responsive</div>
            <div style={featureCard}>Guardado en nube</div>
            <div style={featureCard}>Vista limpia del árbol</div>
            <div style={featureCard}>Listo para escalar</div>
          </div>
        </section>

        <section style={formCard}>
          <div style={smallBrand}>Acceso seguro</div>
          <h2 style={formTitle}>
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>
          <p style={formSubtitle}>
            Usa tu cuenta para guardar tus árboles y abrirlos desde cualquier dispositivo.
          </p>

          <form onSubmit={handleSubmit} style={formStyle}>
            <label style={labelStyle}>Correo</label>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />

            <label style={labelStyle}>Contraseña</label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />

            {error ? <div style={errorStyle}>{error}</div> : null}

            <button type="submit" style={primaryButton} disabled={loading}>
              {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>

          <div style={switchWrap}>
            <span style={switchText}>
              {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
            </span>
            <button
              type="button"
              style={switchButton}
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Crear cuenta" : "Iniciar sesión"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

const pageWrap = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "minmax(320px, 1.1fr) minmax(320px, 430px)",
  gap: "20px",
  alignItems: "center",
  maxWidth: "1180px",
  margin: "0 auto",
  padding: "20px",
};

const heroBox = {
  background: "rgba(255,255,255,0.62)",
  backdropFilter: "blur(12px)",
  border: "1px solid #d8e8dc",
  boxShadow: "0 14px 40px rgba(24,63,40,0.08)",
  borderRadius: "30px",
  padding: "28px",
};

const brandRow = {
  display: "grid",
  gridTemplateColumns: "112px 1fr",
  gap: "18px",
  alignItems: "center",
};

const logoBox = {
  width: "112px",
  height: "112px",
  borderRadius: "30px",
  background: "#ffffff",
  border: "1px solid #d8e8dc",
  boxShadow: "0 12px 34px rgba(24,63,40,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const logoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  padding: "8px",
};

const brandPill = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "#eaf7ee",
  color: "#187645",
  fontWeight: 800,
  fontSize: "12px",
  marginBottom: "8px",
};

const heroTitle = {
  margin: "0 0 10px",
  fontSize: "clamp(32px, 4vw, 52px)",
  lineHeight: 1.02,
};

const heroText = {
  margin: 0,
  color: "#5f7a69",
  fontSize: "16px",
  lineHeight: 1.7,
};

const featureGrid = {
  marginTop: "20px",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const featureCard = {
  background: "rgba(255,255,255,0.9)",
  border: "1px solid #dceade",
  borderRadius: "18px",
  padding: "16px",
  fontWeight: 800,
  color: "#1d4d33",
  textAlign: "center",
};

const formCard = {
  background: "#ffffff",
  border: "1px solid #d8e8dc",
  boxShadow: "0 14px 40px rgba(24,63,40,0.08)",
  borderRadius: "30px",
  padding: "26px",
};

const smallBrand = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "#f1f8f3",
  color: "#1d6f41",
  fontWeight: 800,
  fontSize: "12px",
};

const formTitle = {
  margin: "14px 0 8px",
  fontSize: "32px",
};

const formSubtitle = {
  margin: "0 0 18px",
  color: "#5f7a69",
  lineHeight: 1.6,
};

const formStyle = {
  display: "grid",
  gap: "10px",
};

const labelStyle = {
  fontWeight: 800,
  fontSize: "14px",
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "16px",
  border: "1px solid #d3e4d8",
  outline: "none",
  background: "#fff",
};

const errorStyle = {
  background: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  padding: "12px 14px",
  borderRadius: "14px",
  fontWeight: 700,
  fontSize: "14px",
};

const primaryButton = {
  marginTop: "6px",
  padding: "14px 18px",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(135deg, #1f9d55, #157841)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const switchWrap = {
  marginTop: "16px",
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
};

const switchText = {
  color: "#637c6c",
  fontSize: "14px",
};

const switchButton = {
  border: "none",
  background: "transparent",
  color: "#177545",
  padding: 0,
  fontWeight: 900,
  cursor: "pointer",
};
