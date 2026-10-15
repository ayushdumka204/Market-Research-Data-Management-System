import { useEffect, useState } from "react";
import { Plus, Search, CalendarDays, Users } from "lucide-react";
import { api, body } from "../services/api";
import type { Project, User } from "../types";
import PageTitle from "../components/layout/PageTitle";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import Field from "../components/forms/Field";
import DataTable from "../components/tables/DataTable";
import { dateLabel } from "../utils/format";
export default function Projects({ user }: { user: any }) {
  const [items, setItems] = useState<Project[]>([]),
    [leaders, setLeaders] = useState<User[]>([]),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [error, setError] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState<any>({
      name: "",
      client: "",
      description: "",
      sample_target: "",
      start_date: "",
      due_date: "",
      leader_id: "",
      eligible_team: [],
    });
  async function load() {
    try {
      const p = await api<Project[]>("/projects");
      setItems(p);
      if (user.role === "admin") {
        const [ls, ms] = await Promise.all([
          api<User[]>("/users?role=leader"),
          api<User[]>("/users?role=team"),
        ]);
        setLeaders([...ls, ...ms]);
      }
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
      await api("/projects", {
        method: "POST",
        body: body({
          ...form,
          sample_target: Number(form.sample_target || 0),
          leader_id: form.leader_id || null,
          eligible_team: form.eligible_team,
        }),
      });
      setShow(false);
      setForm({
        name: "",
        client: "",
        description: "",
        sample_target: "",
        start_date: "",
        due_date: "",
        leader_id: "",
        eligible_team: [],
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = items.filter(
    (p) =>
      (p.name + " " + (p.client || ""))
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "all" || p.status === status),
  );
  return (
    <>
      <PageTitle
        title="Projects"
        description="Manage research engagements, ownership, sample targets and timelines."
        actions={
          user.role !== "team" && (
            <button className="button primary" onClick={() => setShow(true)}>
              <Plus size={16} /> New project
            </button>
          )
        }
      />
      {error && <div className="error-banner">{error}</div>}
      <section className="surface">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Search projects or clients…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="planning">Planning</option>
            <option value="ongoing">Ongoing</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
          </select>
          <span className="result-count">{filtered.length} projects</span>
        </div>
        <DataTable
          headers={[
            "Project / Client",
            "Project leader",
            "Sample target",
            "Due date",
            "Progress",
            "Status",
          ]}
          empty={!filtered.length}
          emptyTitle="No matching projects"
          emptyDescription="Try another search or create a project."
        >
          {filtered.map((p) => {
            const progress = p.sample_target
              ? Math.min(
                  100,
                  Math.round((p.sample_completed / p.sample_target) * 100),
                )
              : 0;
            return (
              <tr key={p.id}>
                <td>
                  <b>{p.name}</b>
                  <small className="cell-sub">
                    {p.client || "Internal research"}
                  </small>
                </td>
                <td>{p.leader_name || "Unassigned"}</td>
                <td>{p.sample_target.toLocaleString("en-IN")}</td>
                <td>
                  <span className="date-cell">
                    <CalendarDays size={14} />
                    {dateLabel(p.due_date)}
                  </span>
                </td>
                <td>
                  <div className="progress-track">
                    <i style={{ width: progress + "%" }} />
                  </div>
                  <small>{progress}%</small>
                </td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            );
          })}
        </DataTable>
      </section>
      {show && (
        <Modal
          title="Create project"
          eyebrow="PROJECT SETUP"
          onClose={() => setShow(false)}
          onSubmit={create}
          submitLabel="Create project"
          busy={busy}
        >
          <div className="form-grid">
            <Field label="Project name *">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Client / organisation">
              <input
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
              />
            </Field>
            <Field label="Start date">
              <input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />
            </Field>
            <Field label="Due date">
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </Field>
            <Field label="Sample target">
              <input
                type="number"
                min="0"
                value={form.sample_target}
                onChange={(e) =>
                  setForm({ ...form, sample_target: e.target.value })
                }
              />
            </Field>
            {user.role === "admin" && (
              <Field label="Assign project leader">
                <select
                  value={form.leader_id}
                  onChange={(e) =>
                    setForm({ ...form, leader_id: e.target.value })
                  }
                >
                  <option value="">Unassigned</option>
                  {leaders
                    .filter((l) => l.role === "leader")
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} — {l.email}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            <Field label="Eligible team members (optional)">
              <select
                multiple
                size={4}
                value={form.eligible_team}
                onChange={(e) =>
                  setForm({
                    ...form,
                    eligible_team: Array.from(e.target.selectedOptions).map(
                      (o) => o.value,
                    ),
                  })
                }
              >
                {leaders
                  .filter((m) => m.role === "team")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.email}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Description">
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}
