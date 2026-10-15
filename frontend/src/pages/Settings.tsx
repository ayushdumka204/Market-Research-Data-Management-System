import { useEffect, useState } from "react";
import {
  Moon,
  Sun,
  ShieldCheck,
  UserRound,
  Palette,
  KeyRound,
  UserPlus,
  Trash2,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import { api } from "../services/api";
import type { User } from "../types";
type TeamUser = User & { created_at?: string };
export default function Settings({
  user,
  dark,
  setDark,
}: {
  user: User;
  dark: boolean;
  setDark: (v: boolean) => void;
}) {
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    password: "",
    role: "team",
  });
  async function loadUsers() {
    try {
      setTeam(await api<TeamUser[]>("/users"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (user.role === "admin") loadUsers();
  }, [user.role]);
  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/users", { method: "POST", body: JSON.stringify(draft) });
      setNotice("Team account created successfully.");
      setDraft({ name: "", email: "", password: "", role: "team" });
      setModal(false);
      await loadUsers();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteUser(u: TeamUser) {
    if (!confirm(`Remove account for ${u.name}?`)) return;
    try {
      await api(`/users/${u.id}`, { method: "DELETE" });
      setNotice("Account removed.");
      await loadUsers();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="PREFERENCES & ACCESS"
        title="Settings"
        description="Your workspace identity, display preferences and access level."
      />
      {notice && (
        <div className="success-box">
          <ShieldCheck size={17} />
          {notice}
        </div>
      )}
      {error && <div className="error-box">{error}</div>}
      <div className="settings-grid">
        <section className="panel settings-card">
          <div className="settings-section-title">
            <span className="settings-icon">
              <UserRound size={18} />
            </span>
            <div>
              <h2>Profile</h2>
              <p>Your account information</p>
            </div>
          </div>
          <div className="profile-large">
            <div className="profile-large-avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <div className="settings-fields">
            <div>
              <span>Full name</span>
              <strong>{user.name}</strong>
            </div>
            <div>
              <span>Email address</span>
              <strong>{user.email}</strong>
            </div>
            <div>
              <span>Role</span>
              <strong className="role-label">
                <ShieldCheck size={15} />
                {user.role === "admin"
                  ? "Administrator"
                  : "Research team member"}
              </strong>
            </div>
          </div>
          <div className="info-banner">
            <KeyRound size={17} />
            <span>
              For password changes or profile updates, contact your system
              administrator.
            </span>
          </div>
        </section>
        <section className="panel settings-card">
          <div className="settings-section-title">
            <span className="settings-icon">
              <Palette size={18} />
            </span>
            <div>
              <h2>Appearance</h2>
              <p>Make the workspace comfortable to use</p>
            </div>
          </div>
          <div className="theme-option">
            <div className="theme-preview light-preview">
              <div />
              <div />
              <div />
            </div>
            <div className="theme-description">
              <strong>Light mode</strong>
              <span>Bright, crisp and easy to scan</span>
            </div>
            <button
              className={`choice-radio ${!dark ? "selected" : ""}`}
              onClick={() => setDark(false)}
              aria-label="Use light theme"
            />
          </div>
          <div className="theme-option">
            <div className="theme-preview dark-preview">
              <div />
              <div />
              <div />
            </div>
            <div className="theme-description">
              <strong>Dark mode</strong>
              <span>Lower brightness for dim spaces</span>
            </div>
            <button
              className={`choice-radio ${dark ? "selected" : ""}`}
              onClick={() => setDark(true)}
              aria-label="Use dark theme"
            />
          </div>
          <div className="settings-divider" />
          <div className="settings-section-title small-title">
            <span className="settings-icon">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h2>Security & permissions</h2>
              <p>Access is controlled by your assigned role</p>
            </div>
          </div>
          <div className="permission-list">
            <div>
              <ShieldCheck size={16} />
              <span>Authenticated API access</span>
              <span className="permission-state">Enabled</span>
            </div>
            <div>
              <ShieldCheck size={16} />
              <span>
                {user.role === "admin"
                  ? "User management and destructive actions"
                  : "Project and response editing"}
              </span>
              <span className="permission-state">
                {user.role === "admin" ? "Admin" : "Team"}
              </span>
            </div>
          </div>
        </section>
      </div>
      {user.role === "admin" && (
        <section className="panel user-management">
          <div className="panel-header">
            <div>
              <h2>Team access</h2>
              <p>
                Create team accounts and assign the appropriate workspace role.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                setError("");
                setModal(true);
              }}
            >
              <UserPlus size={16} /> Add team member
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Team member</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="table-project">
                        <div className="respondent-avatar">
                          {u.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <strong>{u.name}</strong>
                          <span>USR-{String(u.id).padStart(4, "0")}</span>
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-pill ${u.role}`}>
                        {u.role === "admin" ? "Administrator" : "Team member"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        {u.id !== user.id && (
                          <button
                            className="icon-btn danger-hover"
                            title="Remove user"
                            onClick={() => deleteUser(u)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!team.length && (
              <div className="empty-table">
                <strong>No team accounts loaded</strong>
                <p>Create an account to give a colleague access.</p>
              </div>
            )}
          </div>
        </section>
      )}
      {modal && (
        <Modal title="Add a team member" onClose={() => setModal(false)}>
          <form className="form-stack" onSubmit={createUser}>
            <div className="form-grid">
              <div className="form-field full">
                <label>Full name *</label>
                <input
                  required
                  maxLength={120}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Team member name"
                />
              </div>
              <div className="form-field full">
                <label>Work email *</label>
                <input
                  required
                  type="email"
                  value={draft.email}
                  onChange={(e) =>
                    setDraft({ ...draft, email: e.target.value })
                  }
                  placeholder="colleague@company.com"
                />
              </div>
              <div className="form-field full">
                <label>Temporary password * (minimum 12 characters)</label>
                <input
                  required
                  minLength={12}
                  type="password"
                  autoComplete="new-password"
                  value={draft.password}
                  onChange={(e) =>
                    setDraft({ ...draft, password: e.target.value })
                  }
                  placeholder="Set a unique temporary password"
                />
              </div>
              <div className="form-field full">
                <label>Role</label>
                <select
                  value={draft.role}
                  onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                >
                  <option value="team">
                    Team member — daily research work
                  </option>
                  <option value="admin">Administrator — full access</option>
                </select>
              </div>
            </div>
            {error && <div className="error-box">{error}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      <p className="privacy-footnote">
        Appearance preferences are saved in this browser. User accounts and
        permissions are stored securely on the server.
      </p>
    </>
  );
}
