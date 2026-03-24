import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./Login";
import Home from "./Home";
import FamilyTreeApp from "./FamilyTreeApp";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { MOBILE_MEDIA_QUERY } from "./constants/breakpoints";
import { parseReadOnlyTreeFromLocation } from "./services/treeShare";
import MobileLayout from "./layouts/MobileLayout";
import DesktopLayout from "./layouts/DesktopLayout";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY, false);
  const Layout = isMobile ? MobileLayout : DesktopLayout;

  const sharedTree = useMemo(() => parseReadOnlyTreeFromLocation(), []);

  useEffect(() => {
    if (sharedTree?.readOnly) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoading(false);
    });

    return () => unsub();
  }, [sharedTree]);

  function handleExitReadOnly() {
    if (typeof window === "undefined") return;
    window.location.href = `${window.location.origin}${window.location.pathname}`;
  }

  if (loading) {
    return (
      <Layout>
        <div style={loadingWrap}>
          <div style={loadingCard}>Cargando aplicación...</div>
        </div>
      </Layout>
    );
  }

  if (sharedTree?.readOnly) {
    return (
      <Layout>
        <FamilyTreeApp
          user={null}
          onBack={handleExitReadOnly}
          onLogout={handleExitReadOnly}
          readOnly
          initialSharedTree={sharedTree}
        />
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <Login isMobile={isMobile} />
      </Layout>
    );
  }

  return (
    <Layout>
      <Home user={user} isMobile={isMobile} />
    </Layout>
  );
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