import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { api, body, saveSession } from "../services/api";
export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r: any = await api("/auth/login", {
        method: "POST",
        body: body({ email, password }),
      });
      saveSession(r.token, r.user);
      onLogin(r.user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-shell">
      <section className="login-panel">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <b>NexGen</b>
            <small>RESEARCH OPERATIONS</small>
          </div>
        </div>
        <div className="login-copy">
          <span className="pill">
            <ShieldCheck size={14} /> Secure team workspace
          </span>
          <h1>
            Research work,
            <br />
            <em>beautifully organised.</em>
          </h1>
          <p>
            One workspace for projects, survey data, collected records and
            research deliverables.
          </p>
        </div>
        <small className="login-foot">
          NEXGEN MARKET RESEARCH · INTERNAL PLATFORM
        </small>
      </section>
      <section className="login-form-wrap">
        <form className="login-card" onSubmit={submit}>
          <p className="eyebrow">WELCOME BACK</p>
          <h2>Sign in to your workspace</h2>
          <p className="subtitle">
            Use your authorised NexGen account to continue.
          </p>
          <label>
            Email address
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="button primary full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
            <ArrowRight size={17} />
          </button>
          <p className="login-note">
            Access is limited to authorised team accounts.
          </p>
        </form>
      </section>
    </div>
  );
}
