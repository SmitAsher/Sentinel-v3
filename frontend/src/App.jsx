import { useState } from "react";
import PublicDashboard from "./pages/PublicDashboard";
import IndustryDashboard from "./pages/IndustryDashboard";
import PipelineVisualizer from "./pages/PipelineVisualizer";
import Login from "./pages/Auth/Login";
import { GlobalStreamProvider } from "./store/GlobalStreamContext";
import "./App.css";

export default function App() {
  const [page, setPage]   = useState("public");
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  const handleAuth = (jwt) => {
    setToken(jwt);
    setPage("industry");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setPage("public");
  };

  return (
    <GlobalStreamProvider>
      <div className="app">
        {/* ─── Navbar ─── */}
        <nav className="navbar">
          <div className="nav-brand" onClick={() => setPage("public")}>
            <span className="brand-icon">🛡️</span> Sentinel-v3
          </div>
          <div className="nav-links">
            <button className={page === "public" ? "active" : ""} onClick={() => setPage("public")}>
              Global Dashboard
            </button>
            <button className={page === "pipeline" ? "active" : ""} onClick={() => setPage("pipeline")} style={{ color: "#4ade80", borderColor: page === "pipeline" ? "#4ade80" : "transparent" }}>
              ⚡ Pipeline
            </button>
            {token ? (
              <>
                <button className={page === "industry" ? "active" : ""} onClick={() => setPage("industry")}>
                  Industry Feed
                </button>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <button className={page === "login" ? "active" : ""} onClick={() => setPage("login")}>
                Industry Login
              </button>
            )}
          </div>
        </nav>

        {/* ─── Page Content ─── */}
        <main className={page === "pipeline" ? "" : "main-content"}>
          {page === "public"   && <PublicDashboard />}
          {page === "login"    && <Login onAuth={handleAuth} />}
          {page === "industry" && token && <IndustryDashboard token={token} />}
          {page === "pipeline" && <PipelineVisualizer />}
        </main>
      </div>
    </GlobalStreamProvider>
  );
}
