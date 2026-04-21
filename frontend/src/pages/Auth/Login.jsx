import { useState } from "react";
import { login, register } from "../../services/api";

export default function Login({ onAuth }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername]     = useState("");
  const [password, setPassword]     = useState("");
  const [company, setCompany]       = useState("");
  const [industry, setIndustry]     = useState("");
  const [error, setError]           = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = isRegister
        ? await register(username, password, company, industry)
        : await login(username, password);
      localStorage.setItem("token", res.access_token);
      onAuth(res.access_token);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glass-panel">
        <div className="auth-header">
          <div className="auth-icon">🔐</div>
          <h2>{isRegister ? "SYSTEM REGISTRATION" : "INDUSTRY CLEARANCE"}</h2>
          <p>{isRegister ? "Request Sentinel Access" : "Authorized Personnel Only"}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">⚠️ {error}</div>}

          <div className="input-group">
            <input placeholder="Operator ID (Username)" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <div className="input-glow"></div>
          </div>
          
          <div className="input-group">
            <input placeholder="Passkey" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <div className="input-glow"></div>
          </div>

          {isRegister && (
            <div className="register-fields-slide">
              <div className="input-group">
                <input placeholder="Organization / Company" value={company} onChange={(e) => setCompany(e.target.value)} required />
                <div className="input-glow"></div>
              </div>
              <div className="input-group">
                <input placeholder="Sector (e.g. Finance, Health)" value={industry} onChange={(e) => setIndustry(e.target.value)} required />
                <div className="input-glow"></div>
              </div>
            </div>
          )}

          <button type="submit" className="auth-submit-btn">
            {isRegister ? "INITIATE REGISTRATION" : "AUTHENTICATE"}
          </button>
          
          <div className="auth-toggle" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "« Return to Login" : "Request Clearance »"}
          </div>
        </form>
      </div>
    </div>
  );
}
