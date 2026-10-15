import { useEffect, useState } from "react";
import {
  Download,
  File,
  FileText,
  FolderOpen,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { api, apiBase } from "../services/api";
import type { Project } from "../types";
import PageTitle from "../components/layout/PageTitle";
import EmptyState from "../components/ui/EmptyState";
import { dateLabel } from "../utils/format";
export default function ProjectFiles() {
  const [items, setItems] = useState<any[]>([]),
    [projects, setProjects] = useState<Project[]>([]),
    [projectId, setProjectId] = useState("all"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const [f, p] = await Promise.all([
        api<any[]>("/files"),
        api<Project[]>("/projects"),
      ]);
      setItems(f);
      setProjects(p);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const project = (
      e.target.form?.elements.namedItem("project_id") as HTMLSelectElement
    )?.value;
    if (!project) {
      setError("Select a project before uploading.");
      e.target.value = "";
      return;
    }
    const fd = new FormData();
    fd.append("file", f);
    fd.append("project_id", project);
    setBusy(true);
    try {
      await api("/files", { method: "POST", body: fd });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }
  async function remove(id: number) {
    if (!confirm("Delete this file record?")) return;
    try {
      await api(`/files/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }
  const filtered = items.filter(
    (f) => projectId === "all" || String(f.project_id) === projectId,
  );
  return (
    <>
      <PageTitle
        title="Project Files & Data"
        description="Project-wise briefs, source sheets, working files and final deliverables."
        actions={
          <span className="privacy-note">
            <FolderOpen size={15} /> Access-controlled files
          </span>
        }
      />
      {error && <div className="error-banner">{error}</div>}
      <section className="surface">
        <div className="file-toolbar">
          <div>
            <h2>Project document library</h2>
            <p>Files remain linked to their project and uploader.</p>
          </div>
          <div className="file-controls">
            <select
              name="project_filter"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <form className="upload-form">
              <select name="project_id" defaultValue="">
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <label className="button primary upload-button">
                {busy ? (
                  "Uploading…"
                ) : (
                  <>
                    <UploadCloud size={15} /> Upload file
                  </>
                )}
                <input
                  hidden
                  type="file"
                  disabled={busy}
                  onChange={upload}
                  accept=".csv,.tsv,.xlsx,.xls,.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.zip"
                />
              </label>
            </form>
          </div>
        </div>
        <div className="file-grid">
          {filtered.map((f) => (
            <article className="file-card" key={f.id}>
              <div className="file-type">
                <FileText size={22} />
              </div>
              <div className="file-name">
                <b>{f.original_name}</b>
                <small>
                  {f.project_name ||
                    projects.find((p) => p.id === f.project_id)?.name ||
                    "Project file"}
                </small>
                <small>
                  {f.size_bytes
                    ? `${(f.size_bytes / 1024 / 1024).toFixed(2)} MB`
                    : "File"}{" "}
                  · {dateLabel(f.created_at)}
                </small>
              </div>
              <div className="file-actions">
                <a
                  className="icon-btn"
                  href={`${apiBase()}/files/${f.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  title="Download"
                >
                  <Download size={16} />
                </a>
                <button
                  className="icon-btn"
                  onClick={() => remove(f.id)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
          {!filtered.length && (
            <EmptyState
              title="No project files yet"
              description="Upload a project brief, source dataset or deliverable to start the library."
            />
          )}
        </div>
      </section>
    </>
  );
}
