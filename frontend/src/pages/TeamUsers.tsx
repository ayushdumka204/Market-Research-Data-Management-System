import { useEffect, useState } from "react";
import { Plus, Search, UserPlus } from "lucide-react";
import { api, body } from "../services/api";
import type { User } from "../types";
import PageTitle from "../components/layout/PageTitle";
import StatusBadge from "../components/ui/StatusBadge";
import Modal from "../components/ui/Modal";
import Field from "../components/forms/Field";
import DataTable from "../components/tables/DataTable";
import { initials } from "../utils/format";
export default function TeamUsers() {
  const [users, setUsers] = useState<User[]>([]),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState({
      name: "",
      email: "",
      password: "",
      role: "team",
    });
  async function load() {
    try {
      setUsers(await api<User[]>("/users"));
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/users", { method: "POST", body: body(form) });
      setShow(false);
      setForm({ name: "", email: "", password: "", role: "team" });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(u: User) {
    try {
      await api(`/users/${u.id}`, {
        method: "PATCH",
        body: body({ active: !u.active }),
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }
  const filtered = users.filter((u) =>
    (u.name + " " + u.email + " " + u.role)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title="Team & Users"
        description="Create accounts, assign roles and manage authorised workspace access."
        actions={
          <button className="button primary" onClick={() => setShow(true)}>
            <UserPlus size={16} /> Create account
          </button>
        }
      />
      {error && <div className="error-banner">{error}</div>}
      <section className="surface">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Search people or roles…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="result-count">{filtered.length} accounts</span>
        </div>
        <DataTable
          headers={[
            "Team member",
            "Role",
            "Account status",
            "Joined",
            "Action",
          ]}
          empty={!filtered.length}
          emptyTitle="No matching users"
          emptyDescription="Create an account to add a team member."
        >
          {filtered.map((u) => (
            <tr key={u.id}>
              <td>
                <div className="person-cell">
                  <div className="avatar">{initials(u.name)}</div>
                  <div>
                    <b>{u.name}</b>
                    <small className="cell-sub">{u.email}</small>
                  </div>
                </div>
              </td>
              <td>
                <span className="role-pill">{u.role}</span>
              </td>
              <td>
                <StatusBadge
                  status={u.active === false ? "inactive" : "active"}
                />
              </td>
              <td>—</td>
              <td>
                <button
                  className="button secondary small"
                  onClick={() => toggle(u)}
                >
                  {u.active === false ? "Reactivate" : "Deactivate"}
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </section>
      {show && (
        <Modal
          title="Create team account"
          eyebrow="USER MANAGEMENT"
          onClose={() => setShow(false)}
          onSubmit={create}
          submitLabel="Create account"
          busy={busy}
        >
          <div className="form-grid">
            <Field label="Full name *">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Email address *">
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Temporary password *">
              <input
                required
                minLength={8}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <Field label="Role *">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="team">Team member</option>
                <option value="leader">Project leader</option>
                <option value="admin">Administrator</option>
              </select>
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}
