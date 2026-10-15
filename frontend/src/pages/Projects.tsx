import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  SlidersHorizontal,
  FolderKanban,
  CalendarDays,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { api } from "../services/api";
import type { Project, User } from "../types";
type Draft = {
  name: string;
  client: string;
  industry: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
};
const blank: Draft = {
  name: "",
  client: "",
  industry: "",
  description: "",
  start_date: "",
  end_date: "",
  status: "planning",
};
export default function Projects({ user }: { user: User }) {
  const [items, setItems] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [params, setParams] = useSearchParams();
  const admin = user.role === "admin";
  async function load() {
    try {
      setItems(await api<Project[]>("/projects"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (params.get("new") === "1") {
      openNew();
      setParams({});
    }
  }, [params]);
  function openNew() {
    setEditing(null);
    setDraft(blank);
    setError("");
    setModal(true);
  }
  function openEdit(p: Project) {
    setEditing(p);
    setDraft({
      name: p.name,
      client: p.client || "",
      industry: p.industry || "",
      description: p.description || "",
      start_date: p.start_date || "",
      end_date: p.end_date || "",
      status: p.status,
    });
    setError("");
    setModal(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        ...draft,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
      };
      if (editing)
        await api(`/projects/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      else
        await api("/projects", { method: "POST", body: JSON.stringify(body) });
      setModal(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(p: Project) {
    if (!confirm(`Delete “${p.name}”? This cannot be undone.`)) return;
    try {
      await api(`/projects/${p.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const shown = items.filter(
    (p) =>
      (p.name + " " + p.client + " " + p.industry)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "all" || p.status === status),
  );
  return (
    <>
      <PageHeader
        eyebrow="PROJECT DIRECTORY"
        title="Research projects"
        description="Keep every brief, timeline and research outcome connected to a single project."
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={17} /> New project
          </button>
        }
      />
      {error && !modal && <div className="error-box">{error}</div>}
      <div className="toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            placeholder="Search projects, clients or industries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="filter-control">
          <SlidersHorizontal size={16} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <span className="result-count">{shown.length} projects</span>
      </div>
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Client / industry</th>
                <th>Timeline</th>
                <th>Responses</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="table-project">
                      <div className="table-project-icon">
                        <FolderKanban size={17} />
                      </div>
                      <div>
                        <strong>{p.name}</strong>
                        <span>PRJ-{String(p.id).padStart(4, "0")}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong className="cell-primary">{p.client || "—"}</strong>
                    <span className="cell-secondary">
                      {p.industry || "Not specified"}
                    </span>
                  </td>
                  <td>
                    <div className="timeline-cell">
                      <CalendarDays size={15} />
                      <span>
                        {p.start_date || "Not scheduled"}
                        {p.end_date ? ` – ${p.end_date}` : ""}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="response-count">
                      {p.response_count ?? 0}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="icon-btn"
                        title="Edit project"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil size={15} />
                      </button>
                      {admin && (
                        <button
                          className="icon-btn danger-hover"
                          title="Delete project"
                          onClick={() => remove(p)}
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
          {shown.length === 0 && (
            <div className="empty-table">
              <div className="empty-icon">
                <FolderKanban size={22} />
              </div>
              <strong>No projects match this view</strong>
              <p>Try another search or create a new project.</p>
              <button className="btn btn-secondary" onClick={openNew}>
                <Plus size={16} /> New project
              </button>
            </div>
          )}
        </div>
        <div className="table-foot">
          <span>
            Showing {shown.length} of {items.length} projects
          </span>
          <span>
            {admin ? "Admin access" : "Team access"} · Project workspace
          </span>
        </div>
      </section>
      {modal && (
        <Modal
          title={editing ? "Edit project" : "Create a research project"}
          onClose={() => setModal(false)}
        >
          <form onSubmit={save} className="form-stack">
            <div className="form-grid">
              <div className="form-field full">
                <label>Project name *</label>
                <input
                  required
                  maxLength={180}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Urban mobility perception study"
                />
              </div>
              <div className="form-field">
                <label>Client / organization</label>
                <input
                  value={draft.client}
                  onChange={(e) =>
                    setDraft({ ...draft, client: e.target.value })
                  }
                  placeholder="Client name"
                />
              </div>
              <div className="form-field">
                <label>Industry</label>
                <input
                  value={draft.industry}
                  onChange={(e) =>
                    setDraft({ ...draft, industry: e.target.value })
                  }
                  placeholder="e.g. Consumer insights"
                />
              </div>
              <div className="form-field">
                <label>Start date</label>
                <input
                  type="date"
                  value={draft.start_date}
                  onChange={(e) =>
                    setDraft({ ...draft, start_date: e.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label>Target end date</label>
                <input
                  type="date"
                  value={draft.end_date}
                  onChange={(e) =>
                    setDraft({ ...draft, end_date: e.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label>Status</label>
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value })
                  }
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="form-field full">
                <label>Research brief / notes</label>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  placeholder="Objective, audience, geography or key questions…"
                />
              </div>
            </div>
            {error && <div className="error-box">{error}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setModal(false)}
              >
                <X size={16} /> Cancel
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Saving…" : editing ? "Save changes" : "Create project"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
