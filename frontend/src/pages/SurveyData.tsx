import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  ClipboardList,
  Pencil,
  Trash2,
  X,
  ExternalLink,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import { api } from "../services/api";
import type { Project, ResponseRecord, User } from "../types";
type Draft = {
  project_id: string;
  respondent_code: string;
  response_date: string;
  channel: string;
  answers: string;
  notes: string;
};
const blank: Draft = {
  project_id: "",
  respondent_code: "",
  response_date: new Date().toISOString().slice(0, 10),
  channel: "Field survey",
  answers: "{}",
  notes: "",
};
export default function SurveyData({ user }: { user: User }) {
  const [rows, setRows] = useState<ResponseRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("all");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ResponseRecord | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const admin = user.role === "admin";
  async function load() {
    try {
      const [r, p] = await Promise.all([
        api<ResponseRecord[]>("/responses"),
        api<Project[]>("/projects"),
      ]);
      setRows(r);
      setProjects(p);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  function openNew() {
    setEditing(null);
    setDraft({
      ...blank,
      project_id: projects[0] ? String(projects[0].id) : "",
    });
    setError("");
    setModal(true);
  }
  function edit(r: ResponseRecord) {
    setEditing(r);
    setDraft({
      project_id: String(r.project_id),
      respondent_code: r.respondent_code,
      response_date: r.response_date,
      channel: r.channel || "Field survey",
      answers:
        typeof r.answers === "string"
          ? r.answers
          : JSON.stringify(r.answers, null, 2),
      notes: r.notes || "",
    });
    setError("");
    setModal(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    let answers: unknown;
    try {
      answers = JSON.parse(draft.answers || "{}");
    } catch {
      setError('Answers must be valid JSON, for example {"Q1":"Yes"}.');
      setBusy(false);
      return;
    }
    try {
      const body = { ...draft, project_id: Number(draft.project_id), answers };
      if (editing)
        await api(`/responses/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      else
        await api("/responses", { method: "POST", body: JSON.stringify(body) });
      setModal(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(r: ResponseRecord) {
    if (!confirm(`Delete response ${r.respondent_code}?`)) return;
    try {
      await api(`/responses/${r.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const shown = rows.filter(
    (r) =>
      (r.respondent_code + " " + r.project_name + " " + r.channel)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (project === "all" || String(r.project_id) === project),
  );
  return (
    <>
      <PageHeader
        eyebrow="FIELDWORK & RESPONSES"
        title="Survey data"
        description="Capture incoming responses and keep each record linked to the right research project."
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={17} /> Add response
          </button>
        }
      />
      {error && !modal && <div className="error-box">{error}</div>}
      <div className="toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            placeholder="Search respondent code, project or channel…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="filter-control">
          <ClipboardList size={16} />
          <select value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <span className="result-count">{shown.length} responses</span>
      </div>
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Respondent</th>
                <th>Research project</th>
                <th>Response date</th>
                <th>Collection channel</th>
                <th>Answer fields</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="table-project">
                      <div className="respondent-avatar">
                        {r.respondent_code.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <strong>{r.respondent_code}</strong>
                        <span>RES-{String(r.id).padStart(5, "0")}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong className="cell-primary">
                      {r.project_name || `Project #${r.project_id}`}
                    </strong>
                  </td>
                  <td>{r.response_date}</td>
                  <td>
                    <span className="channel-chip">
                      {r.channel || "Unspecified"}
                    </span>
                  </td>
                  <td>
                    <span className="response-count">
                      {
                        Object.keys(
                          typeof r.answers === "string"
                            ? safeJson(r.answers)
                            : r.answers || {},
                        ).length
                      }
                    </span>{" "}
                    fields
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="icon-btn"
                        title="Edit response"
                        onClick={() => edit(r)}
                      >
                        <Pencil size={15} />
                      </button>
                      {admin && (
                        <button
                          className="icon-btn danger-hover"
                          title="Delete response"
                          onClick={() => remove(r)}
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
                <ClipboardList size={22} />
              </div>
              <strong>No survey responses yet</strong>
              <p>Add a response manually or import a CSV from Data Records.</p>
              <button className="btn btn-secondary" onClick={openNew}>
                <Plus size={16} /> Add response
              </button>
            </div>
          )}
        </div>
        <div className="table-foot">
          <span>
            Showing {shown.length} of {rows.length} responses
          </span>
          <span>Answers are stored as structured JSON</span>
        </div>
      </section>
      {modal && (
        <Modal
          title={editing ? "Edit survey response" : "Add survey response"}
          onClose={() => setModal(false)}
        >
          <form onSubmit={save} className="form-stack">
            <div className="form-grid">
              <div className="form-field full">
                <label>Research project *</label>
                <select
                  required
                  value={draft.project_id}
                  onChange={(e) =>
                    setDraft({ ...draft, project_id: e.target.value })
                  }
                >
                  <option value="">Choose a project</option>
                  {projects.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {!projects.length && (
                  <small>Create a project before adding responses.</small>
                )}
              </div>
              <div className="form-field">
                <label>Respondent code *</label>
                <input
                  required
                  value={draft.respondent_code}
                  onChange={(e) =>
                    setDraft({ ...draft, respondent_code: e.target.value })
                  }
                  placeholder="e.g. RESP-001"
                />
              </div>
              <div className="form-field">
                <label>Response date *</label>
                <input
                  type="date"
                  required
                  value={draft.response_date}
                  onChange={(e) =>
                    setDraft({ ...draft, response_date: e.target.value })
                  }
                />
              </div>
              <div className="form-field full">
                <label>Collection channel</label>
                <select
                  value={draft.channel}
                  onChange={(e) =>
                    setDraft({ ...draft, channel: e.target.value })
                  }
                >
                  <option>Field survey</option>
                  <option>Telephone</option>
                  <option>Online survey</option>
                  <option>In-person interview</option>
                  <option>Focus group</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-field full">
                <label>Answers (JSON) *</label>
                <textarea
                  rows={5}
                  required
                  value={draft.answers}
                  onChange={(e) =>
                    setDraft({ ...draft, answers: e.target.value })
                  }
                  className="code-input"
                />
                <small>
                  Example: {'{"age_group":"25-34","satisfaction":5}'}
                </small>
              </div>
              <div className="form-field full">
                <label>Notes</label>
                <textarea
                  rows={2}
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft({ ...draft, notes: e.target.value })
                  }
                  placeholder="Optional field notes…"
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
              <button
                className="btn btn-primary"
                disabled={busy || !projects.length}
              >
                {busy ? "Saving…" : editing ? "Save changes" : "Save response"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function safeJson(v: string) {
  try {
    return JSON.parse(v);
  } catch {
    return {};
  }
}
