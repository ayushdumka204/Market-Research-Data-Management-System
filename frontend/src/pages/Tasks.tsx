import { useEffect, useState } from "react";
import { Check, ClipboardCheck, Plus, RefreshCw, Search } from "lucide-react";
import { api, body } from "../services/api";
import type { Project, Task, User } from "../types";
import PageTitle from "../components/layout/PageTitle";
import StatusBadge from "../components/ui/StatusBadge";
import Modal from "../components/ui/Modal";
import Field from "../components/forms/Field";
import DataTable from "../components/tables/DataTable";
import { dateLabel } from "../utils/format";
export default function Tasks({ user }: { user: any }) {
  const [tasks, setTasks] = useState<Task[]>([]),
    [projects, setProjects] = useState<Project[]>([]),
    [members, setMembers] = useState<User[]>([]),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [error, setError] = useState(""),
    [show, setShow] = useState(false),
    [review, setReview] = useState<Task | null>(null),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState<any>({
      project_id: "",
      assigned_to: "",
      title: "",
      description: "",
      due_date: "",
      work_date: new Date().toISOString().slice(0, 10),
    }),
    [update, setUpdate] = useState<any>({
      completed_count: "",
      update_note: "",
    }),
    [feedback, setFeedback] = useState("");
  async function load() {
    try {
      const [t, p] = await Promise.all([
        api<Task[]>("/tasks"),
        api<Project[]>("/projects"),
      ]);
      setTasks(t);
      setProjects(p);
      if (user.role !== "team")
        setMembers(await api<User[]>("/users?role=team"));
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
      await api("/tasks", {
        method: "POST",
        body: body({
          ...form,
          project_id: form.project_id,
          assigned_to: form.assigned_to,
        }),
      });
      setShow(false);
      setForm({
        project_id: "",
        assigned_to: "",
        title: "",
        description: "",
        due_date: "",
        work_date: new Date().toISOString().slice(0, 10),
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submitUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!review) return;
    setBusy(true);
    try {
      await api(`/tasks/${review.id}/updates`, {
        method: "POST",
        body: body({
          ...update,
          completed_count: Number(update.completed_count || 0),
        }),
      });
      setReview(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function decide(id: number, decision: "approve" | "changes") {
    setBusy(true);
    try {
      await api(`/tasks/${id}/review`, {
        method: "POST",
        body: body({ decision, feedback }),
      });
      setReview(null);
      setFeedback("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = tasks.filter(
    (t) =>
      (t.title + " " + (t.project_name || "") + " " + (t.assigned_name || ""))
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || t.status === filter),
  );
  return (
    <>
      <PageTitle
        title="Tasks & Daily Updates"
        description="Assign work, record daily progress and review submitted updates."
        actions={
          user.role !== "team" && (
            <button className="button primary" onClick={() => setShow(true)}>
              <Plus size={16} /> Assign task
            </button>
          )
        }
      />
      {error && <div className="error-banner">{error}</div>}
      <div className="task-filter-cards">
        {["todo", "in_progress", "submitted", "approved"].map((s) => (
          <button
            className={filter === s ? "filter-card chosen" : "filter-card"}
            onClick={() => setFilter(filter === s ? "all" : s)}
            key={s}
          >
            <span>{s.replaceAll("_", " ")}</span>
            <b>{tasks.filter((t) => t.status === s).length}</b>
          </button>
        ))}
      </div>
      <section className="surface">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Search tasks, projects or assignees…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {[
              "todo",
              "in_progress",
              "submitted",
              "in_review",
              "approved",
              "changes_requested",
            ].map((s) => (
              <option value={s} key={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <button className="button secondary" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        <DataTable
          headers={[
            "Task",
            "Project",
            "Assigned to",
            "Due date",
            "Completed",
            "Status",
            "Action",
          ]}
          empty={!filtered.length}
          emptyTitle="No tasks found"
          emptyDescription="Assigned tasks and daily submissions will appear here."
        >
          {filtered.map((t) => (
            <tr key={t.id}>
              <td>
                <b>{t.title}</b>
                <small className="cell-sub">{t.description || "—"}</small>
              </td>
              <td>{t.project_name || "—"}</td>
              <td>{t.assigned_name || "—"}</td>
              <td>{dateLabel(t.due_date)}</td>
              <td>{t.completed_count}</td>
              <td>
                <StatusBadge status={t.status} />
              </td>
              <td>
                {user.role === "team" && t.status !== "approved" ? (
                  <button
                    className="button secondary small"
                    onClick={() => {
                      setReview(t);
                      setUpdate({
                        completed_count: String(t.completed_count || 0),
                        update_note: "",
                      });
                    }}
                  >
                    Daily update
                  </button>
                ) : user.role !== "team" &&
                  ["submitted", "in_review"].includes(t.status) ? (
                  <button
                    className="button secondary small"
                    onClick={() => {
                      setReview(t);
                      setFeedback("");
                    }}
                  >
                    <ClipboardCheck size={14} /> Review
                  </button>
                ) : (
                  <span>—</span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      </section>
      {show && (
        <Modal
          title="Assign task"
          eyebrow="TASK MANAGEMENT"
          onClose={() => setShow(false)}
          onSubmit={create}
          submitLabel="Assign task"
          busy={busy}
        >
          <div className="form-grid">
            <Field label="Task title *">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Project *">
              <select
                required
                value={form.project_id}
                onChange={(e) =>
                  setForm({ ...form, project_id: e.target.value })
                }
              >
                <option value="">Choose project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assign to *">
              <select
                required
                value={form.assigned_to}
                onChange={(e) =>
                  setForm({ ...form, assigned_to: e.target.value })
                }
              >
                <option value="">Choose team member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Work date">
              <input
                type="date"
                value={form.work_date}
                onChange={(e) =>
                  setForm({ ...form, work_date: e.target.value })
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
            <Field label="Instructions">
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
      {review && user.role === "team" && (
        <Modal
          title="Submit daily update"
          eyebrow={review.title}
          onClose={() => setReview(null)}
          onSubmit={submitUpdate}
          submitLabel="Submit update"
          busy={busy}
        >
          <div className="form-grid">
            <Field label="Completed count">
              <input
                type="number"
                min="0"
                value={update.completed_count}
                onChange={(e) =>
                  setUpdate({ ...update, completed_count: e.target.value })
                }
              />
            </Field>
            <Field label="Daily work date">
              <input type="date" value={review.work_date || ""} readOnly />
            </Field>
            <Field label="Work completed / pending notes">
              <textarea
                rows={5}
                required
                value={update.update_note}
                onChange={(e) =>
                  setUpdate({ ...update, update_note: e.target.value })
                }
              />
            </Field>
          </div>
        </Modal>
      )}
      {review && user.role !== "team" && (
        <Modal
          title="Review submission"
          eyebrow={review.title}
          onClose={() => setReview(null)}
          onSubmit={(e) => {
            e.preventDefault();
            decide(review.id, "approve");
          }}
          submitLabel="Approve update"
          busy={busy}
        >
          <p className="subtitle">
            Submitted by {review.assigned_name || "team member"} · Completed
            count: {review.completed_count}
          </p>
          <div className="notice">
            {review.update_note || "No work notes provided."}
          </div>
          <Field label="Feedback / correction request">
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </Field>
          <button
            type="button"
            className="button secondary"
            onClick={() => decide(review.id, "changes")}
          >
            Request changes
          </button>
        </Modal>
      )}
    </>
  );
}
