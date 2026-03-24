import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./Login";
import Home from "./Home";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div style={loadingWrap}>
        <div style={loadingCard}>Cargando aplicación...</div>
      </div>
    );
  }

  if (!user) return <Login />;

  return <Home user={user} />;
}

const loadingWrap = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const loadingCard = {
  background: "rgba(255,255,255,0.9)",
  border: "1px solid #d8e8dc",
  boxShadow: "0 14px 40px rgba(24,63,40,0.08)",
  borderRadius: "24px",
  padding: "22px 28px",
  fontWeight: 800,
};
