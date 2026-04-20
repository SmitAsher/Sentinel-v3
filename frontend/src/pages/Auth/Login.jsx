/**
 * Login Page — JWT Authentication for Industry Dashboard Access
 */
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
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>{isRegister ? "Register Your Company" : "Industry Login"}</h2>
        {error && <p className="auth-error">{error}</p>}

        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {isRegister && (
          <>
            <input placeholder="Company Name" value={company} onChange={(e) => setCompany(e.target.value)} />
            <input placeholder="Industry (e.g. Finance, Healthcare)" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </>
        )}

        <button type="submit">{isRegister ? "Register" : "Login"}</button>
        <p className="auth-toggle" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? "Already have an account? Login" : "Need an account? Register"}
        </p>
      </form>
    </div>
  );
}
