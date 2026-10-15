
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  CalendarDays,
  Pencil,
  Trash2,
  Users,
  X,
  AlertTriangle,
} from "lucide-react";
import { api, body } from "../services/api";
import type { Project, User } from "../types";
import PageTitle from "../components/layout/PageTitle";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import Field from "../components/forms/Field";
import DataTable from "../components/tables/DataTable";
import { dateLabel } from "../utils/format";

type ProjectForm = {
  name: string;
  client: string;
  description: string;
  sample_target: string;
  start_date: string;
  due_date: string;
  leader_id: string;
  eligible_team: string[];
  status: string;
};

const emptyForm: ProjectForm = {
  name: "",
  client: "",
  description: "",
  sample_target: "",
  start_date: "",
  due_date: "",
  leader_id: "",
  eligible_team: [],
  status: "planning",
};

const statuses = [
  { value: "planning", label: "Planning" },
  { value: "ongoing", label: "Ongoing" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
];

export default function Projects({ user }: { user: any }) {
  const isAdmin = user?.role === "admin";

  const [items, setItems] = useState<Project[]>([]);
  const [leaders, setLeaders] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);

  const [deleting, setDeleting] = useState<Project | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const load = useCallback(async () => {
    try {
      const projects = await api<Project[]>("/projects");
      setItems(projects);

      if (isAdmin) {
        const [ls, ms] = await Promise.all([
          api<User[]>("/users?role=leader"),
          api<User[]>("/users?role=team"),
        ]);
        setLeaders([...ls, ...ms]);
      }

      setError("");
    } catch (e: any) {
      setError(e.message || "Unable to load projects.");
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setShow(true);
    setError("");
  }

  function openEdit(project: Project) {
    setEditing(project);

    setForm({
      name: project.name || "",
      client: project.client || "",
      description: project.description || "",
      sample_target: String(project.sample_target ?? 0),
      start_date: project.start_date?.slice(0, 10) || "",
      due_date: project.due_date?.slice(0, 10) || "",
      leader_id:
        typeof project.leader_id === "string"
          ? project.leader_id
          : (project as any).leader_id?.id ||
            (project as any).leader_id?._id ||
            "",
      eligible_team: ((project as any).eligible_team || []).map(
        (member: any) =>
          typeof member === "string" ? member : member.id || member._id,
      ),
      status: project.status || "planning",
    });

    setShow(true);
    setError("");
  }

  async function saveProject(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const payload = {
        ...form,
        sample_target: Number(form.sample_target || 0),
        leader_id: form.leader_id || null,
        eligible_team: form.eligible_team,
      };

      if (editing) {
        await api(`/projects/${editing.id}`, {
          method: "PATCH",
          body: body(payload),
        });
      } else {
        await api("/projects", {
          method: "POST",
          body: body(payload),
        });
      }

      setShow(false);
      setEditing(null);
      setForm({ ...emptyForm });
      await load();
    } catch (e: any) {
      setError(e.message || "Unable to save project.");
    } finally {
      setBusy(false);
    }
  }

  function beginDelete(project: Project) {
    setDeleting(project);
    setDeleteStep(1);
    setDeleteConfirmation("");
    setError("");
  }

  async function confirmDelete() {
    if (!deleting || deleteConfirmation.trim() !== deleting.name) return;

    setBusy(true);
    setError("");

    try {
      await api(`/projects/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      setDeleteStep(1);
      setDeleteConfirmation("");
      await load();
    } catch (e: any) {
      setError(
        e.message ||
          "Delete failed. Confirm that the backend supports project deletion.",
      );
    } finally {
      setBusy(false);
    }
  }

  const filtered = items.filter(
    (project) =>
      `${project.name} ${project.client || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "all" || project.status === status),
  );

  return (
    <>
      <PageTitle
        title="Projects"
        description="Manage research engagements, ownership, sample targets and timelines."
        actions={
          user.role !== "team" && (
            <button className="button primary" onClick={openCreate}>
              <Plus size={18} /> New project
            </button>
          )
        }
      />

      {error && <div className="error-banner">{error}</div>}

      <section className="surface projects-surface">
        <div className="table-toolbar projects-toolbar">
          <div className="search-box">
            <Search size={18} />
            <input
              aria-label="Search projects"
              placeholder="Search projects or clients…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            aria-label="Filter projects by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
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
            ...(isAdmin ? ["Actions"] : []),
          ]}
          empty={!filtered.length}
          emptyTitle="No matching projects"
          emptyDescription="Try another search or create a project."
        >
          {filtered.map((project) => {
            const target = Number(project.sample_target || 0);
            const completed = Number(project.sample_completed || 0);
            const progress =
              target > 0
                ? Math.min(100, Math.round((completed / target) * 100))
                : 0;

            return (
              <tr key={project.id}>
                <td>
                  <b className="project-name">{project.name}</b>
                  <small className="cell-sub">
                    {project.client || "Internal research"}
                  </small>
                </td>

                <td>
                  <span className="project-leader">
                    <Users size={15} />
                    {project.leader_name || "Unassigned"}
                  </span>
                </td>

                <td>
                  <strong>{completed.toLocaleString("en-IN")}</strong>
                  <span className="target-total">
                    {" "}
                    / {target.toLocaleString("en-IN")}
                  </span>
                </td>

                <td>
                  <span className="date-cell">
                    <CalendarDays size={15} />
                    {dateLabel(project.due_date)}
                  </span>
                </td>

                <td className="project-progress-cell">
                  <div
                    className="progress-track project-progress-track"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${project.name} progress`}
                  >
                    <i
                      className={
                        progress === 100 ? "progress-complete" : ""
                      }
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <small className="progress-label">
                    {progress}% · {completed} of {target}
                  </small>
                </td>

                <td>
                  <StatusBadge
                    status={
                      target > 0 && completed >= target
                        ? "completed"
                        : project.status
                    }
                  />
                </td>

                {isAdmin && (
                  <td>
                    <div className="project-actions">
                      <button
                        type="button"
                        className="button secondary project-action-button"
                        onClick={() => openEdit(project)}
                        title="Edit project"
                        aria-label={`Edit ${project.name}`}
                      >
                        <Pencil size={16} />
                        Edit
                      </button>

                      <button
                        type="button"
                        className="button danger project-action-button"
                        onClick={() => beginDelete(project)}
                        title="Delete project"
                        aria-label={`Delete ${project.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </DataTable>
      </section>

      {show && (
        <Modal
          title={editing ? "Edit project" : "Create project"}
          eyebrow={editing ? "PROJECT SETTINGS" : "PROJECT SETUP"}
          onClose={() => {
            if (!busy) {
              setShow(false);
              setEditing(null);
            }
          }}
          onSubmit={saveProject}
          submitLabel={editing ? "Save changes" : "Create project"}
          busy={busy}
        >
          <div className="form-grid projects-form">
            <Field label="Project name *">
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </Field>

            <Field label="Client / organisation">
              <input
                value={form.client}
                onChange={(e) =>
                  setForm({ ...form, client: e.target.value })
                }
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
                onChange={(e) =>
                  setForm({ ...form, due_date: e.target.value })
                }
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

            <Field label="Project status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value })
                }
              >
                {statuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Assign project leader">
              <select
                value={form.leader_id}
                onChange={(e) =>
                  setForm({ ...form, leader_id: e.target.value })
                }
              >
                <option value="">Unassigned</option>
                {leaders
                  .filter((member) => member.role === "leader")
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} — {member.email}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Eligible team members">
              <select
                multiple
                size={4}
                value={form.eligible_team}
                onChange={(e) =>
                  setForm({
                    ...form,
                    eligible_team: Array.from(
                      e.target.selectedOptions,
                    ).map((option) => option.value),
                  })
                }
              >
                {leaders
                  .filter((member) => member.role === "team")
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} — {member.email}
                    </option>
                  ))}
              </select>
              <small className="field-hint">
                Hold Ctrl (Windows) to select multiple members.
              </small>
            </Field>

            <Field label="Description">
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
          </div>
        </Modal>
      )}

      {deleting && (
        <div className="project-confirm-backdrop">
          <section
            className="project-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
          >
            <div className="project-confirm-icon">
              {deleteStep === 1 ? (
                <AlertTriangle size={25} />
              ) : (
                <Trash2 size={25} />
              )}
            </div>

            <button
              type="button"
              className="project-confirm-close"
              onClick={() => setDeleting(null)}
              aria-label="Cancel deletion"
              disabled={busy}
            >
              <X size={19} />
            </button>

            <p className="project-confirm-eyebrow">
              DELETE PROJECT · STEP {deleteStep} OF 2
            </p>

            <h2 id="delete-project-title">
              {deleteStep === 1
                ? "Are you sure?"
                : "Confirm permanent deletion"}
            </h2>

            <p className="project-confirm-description">
              {deleteStep === 1
                ? `You selected "${deleting.name}". Project data may be affected. Continue only if you are certain.`
                : "To confirm, type the exact project name below. This action cannot be undone."}
            </p>

            {deleteStep === 1 ? (
              <div className="project-confirm-actions">
                <button
                  className="button secondary"
                  onClick={() => setDeleting(null)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  className="button danger"
                  onClick={() => setDeleteStep(2)}
                  disabled={busy}
                >
                  Continue
                </button>
              </div>
            ) : (
              <>
                <label className="project-confirm-label">
                  Type <strong>{deleting.name}</strong> to confirm
                  <input
                    autoFocus
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Enter project name"
                  />
                </label>

                <div className="project-confirm-actions">
                  <button
                    className="button secondary"
                    onClick={() => {
                      setDeleteStep(1);
                      setDeleteConfirmation("");
                    }}
                    disabled={busy}
                  >
                    Back
                  </button>

                  <button
                    className="button danger"
                    onClick={confirmDelete}
                    disabled={
                      busy || deleteConfirmation.trim() !== deleting.name
                    }
                  >
                    <Trash2 size={16} />
                    {busy ? "Deleting…" : "Delete permanently"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
