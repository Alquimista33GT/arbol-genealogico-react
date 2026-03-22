import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Login from "./Login";
import Home from "./Home";
import PublicTreePage from "./PublicTreePage";

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const path = window.location.pathname;
  const isPublicRoute = path.startsWith("/public/");
  const publicSlug = isPublicRoute ? decodeURIComponent(path.replace("/public/", "")) : "";

  useEffect(() => {
    if (isPublicRoute) {
      setAuthLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setAuthLoading(false);
    });

    return () => unsub();
  }, [isPublicRoute]);

  if (authLoading) {
    return (
      <div style={loadingPageStyle}>
        <div style={loadingCardStyle}>Cargando aplicación...</div>
      </div>
    );
  }

  if (isPublicRoute) {
    return <PublicTreePage slug={publicSlug} />;
  }

  if (!user) {
    return (
      <div style={loginPageStyle}>
        <Login user={user} />
      </div>
    );
  }

  return <Home user={user} />;
}

const loadingPageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(180deg, #eefcf3 0%, #f7fff9 100%)",
};

const loadingCardStyle = {
  background: "#fff",
  padding: "24px 32px",
  borderRadius: "18px",
  boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
  fontSize: "18px",
  fontWeight: "700",
  color: "#1f2937",
};

const loginPageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(180deg, #eefcf3 0%, #f7fff9 100%)",
  padding: "20px",
};
