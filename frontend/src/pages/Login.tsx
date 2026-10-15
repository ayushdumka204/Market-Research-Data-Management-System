import { useState } from "react";
import {
  Command,
  LockKeyhole,
  Mail,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
export default function Login({
  onLogin,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-screen">
      <div className="login-art">
        <div className="login-brand">
          <div className="brand-mark">
            <Command size={23} />
          </div>
          <span>
            NexGen<span className="brand-period">.</span>
          </span>
        </div>
        <div className="art-copy">
          <div className="eyebrow light">INSIGHT, ORGANIZED.</div>
          <h1>
            Better research
            <br />
            starts with a<br />
            <em>clear picture.</em>
          </h1>
          <p>
            One considered workspace for your projects, field data and the
            insights that move work forward.
          </p>
          <div className="art-stats">
            <div>
              <strong>01</strong>
              <span>Connected workspace</span>
            </div>
            <div>
              <strong>02</strong>
              <span>Structured data</span>
            </div>
            <div>
              <strong>03</strong>
              <span>Actionable reporting</span>
            </div>
          </div>
        </div>
        <div className="art-footer">
          <span>INTERNAL RESEARCH PLATFORM</span>
          <span>INDIA · INTERNATIONAL</span>
        </div>
      </div>
      <div className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <div className="login-mobile-brand">
            <div className="brand-mark">
              <Command size={20} />
            </div>
            <strong>
              NexGen<span className="brand-period">.</span>
            </strong>
          </div>
          <div className="eyebrow">WELCOME BACK</div>
          <h2>Sign in to your workspace</h2>
          <p className="login-subtitle">
            Use your team credentials to continue.
          </p>
          {error && <div className="error-box">{error}</div>}
          <label className="field-label">Work email</label>
          <div className="input-icon">
            <Mail size={17} />
            <input
              type="email"
              required
              autoComplete="username"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <label className="field-label">Password</label>
          <div className="input-icon">
            <LockKeyhole size={17} />
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn btn-primary login-submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
            <ArrowRight size={17} />
          </button>
          <div className="login-assurance">
            <ShieldCheck size={16} />
            <span>Secure access · Role-based permissions</span>
          </div>
          <p className="login-help">
            Your administrator can create or reset your account.
          </p>
        </form>
        <div className="login-panel-footer">
          © {new Date().getFullYear()} NexGen Market Research Services
        </div>
      </div>
    </div>
  );
}
