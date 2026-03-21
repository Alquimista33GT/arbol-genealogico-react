import { useState } from "react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

export default function Login({ user }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error("Completa correo y contraseña");
      }

      if (mode === "register") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      setEmail("");
      setPassword("");
    } catch (err) {
      console.error(err);

      if (err.code === "auth/email-already-in-use") {
        setError("Ese correo ya está registrado.");
      } else if (err.code === "auth/invalid-email") {
        setError("Correo inválido.");
      } else if (err.code === "auth/weak-password") {
        setError("La contraseña debe tener al menos 6 caracteres.");
      } else if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError(err.message || "Ocurrió un error.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
      setError("No se pudo cerrar sesión.");
    }
  }

  if (user) {
    return (
      <div style={loggedWrapStyle}>
        <div style={loggedCardStyle}>
          <div style={loggedTitleStyle}>Sesión iniciada</div>
          <div style={loggedEmailStyle}>{user.email}</div>
          <button style={logoutButtonStyle} onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={brandStyle}>Árbol Genealógico</div>
        <h1 style={titleStyle}>
          {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </h1>
        <p style={subtitleStyle}>
          Guarda tus árboles en la nube y accede desde cualquier navegador.
        </p>

        <form onSubmit={handleSubmit} style={formStyle}>
          <label style={labelStyle}>Correo electrónico</label>
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

          <button type="submit" style={primaryButtonStyle} disabled={loading}>
            {loading
              ? "Procesando..."
              : mode === "login"
              ? "Entrar"
              : "Crear cuenta"}
          </button>
        </form>

        <div style={footerRowStyle}>
          {mode === "login" ? (
            <>
              <span style={footerTextStyle}>¿No tienes cuenta?</span>
              <button
                type="button"
                style={linkButtonStyle}
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                Crear cuenta
              </button>
            </>
          ) : (
            <>
              <span style={footerTextStyle}>¿Ya tienes cuenta?</span>
              <button
                type="button"
                style={linkButtonStyle}
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Iniciar sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const cardStyle = {
  width: "100%",
  maxWidth: "430px",
  background: "#ffffff",
  borderRadius: "24px",
  padding: "28px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
  border: "1px solid #e5e7eb",
  fontFamily: "Arial, sans-serif",
};

const brandStyle = {
  display: "inline-block",
  padding: "8px 14px",
  borderRadius: "999px",
  background: "#f0fdf4",
  color: "#166534",
  fontWeight: "700",
  fontSize: "13px",
  marginBottom: "16px",
};

const titleStyle = {
  margin: 0,
  fontSize: "34px",
  color: "#111827",
};

const subtitleStyle = {
  marginTop: "10px",
  marginBottom: "22px",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.45,
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const labelStyle = {
  fontSize: "14px",
  fontWeight: "700",
  color: "#1f2937",
};

const inputStyle = {
  padding: "14px 14px",
  borderRadius: "14px",
  border: "1.5px solid #cbd5e1",
  fontSize: "15px",
  outline: "none",
  background: "#fff",
  color: "#111827",
};

const errorStyle = {
  marginTop: "4px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#b91c1c",
  fontSize: "14px",
  fontWeight: "600",
};

const primaryButtonStyle = {
  marginTop: "8px",
  padding: "14px 16px",
  borderRadius: "14px",
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: "700",
  fontSize: "15px",
  cursor: "pointer",
};

const footerRowStyle = {
  marginTop: "18px",
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
};

const footerTextStyle = {
  color: "#64748b",
  fontSize: "14px",
};

const linkButtonStyle = {
  border: "none",
  background: "transparent",
  color: "#2563eb",
  fontWeight: "700",
  cursor: "pointer",
  padding: 0,
  fontSize: "14px",
};

const loggedWrapStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
};

const loggedCardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "18px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
  minWidth: "320px",
  textAlign: "center",
  fontFamily: "Arial, sans-serif",
};

const loggedTitleStyle = {
  fontSize: "18px",
  fontWeight: "800",
  color: "#111827",
};

const loggedEmailStyle = {
  marginTop: "8px",
  color: "#475569",
  fontSize: "14px",
  marginBottom: "14px",
};

const logoutButtonStyle = {
  padding: "12px 16px",
  borderRadius: "12px",
  border: "none",
  background: "#dc2626",
  color: "#fff",
  fontWeight: "700",
  cursor: "pointer",
};
